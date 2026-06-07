import { ConsultationRecord, VISIT_DAYS } from '../types'
import { exportToExcel } from '../services/excel'

interface Props {
  records: ConsultationRecord[]
  loading: boolean
  onNew: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

const DAY_SHORT: Record<string, string> = {
  '1일차-4/13(월)': '4/13',
  '2일차-4/14(화)': '4/14',
  '3일차-4/15(수)': '4/15',
  '4일차-4/16(목)': '4/16',
  '5일차-4/17(금)': '4/17',
}

export default function ListPage({ records, loading, onNew, onEdit, onDelete }: Props) {
  const byDay = VISIT_DAYS.map(day => ({
    day,
    items: records.filter(r => r.visit_day === day)
  }))
  const unassigned = records.filter(r => !r.visit_day)

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await onDelete(id)
  }

  const q5Scores = records
    .map(r => r.survey.q5_followup_meeting)
    .filter((v): v is Exclude<typeof v, null> => typeof v === 'number')
  const followupCount = q5Scores.filter(v => v >= 4).length
  const avgFollowup = q5Scores.length
    ? (q5Scores.reduce((s, v) => s + v, 0) / q5Scores.length).toFixed(1)
    : '-'

  return (
    <div className="list-page">
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-num">{loading ? '…' : records.length}</span>
          <span className="stat-label">총 상담</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{followupCount}</span>
          <span className="stat-label">후속 미팅 희망</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{avgFollowup}</span>
          <span className="stat-label">평균 후속미팅 점수</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {records.length ? (records.reduce((s, r) => s + (r.survey.q2_decision_maker ?? 0), 0) / records.length).toFixed(1) : '-'}
          </span>
          <span className="stat-label">평균 실무담당자 점수</span>
        </div>
      </div>

      <div className="list-actions">
        <button className="btn-primary" onClick={onNew}>📂 일괄 업로드</button>
        {records.length > 0 && (
          <button className="btn-outline" onClick={() => exportToExcel(records)}>⬇ 엑셀 내보내기</button>
        )}
      </div>

      {loading && (
        <div className="empty-state">
          <span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p>목록 불러오는 중…</p>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="empty-state">
          <span>📷</span>
          <p>상담지를 스캔하면 AI가 자동으로 내용을 추출합니다</p>
          <button className="btn-primary" onClick={onNew}>상담지 일괄 업로드하기</button>
        </div>
      )}

      {byDay.filter(g => g.items.length > 0).map(({ day, items }) => (
        <div key={day} className="day-group">
          <div className="day-group-header">
            <span className="day-badge">{DAY_SHORT[day]}</span>
            <span className="day-label">{day}</span>
            <span className="day-count">{items.length}건</span>
          </div>
          <div className="record-list">
            {items.map(r => (
              <RecordCard key={r.id} record={r} onEdit={() => onEdit(r.id)} onDelete={() => handleDelete(r.id)} />
            ))}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="day-group">
          <div className="day-group-header">
            <span className="day-badge day-badge-gray">-</span>
            <span className="day-label">날짜 미지정</span>
            <span className="day-count">{unassigned.length}건</span>
          </div>
          <div className="record-list">
            {unassigned.map(r => (
              <RecordCard key={r.id} record={r} onEdit={() => onEdit(r.id)} onDelete={() => handleDelete(r.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecordCard({ record: r, onEdit, onDelete }: {
  record: ConsultationRecord
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="record-card" onClick={onEdit}>
      <div className="record-card-main">
        <div className="record-company">{r.visitor_company || '(회사명 없음)'}</div>
        <div className="record-name">{r.visitor_name || '(이름 없음)'} · {r.visitor_dept || '-'}</div>
        {r.consultation_content && (
          <div className="record-preview">
            {r.consultation_content.slice(0, 80)}{r.consultation_content.length > 80 ? '…' : ''}
          </div>
        )}
      </div>
      <div className="record-card-meta">
        {typeof r.survey.q5_followup_meeting === 'number' && r.survey.q5_followup_meeting > 0 && (
          <span className={`badge ${r.survey.q5_followup_meeting >= 4 ? 'badge-orange' : 'badge-gray'}`}>
            후속미팅 {r.survey.q5_followup_meeting}점
          </span>
        )}
        <button className="btn-icon btn-delete" onClick={e => { e.stopPropagation(); onDelete() }}>✕</button>
      </div>
    </div>
  )
}
