import { useState } from 'react'
import { ConsultationRecord, SURVEY_QUESTIONS, SurveyScore } from '../types'
import { exportToExcel } from '../services/excel'
import ScoreSelector from '../components/ScoreSelector'

interface Props {
  records: ConsultationRecord[]
  onChange: (records: ConsultationRecord[]) => void
  onSaveAll: () => void
  onBack: () => void
}

const DAY_COLOR: Record<string, string> = {
  '1일차-4/13(월)': '#E8630A',
  '2일차-4/14(화)': '#2E75B6',
  '3일차-4/15(수)': '#16A34A',
  '4일차-4/16(목)': '#9B59B6',
  '5일차-4/17(금)': '#DC2626',
}


function TapEdit({ value, onChange, multiline }: {
  value: string; onChange: (v: string) => void; multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return multiline
      ? <textarea className="tap-input" value={value} autoFocus rows={3}
          onChange={e => onChange(e.target.value)} onBlur={() => setEditing(false)} />
      : <input className="tap-input" value={value} autoFocus
          onChange={e => onChange(e.target.value)} onBlur={() => setEditing(false)} />
  }
  return (
    <span className={`tap-val ${!value ? 'tap-val-empty' : ''}`} onClick={() => setEditing(true)}>
      {value || '—'}{value && <span className="tap-edit-hint">✎</span>}
    </span>
  )
}

function RecordDetail({ r, onChange }: { r: ConsultationRecord; onChange: (r: ConsultationRecord) => void }) {
  const set = <K extends keyof ConsultationRecord>(key: K, val: ConsultationRecord[K]) =>
    onChange({ ...r, [key]: val })
  const setSurvey = (key: string, val: string) =>
    onChange({ ...r, survey: { ...r.survey, [key]: val } })

  return (
    <div className="brec-detail">
      <div className="brec-detail-grid">
        <div className="brec-detail-section">
          <div className="brec-detail-title">방문자</div>
          <DetailRow label="회사"><TapEdit value={r.visitor_company} onChange={v => set('visitor_company', v)} /></DetailRow>
          <DetailRow label="부서"><TapEdit value={r.visitor_dept} onChange={v => set('visitor_dept', v)} /></DetailRow>
          <DetailRow label="성명"><TapEdit value={r.visitor_name} onChange={v => set('visitor_name', v)} /></DetailRow>
          <DetailRow label="이메일"><TapEdit value={r.visitor_email} onChange={v => set('visitor_email', v)} /></DetailRow>
          <DetailRow label="전화"><TapEdit value={r.visitor_phone} onChange={v => set('visitor_phone', v)} /></DetailRow>
        </div>
        <div className="brec-detail-section">
          <div className="brec-detail-title">작성자 (InterX)</div>
          <DetailRow label="부서"><TapEdit value={r.staff_dept} onChange={v => set('staff_dept', v)} /></DetailRow>
          <DetailRow label="성명"><TapEdit value={r.staff_name} onChange={v => set('staff_name', v)} /></DetailRow>
          <DetailRow label="컨텐츠"><TapEdit value={r.visit_content} onChange={v => set('visit_content', v)} /></DetailRow>
        </div>
      </div>

      <div className="brec-detail-section" style={{ marginTop: 10 }}>
        <div className="brec-detail-title">상담 내용</div>
        <div style={{ padding: '8px 0', fontSize: '0.88rem' }}>
          <TapEdit value={r.consultation_content} onChange={v => set('consultation_content', v)} multiline />
        </div>
      </div>

      <div className="brec-detail-section" style={{ marginTop: 10 }}>
        <div className="brec-detail-title">설문 응답</div>
        <div className="brec-survey-grid">
          {SURVEY_QUESTIONS.map(({ key, label }, i) => {
            const score = r.survey[key] as SurveyScore
            return (
              <div key={key} className="brec-survey-row">
                <span className="survey2-qnum">Q{i + 1}</span>
                <span className="brec-survey-label">{label}</span>
                <ScoreSelector
                  value={score}
                  onChange={v => onChange({ ...r, survey: { ...r.survey, [key]: v } })}
                />
              </div>
            )
          })}
        </div>
        {(r.survey.q6_has_problem ?? 0) >= 4 && (
          <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
            <span className="survey2-qnum">Q7</span>{' '}
            <TapEdit value={r.survey.q7_problem_desc} onChange={v => setSurvey('q7_problem_desc', v)} multiline />
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="extract-row">
      <span className="extract-row-label">{label}</span>
      <span className="extract-row-value">{children}</span>
    </div>
  )
}

export default function BatchResultPage({ records, onChange, onSaveAll, onBack }: Props) {
  const [expanded, setExpanded] = useState<string | null>(records[0]?.id ?? null)

  const updateRecord = (id: string, updated: ConsultationRecord) =>
    onChange(records.map(r => r.id === id ? updated : r))

  const removeRecord = (id: string) =>
    onChange(records.filter(r => r.id !== id))

  return (
    <div className="result2-page">
      <div className="result2-header">
        <button className="btn-ghost btn-sm" onClick={onBack}>← 재업로드</button>
        <div className="result2-header-mid">
          <span className="result2-ai-tag">AI 인식</span>
          <span className="result2-page-title">{records.length}건 추출 결과</span>
        </div>
        <button className="btn-primary btn-sm" onClick={onSaveAll}>전체 저장</button>
      </div>

      <p className="result2-hint">오인식된 항목을 탭하여 수정하세요 · 저장 후 목록에서 엑셀 내보내기</p>

      <div className="brec-list">
        {records.map((r, i) => {
          const isOpen = expanded === r.id
          const dayColor = DAY_COLOR[r.visit_day ?? ''] ?? '#94A3B8'
          return (
            <div key={r.id} className={`brec-card ${isOpen ? 'brec-card-open' : ''}`}>
              {/* 헤더 행 */}
              <div className="brec-row" onClick={() => setExpanded(isOpen ? null : r.id)}>
                <span className="brec-idx">{i + 1}</span>
                {r.visit_day && (
                  <span className="brec-day" style={{ color: dayColor, borderColor: dayColor }}>
                    {r.visit_day.slice(0, 3)}
                  </span>
                )}
                <div className="brec-summary">
                  <span className="brec-company">{r.visitor_company || '(회사명 없음)'}</span>
                  <span className="brec-name">{r.visitor_name || '(이름 없음)'}</span>
                </div>
                {typeof r.survey.q5_followup_meeting === 'number' && r.survey.q5_followup_meeting > 0 && (
                  <span className={`badge ${r.survey.q5_followup_meeting >= 4 ? 'badge-orange' : 'badge-gray'}`}>
                    후속 {r.survey.q5_followup_meeting}점
                  </span>
                )}
                <div className="brec-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon btn-delete" onClick={() => removeRecord(r.id)}>✕</button>
                </div>
                <span className="brec-toggle">{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* 상세 */}
              {isOpen && (
                <RecordDetail r={r} onChange={updated => updateRecord(r.id, updated)} />
              )}
            </div>
          )
        })}
      </div>

      <div className="batch-save-actions">
        <button className="btn-primary btn-full" onClick={onSaveAll}>
          전체 저장 ({records.length}건)
        </button>
        <button className="btn-outline" style={{ width: '100%' }}
          onClick={() => { exportToExcel(records); onSaveAll() }}>
          저장 + 엑셀 바로 내보내기
        </button>
      </div>
    </div>
  )
}
