# backend/main.py
import os, uuid, json, base64, sqlite3, re
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import google.auth.transport.requests
from google.oauth2 import service_account
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ── Vertex AI config ────────────────────────────────────────────────────────
PROJECT      = os.getenv("VERTEX_PROJECT_ID", "")
REGION       = os.getenv("VERTEX_REGION", "us-central1")
CLIENT_EMAIL = os.getenv("VERTEX_CLIENT_EMAIL", "")
PRIVATE_KEY  = os.getenv("VERTEX_PRIVATE_KEY", "").replace("\\n", "\n")
MODEL        = "gemini-2.0-flash-001"

VERTEX_URL = (
    f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}"
    f"/locations/{REGION}/publishers/google/models/{MODEL}:generateContent"
)

OCR_PROMPT = """이 이미지는 SIMTOS 2026 전시회 방문자 상담지입니다.
아래 JSON 형식으로 정보를 추출해주세요. 값을 알 수 없으면 null 또는 빈 문자열로 두세요.
JSON만 반환하고 다른 텍스트는 절대 포함하지 마세요.

[설문 점수 규칙 — 매우 중요]
- 설문은 1~5점 리커트 척도입니다 (1=전혀 아니다, 2=아니다, 3=보통, 4=그렇다, 5=매우 그렇다).
- 상담지에는 각 문항 옆에 1,2,3,4,5 숫자가 원/네모/체크 등으로 표시되어 있습니다. 체크된 숫자 하나를 그대로 반환하세요.
- q1~q6 값은 반드시 정수 1,2,3,4,5 중 하나, 또는 null 입니다. true/false, "예", "아니오" 같은 값은 절대 쓰지 마세요.
- 체크 표시를 식별할 수 없으면 null.
- 여러 개 체크되어 있으면 가장 진하게 표시된 하나만 선택.

[문항 매핑]
- q1_brand_awareness: "인터엑스라는 기업에 대해 잘 알고 있는 상태에서 방문하였다"
- q2_decision_maker: "소속된 기업의 제조 AI 관련 업무의 실무진 또는 의사결정 담당자이다"
- q3_ai_experience: "소속된 기업에서 AI 도입을 진행했던 경험이 있다"
- q4_gov_support_aware: "관련 정부지원사업에 대해 잘 알고 있다"
- q5_followup_meeting: "본 상담 이후 보다 자세한 상담을 위해 후속 미팅을 희망한다"
- q6_has_problem: "소속된 기업에서 제조 AX(AI전환)를 통해 가장 해결하고 싶은 문제가 있다"
- q7_problem_desc: Q6에 대한 서술형 답변 (문자열)

[출력 형식]
{
  "visit_day": "1일차-4/13(월)" | "2일차-4/14(화)" | "3일차-4/15(수)" | "4일차-4/16(목)" | "5일차-4/17(금)" | null,
  "staff_dept": "",
  "staff_name": "",
  "visit_content": "",
  "visitor_company": "",
  "visitor_dept": "",
  "visitor_name": "",
  "visitor_email": "",
  "visitor_phone": "",
  "consultation_content": "",
  "survey": {
    "q1_brand_awareness": null,
    "q2_decision_maker": null,
    "q3_ai_experience": null,
    "q4_gov_support_aware": null,
    "q5_followup_meeting": null,
    "q6_has_problem": null,
    "q7_problem_desc": ""
  }
}"""


def _normalize_score(v):
    """q1~q6 값을 정수 1~5 또는 None 으로 강제. boolean/문자열/범위 밖 값은 None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, int) and 1 <= v <= 5:
        return v
    if isinstance(v, float) and v.is_integer() and 1 <= int(v) <= 5:
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        if s.isdigit() and 1 <= int(s) <= 5:
            return int(s)
    return None

# ── SQLite storage ───────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "records.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                data TEXT NOT NULL
            )
        """)
        conn.commit()

# ── Auth helper ──────────────────────────────────────────────────────────────
_creds = None

def get_access_token() -> str:
    global _creds
    if not PROJECT or not CLIENT_EMAIL or not PRIVATE_KEY:
        raise RuntimeError("VERTEX_PROJECT_ID / VERTEX_CLIENT_EMAIL / VERTEX_PRIVATE_KEY 환경변수를 설정해주세요")
    if _creds is None:
        _creds = service_account.Credentials.from_service_account_info(
            {
                "type": "service_account",
                "project_id": PROJECT,
                "client_email": CLIENT_EMAIL,
                "private_key": PRIVATE_KEY,
                "token_uri": "https://oauth2.googleapis.com/token",
            },
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    request = google.auth.transport.requests.Request()
    _creds.refresh(request)
    return _creds.token

# ── Vertex AI call ───────────────────────────────────────────────────────────
def call_vertex(image_bytes: bytes, mime_type: str) -> str:
    token = get_access_token()
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": OCR_PROMPT},
                {"inlineData": {"mimeType": mime_type, "data": b64}},
            ],
        }],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 2048},
    }
    resp = httpx.post(
        VERTEX_URL,
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=60,
    )
    if not resp.is_success:
        raise RuntimeError(f"Vertex AI 오류 {resp.status_code}: {resp.text}")
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

def parse_ocr_text(text: str) -> dict:
    # strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    return json.loads(text)

# ── App ──────────────────────────────────────────────────────────────────────
DIST_DIR = Path(__file__).parent.parent / "dist"

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

_allowed = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [o.strip() for o in _allowed.split(",") if o.strip()]
    if _allowed
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/process")
async def process_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    mime = file.content_type or "image/jpeg"

    try:
        raw_text = call_vertex(image_bytes, mime)
        extracted = parse_ocr_text(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR 실패: {e}")

    # build record
    survey = extracted.get("survey", {})
    record = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "visit_day": extracted.get("visit_day"),
        "staff_dept": extracted.get("staff_dept", ""),
        "staff_name": extracted.get("staff_name", ""),
        "visit_content": extracted.get("visit_content", ""),
        "visitor_company": extracted.get("visitor_company", ""),
        "visitor_dept": extracted.get("visitor_dept", ""),
        "visitor_name": extracted.get("visitor_name", ""),
        "visitor_email": extracted.get("visitor_email", ""),
        "visitor_phone": extracted.get("visitor_phone", ""),
        "consultation_content": extracted.get("consultation_content", ""),
        "survey": {
            "q1_brand_awareness": _normalize_score(survey.get("q1_brand_awareness")),
            "q2_decision_maker": _normalize_score(survey.get("q2_decision_maker")),
            "q3_ai_experience": _normalize_score(survey.get("q3_ai_experience")),
            "q4_gov_support_aware": _normalize_score(survey.get("q4_gov_support_aware")),
            "q5_followup_meeting": _normalize_score(survey.get("q5_followup_meeting")),
            "q6_has_problem": _normalize_score(survey.get("q6_has_problem")),
            "q7_problem_desc": survey.get("q7_problem_desc", "") or "",
        },
    }

    with get_db() as conn:
        conn.execute(
            "INSERT INTO records (id, created_at, data) VALUES (?, ?, ?)",
            (record["id"], record["created_at"], json.dumps(record, ensure_ascii=False)),
        )
        conn.commit()

    return record


@app.get("/api/records")
def list_records():
    with get_db() as conn:
        rows = conn.execute("SELECT data FROM records ORDER BY created_at ASC").fetchall()
    return [json.loads(row["data"]) for row in rows]


@app.get("/api/records/{record_id}")
def get_record(record_id: str):
    with get_db() as conn:
        row = conn.execute("SELECT data FROM records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다")
    return json.loads(row["data"])


@app.put("/api/records/{record_id}")
def update_record(record_id: str, payload: dict = Body(...)):
    """사용자 편집 결과를 DB에 덮어쓰기. id, created_at은 기존 값 유지."""
    with get_db() as conn:
        row = conn.execute("SELECT data FROM records WHERE id = ?", (record_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다")

        existing = json.loads(row["data"])
        survey_in = payload.get("survey", {}) or {}

        merged = {
            "id": existing["id"],
            "created_at": existing["created_at"],
            "visit_day": payload.get("visit_day"),
            "staff_dept": payload.get("staff_dept", ""),
            "staff_name": payload.get("staff_name", ""),
            "visit_content": payload.get("visit_content", ""),
            "visitor_company": payload.get("visitor_company", ""),
            "visitor_dept": payload.get("visitor_dept", ""),
            "visitor_name": payload.get("visitor_name", ""),
            "visitor_email": payload.get("visitor_email", ""),
            "visitor_phone": payload.get("visitor_phone", ""),
            "consultation_content": payload.get("consultation_content", ""),
            "survey": {
                "q1_brand_awareness": _normalize_score(survey_in.get("q1_brand_awareness")),
                "q2_decision_maker": _normalize_score(survey_in.get("q2_decision_maker")),
                "q3_ai_experience": _normalize_score(survey_in.get("q3_ai_experience")),
                "q4_gov_support_aware": _normalize_score(survey_in.get("q4_gov_support_aware")),
                "q5_followup_meeting": _normalize_score(survey_in.get("q5_followup_meeting")),
                "q6_has_problem": _normalize_score(survey_in.get("q6_has_problem")),
                "q7_problem_desc": survey_in.get("q7_problem_desc", "") or "",
            },
        }

        conn.execute(
            "UPDATE records SET data = ? WHERE id = ?",
            (json.dumps(merged, ensure_ascii=False), record_id),
        )
        conn.commit()

    return merged


@app.delete("/api/records/{record_id}")
def delete_record(record_id: str):
    with get_db() as conn:
        result = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다")
    return {"ok": True}


# ── Static frontend (React build) ────────────────────────────────────────────
# 모든 /api/* 라우트보다 아래에 있어야 함 (catch-all이기 때문)
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        file_path = DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
