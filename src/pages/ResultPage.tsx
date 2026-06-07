import { useState } from 'react'
import { ConsultationRecord, SURVEY_QUESTIONS, SurveyScore } from '../types'
import ScoreSelector from '../components/ScoreSelector'

interface Props {
  record: ConsultationRecord
  onChange: (r: ConsultationRecord) => void
  onSave: () => void
  onBack: () => void
}

const DAY_COLOR: Record<string, string> = {
  '1일차-4/13(월)': '#E8630A',
  '2일차-4/14(화)': '#2E75B6',
  '3일차-4/15(수)': '#1DB97A',
  '4일차-4/16(목)': '#9B59B6',
  '5일차-4/17(금)': '#E84040',
}


function TapEdit({ value, onChange, multiline }: {
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return multiline ? (
      <textarea
        className="tap-input"
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        rows={3}
      />
    ) : (
      <input
        className="tap-input"
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
      />
    )
  }

  return (
    <span className={`tap-val ${!value ? 'tap-val-empty' : ''}`} onClick={() => setEditing(true)}>
      {value || '—'}
      {value && <span className="tap-edit-hint">✎</span>}
    </span>
  )
}

export default function ResultPage({ record: r, onChange, onSave, onBack }: Props) {
  const set = <K extends keyof ConsultationRecord>(key: K, val: ConsultationRecord[K]) =>
    onChange({ ...r, [key]: val })

  const setSurvey = (key: string, val: SurveyScore | string) =>
    onChange({ ...r, survey: { ...r.survey, [key]: val } })

  return (
    <div className="result2-page">
      {/* 헤더 */}
      <div className="result2-header">
        <button className="btn-ghost btn-sm" onClick={onBack}>← 재스캔</button>
        <div className="result2-header-mid">
          <span className="result2-ai-tag">AI 인식</span>
          <span className="result2-page-title">추출 결과</span>
        </div>
        <button className="btn-primary btn-sm" onClick={onSave}>저장</button>
      </div>

      <p className="result2-hint">오인식된 항목만 탭하여 수정하세요</p>

      {/* 방문일자 뱃지 */}
      {r.visit_day && (
        <div className="result2-day" style={{ borderColor: DAY_COLOR[r.visit_day] ?? '#E8630A', color: DAY_COLOR[r.visit_day] ?? '#E8630A' }}>
          {r.visit_day}
        </div>
      )}

      {/* 방문자 */}
      <ExtractCard title="방문자">
        <Row label="회사명"><TapEdit value={r.visitor_company} onChange={v => set('visitor_company', v)} /></Row>
        <Row label="부서명"><TapEdit value={r.visitor_dept} onChange={v => set('visitor_dept', v)} /></Row>
        <Row label="성명"><TapEdit value={r.visitor_name} onChange={v => set('visitor_name', v)} /></Row>
        <Row label="이메일"><TapEdit value={r.visitor_email} onChange={v => set('visitor_email', v)} /></Row>
        <Row label="전화번호"><TapEdit value={r.visitor_phone} onChange={v => set('visitor_phone', v)} /></Row>
      </ExtractCard>

      {/* 작성자 */}
      <ExtractCard title="작성자 (InterX)">
        <Row label="부서명"><TapEdit value={r.staff_dept} onChange={v => set('staff_dept', v)} /></Row>
        <Row label="성명"><TapEdit value={r.staff_name} onChange={v => set('staff_name', v)} /></Row>
        <Row label="방문컨텐츠"><TapEdit value={r.visit_content} onChange={v => set('visit_content', v)} /></Row>
      </ExtractCard>

      {/* 상담 내용 */}
      <ExtractCard title="상담 내용">
        <div className="result2-body">
          <TapEdit value={r.consultation_content} onChange={v => set('consultation_content', v)} multiline />
        </div>
      </ExtractCard>

      {/* 설문 */}
      <ExtractCard title="설문 응답">
        {SURVEY_QUESTIONS.map(({ key, label }, i) => {
          const score = r.survey[key] as SurveyScore
          return (
            <div key={key} className="survey2-row">
              <div className="survey2-q">
                <span className="survey2-qnum">Q{i + 1}</span>
                <span className="survey2-qlabel">{label}</span>
              </div>
              <ScoreSelector
                value={score}
                onChange={v => setSurvey(key, v)}
              />
            </div>
          )
        })}

        {(r.survey.q6_has_problem ?? 0) >= 4 && (
          <div className="survey2-row survey2-q7">
            <div className="survey2-q">
              <span className="survey2-qnum">Q7</span>
              <span className="survey2-qlabel">해결하고 싶은 문제</span>
            </div>
            <div className="survey2-q7-body">
              <TapEdit value={r.survey.q7_problem_desc} onChange={v => setSurvey('q7_problem_desc', v)} multiline />
            </div>
          </div>
        )}
      </ExtractCard>

      <button className="btn-primary btn-full" onClick={onSave}>저장하기</button>
    </div>
  )
}

function ExtractCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="extract-card">
      <div className="extract-card-title">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="extract-row">
      <span className="extract-row-label">{label}</span>
      <span className="extract-row-value">{children}</span>
    </div>
  )
}
