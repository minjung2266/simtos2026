# SIMTOS 2026 방문자 상담일지 앱

InterX 전시 부스용 방문자 상담일지 OCR & 관리 앱.
종이 상담일지를 촬영하면 Google Vertex AI (Gemini)가 내용을 추출해 구조화된 레코드로 저장하고, 엑셀로 내보낼 수 있습니다.

---

## 기술 스택

### Frontend (`src/`)
| 항목 | 사용 기술 |
|------|-----------|
| 프레임워크 | React 18.3 + TypeScript 5.5 |
| 번들러/Dev 서버 | Vite 5.4 |
| 아이콘 | lucide-react |
| 엑셀 내보내기 | xlsx, xlsx-js-style |
| 상태관리 | React hooks (외부 라이브러리 없음) |

### Backend (`backend/`)
| 항목 | 사용 기술 |
|------|-----------|
| 웹 프레임워크 | FastAPI 0.111+ |
| ASGI 서버 | Uvicorn 0.29+ |
| DB | SQLite (`backend/records.db`) |
| HTTP 클라이언트 | httpx |
| 인증 | google-auth (서비스 계정) |
| OCR 모델 | Vertex AI `gemini-2.0-flash-001` |

---

## 아키텍처

### 전체 구조

```
┌─────────────────┐        HTTP        ┌──────────────────┐       REST       ┌──────────────┐
│  React SPA      │ ─────────────────> │  FastAPI (8001)  │ ───────────────> │  Vertex AI   │
│  (Vite, 5173)   │ <───────────────── │                  │ <─────────────── │  (Gemini)    │
└─────────────────┘      JSON/파일     │                  │      JSON OCR    └──────────────┘
                                       │  ┌────────────┐  │
                                       │  │ SQLite DB  │  │
                                       │  └────────────┘  │
                                       └──────────────────┘
```

- **개발 모드**: Vite dev 서버가 `5173` 포트에서 실행되고, `/api/*` 요청은 `localhost:8001` 백엔드로 프록시됩니다 ([vite.config.ts](vite.config.ts)).
- **프로덕션**: `npm run build` 산출물(`dist/`)을 FastAPI가 정적 파일로 서빙합니다 — 즉 백엔드 한 프로세스만 실행하면 프론트/API 모두 제공됩니다 ([backend/main.py:237-242](backend/main.py#L237-L242)).

### 데이터 흐름 (단일 이미지 처리)

```
사용자 이미지 선택
      ↓
BatchCapturePage: 파일 큐 구성
      ↓
api.ts → POST /api/process (multipart/form-data)
      ↓
backend.call_vertex(): 서비스 계정으로 JWT 생성 → Vertex AI 호출
      ↓
parse_ocr_text(): 모델 응답에서 JSON 추출
      ↓
SQLite records 테이블 INSERT
      ↓
레코드 JSON 응답 → 프론트에서 BatchResultPage로 편집
```

### DB 스키마 ([backend/main.py](backend/main.py))

```sql
CREATE TABLE records (
  id         TEXT PRIMARY KEY,    -- UUID
  created_at TEXT NOT NULL,       -- ISO8601
  data       TEXT NOT NULL        -- JSON 직렬화된 레코드 전체
)
```

레코드 JSON 구조: 방문일차, 담당자 정보, 방문자 정보, 상담 내용, 7개 설문(q1~q7) 필드.

### API 엔드포인트 ([backend/main.py](backend/main.py))

| Method | 경로 | 역할 |
|--------|------|------|
| GET | `/api/health` | 헬스 체크 |
| POST | `/api/process` | 이미지 OCR 후 레코드 생성 |
| GET | `/api/records` | 전체 레코드 조회 |
| GET | `/api/records/{id}` | 단건 조회 |
| DELETE | `/api/records/{id}` | 레코드 삭제 |
| GET | `/{path:*}` | SPA 정적 파일 서빙 (catch-all) |

---

## 디렉토리 구조

```
simtos-app/
├── src/                          # 프론트엔드
│   ├── main.tsx                  # React 진입점
│   ├── App.tsx                   # 페이지 라우팅 (list | batch | batch-result | detail)
│   ├── pages/
│   │   ├── ListPage.tsx          # 저장된 상담 기록 목록
│   │   ├── BatchCapturePage.tsx  # 여러 이미지 업로드 & 일괄 OCR
│   │   ├── BatchResultPage.tsx   # 일괄 편집 + 엑셀 내보내기
│   │   ├── ResultPage.tsx        # 단건 상세 편집
│   │   └── CapturePage.tsx       # (구) 단일 이미지 캡처
│   ├── components/
│   │   ├── ImageCapture.tsx      # 이미지 입력/미리보기
│   │   └── ScoreSelector.tsx     # 설문 점수(1~5) 선택 UI
│   ├── services/
│   │   ├── api.ts                # 백엔드 REST 호출
│   │   ├── gemini.ts             # (보조) 클라이언트 측 Vertex AI 호출
│   │   ├── storage.ts            # (레거시) localStorage helper
│   │   └── excel.ts              # xlsx 내보내기
│   └── types/index.ts            # ConsultationRecord 등 타입 정의
├── backend/                      # 백엔드
│   ├── main.py                   # FastAPI 앱 + Vertex AI + DB
│   ├── requirements.txt
│   ├── .env                      # (gitignore) 서비스 계정 키 등
│   ├── .env.example
│   └── records.db                # SQLite (런타임 생성)
├── dist/                         # 빌드 산출물 (gitignore)
├── index.html                    # Vite 진입 HTML
├── vite.config.ts                # /api → 8001 프록시 설정
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## 시작하기

### 1. 요구사항
- Node.js 18+
- Python 3.10+
- Google Cloud 서비스 계정 (Vertex AI API 활성화)

### 2. 프론트엔드

```bash
npm install
npm run dev      # http://localhost:5173
```

### 3. 백엔드

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

cp .env.example .env
# .env 에 VERTEX_PROJECT_ID, VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY 입력

uvicorn main:app --reload --port 8001
```

### 4. 환경변수

**`backend/.env`** (필수)
```
VERTEX_PROJECT_ID="your-project-id"
VERTEX_REGION="us-central1"
VERTEX_CLIENT_EMAIL="your-sa@your-project.iam.gserviceaccount.com"
VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ALLOWED_ORIGINS="https://your-domain.com"   # 프로덕션에서 CORS 허용 도메인
```

---

## 빌드 & 배포

### 단일 서버 배포 (권장)

```bash
npm install
npm run build                   # dist/ 생성

cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

FastAPI가 `dist/`를 자동으로 서빙하므로 단일 포트(8001)에서 프론트/백엔드 모두 접근 가능합니다.

### 배포 전 체크리스트
- [ ] `backend/.env`의 `ALLOWED_ORIGINS`에 운영 도메인 지정
- [ ] HTTPS 적용 (리버스 프록시: nginx/Caddy 권장)
- [ ] `backend/records.db`의 주기적 백업
- [ ] 서비스 계정 키가 `.gitignore`에 포함되어 있는지 재확인

---

## OCR 응답 예시

Vertex AI(Gemini)가 반환하는 JSON:

```json
{
  "visit_day": "1일차-4/13(월)",
  "visitor_company": "삼성전자",
  "visitor_name": "김철수",
  "visitor_email": "example@samsung.com",
  "consultation_content": "용접 불량 자동감지 문의",
  "survey": {
    "q1_brand_awareness": 3,
    "q2_decision_maker": 5,
    "q3_ai_experience": 2,
    "q4_gov_support_aware": 1,
    "q5_followup_meeting": 5,
    "q6_has_problem": 4,
    "q7_problem_desc": "..."
  }
}
```
