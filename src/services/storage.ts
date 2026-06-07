import { ConsultationRecord, defaultRecord, defaultSurvey } from '../types'

const STORAGE_KEY = 'simtos2026_records'

export function getRecords(): ConsultationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRecord(record: ConsultationRecord): void {
  const records = getRecords()
  const idx = records.findIndex(r => r.id === record.id)
  if (idx >= 0) {
    records[idx] = record
  } else {
    records.push(record)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function createEmptyRecord(): ConsultationRecord {
  return {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    ...defaultRecord(),
    survey: defaultSurvey(),
  }
}

// FastAPI 연동 시 여기서 교체
export async function syncToBackend(_record: ConsultationRecord): Promise<void> {
  // TODO: await fetch('/api/records', { method: 'POST', body: JSON.stringify(record) })
  return Promise.resolve()
}
