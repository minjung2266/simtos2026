import { ConsultationRecord } from '../types'

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || ''

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`서버 오류 ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

/** 상담지 이미지 → OCR + 저장 (백엔드가 Vertex AI 처리) */
export async function processFormImage(file: File): Promise<ConsultationRecord> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${BASE}/api/process`, { method: 'POST', body })
  return handleRes<ConsultationRecord>(res)
}

/** 전체 목록 */
export async function fetchRecords(): Promise<ConsultationRecord[]> {
  const res = await fetch(`${BASE}/api/records`)
  return handleRes<ConsultationRecord[]>(res)
}

/** 단건 삭제 */
export async function deleteRecordApi(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/records/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`삭제 실패 ${res.status}`)
}

/** 사용자 편집 결과 저장 */
export async function updateRecord(record: ConsultationRecord): Promise<ConsultationRecord> {
  const res = await fetch(`${BASE}/api/records/${record.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  return handleRes<ConsultationRecord>(res)
}
