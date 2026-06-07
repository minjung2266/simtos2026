import { ConsultationRecord, SurveyScore, defaultRecord, defaultSurvey } from '../types'

const PROJECT_ID   = import.meta.env.VITE_VERTEX_PROJECT_ID   as string
const CLIENT_EMAIL = import.meta.env.VITE_VERTEX_CLIENT_EMAIL  as string
const PRIVATE_KEY  = (import.meta.env.VITE_VERTEX_PRIVATE_KEY as string)?.replace(/\\n/g, '\n')
const REGION       = import.meta.env.VITE_VERTEX_REGION || 'us-central1'
const MODEL        = 'gemini-2.0-flash-001'

const VERTEX_URL = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`

// ── Access Token 캐시 ─────────────────────────────────────
let cachedToken: { token: string; exp: number } | null = null

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token

  // JWT 생성
  const header  = b64url({ alg: 'RS256', typ: 'JWT' })
  const payload = b64url({
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const toSign = `${header}.${payload}`

  // 서비스 계정 private key 임포트 (PKCS8)
  const pemBody = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  // 서명
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(toSign)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const jwt = `${toSign}.${sig}`

  // OAuth2 토큰 교환
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Vertex AI 인증 실패: ${JSON.stringify(err)}`)
  }
  const { access_token, expires_in } = await res.json()
  cachedToken = { token: access_token, exp: now + (expires_in ?? 3600) }
  return access_token
}

// ── Vertex AI 호출 ────────────────────────────────────────
async function callVertexAI(imageB64: string, mimeType: string, prompt: string) {
  if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('VITE_VERTEX_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY 환경변수를 설정해주세요')
  }

  const token = await getAccessToken()
  const res = await fetch(VERTEX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: imageB64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Vertex AI 오류: ${res.status} - ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Vertex AI 응답에서 JSON을 찾을 수 없습니다')
  return JSON.parse(match[0])
}

// ── OCR 프롬프트 ──────────────────────────────────────────
const FORM_OCR_PROMPT = `
이 이미지는 SIMTOS 2026 InterX 방문자 상담일지 양식입니다.
아래 JSON 형식으로 정확하게 추출해주세요.
빈칸이나 읽을 수 없는 항목은 빈 문자열("")로 처리하세요.
설문 응답은 체크된 박스의 위치를 1(전혀아니다)~5(매우그렇다)로 변환하세요.

반드시 JSON만 반환하고 다른 텍스트 없이:
{
  "visit_day_checked": "1일차-4/13(월)" | "2일차-4/14(화)" | "3일차-4/15(수)" | "4일차-4/16(목)" | "5일차-4/17(금)" | "",
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
    "q1": null,
    "q2": null,
    "q3": null,
    "q4": null,
    "q5": null,
    "q6": null,
    "q7": ""
  }
}
`

export async function ocrFormImage(
  imageB64: string,
  mimeType: string = 'image/jpeg'
): Promise<Partial<ConsultationRecord>> {
  const parsed = await callVertexAI(imageB64, mimeType, FORM_OCR_PROMPT)

  const toScore = (v: unknown): SurveyScore => {
    const n = Number(v)
    return n >= 1 && n <= 5 ? (n as SurveyScore) : null
  }

  return {
    ...defaultRecord(),
    visit_day: parsed.visit_day_checked || null,
    staff_dept:            parsed.staff_dept ?? '',
    staff_name:            parsed.staff_name ?? '',
    visit_content:         parsed.visit_content ?? '',
    visitor_company:       parsed.visitor_company ?? '',
    visitor_dept:          parsed.visitor_dept ?? '',
    visitor_name:          parsed.visitor_name ?? '',
    visitor_email:         parsed.visitor_email ?? '',
    visitor_phone:         parsed.visitor_phone ?? '',
    consultation_content:  parsed.consultation_content ?? '',
    survey: {
      ...defaultSurvey(),
      q1_brand_awareness:  toScore(parsed.survey?.q1),
      q2_decision_maker:   toScore(parsed.survey?.q2),
      q3_ai_experience:    toScore(parsed.survey?.q3),
      q4_gov_support_aware:toScore(parsed.survey?.q4),
      q5_followup_meeting: toScore(parsed.survey?.q5),
      q6_has_problem:      toScore(parsed.survey?.q6),
      q7_problem_desc:     parsed.survey?.q7 ?? '',
    },
    form_image_b64: imageB64,
  }
}
