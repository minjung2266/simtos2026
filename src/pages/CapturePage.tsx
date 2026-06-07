import { useState } from 'react'
import { ConsultationRecord } from '../types'
import { ocrFormImage } from '../services/gemini'
import ImageCapture from '../components/ImageCapture'

type Step = 'idle' | 'processing' | 'done' | 'error'

interface Props {
  record: ConsultationRecord
  onChange: (r: ConsultationRecord) => void
  onNext: () => void
  onCancel: () => void
}

export default function CapturePage({ record, onChange, onNext, onCancel }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleFormOcr = async (base64: string, mimeType: string) => {
    setStep('processing')
    setError(null)
    try {
      const parsed = await ocrFormImage(base64, mimeType)
      onChange({ ...record, ...parsed, form_image_b64: base64 })
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR 실패')
      setStep('error')
    }
  }

  return (
    <div className="scan-page">
      <div className="scan-header">
        <button className="btn-ghost btn-sm" onClick={onCancel}>← 목록</button>
        <div className="scan-header-center">
          <span className="scan-page-title">상담지 스캔</span>
          <span className="scan-page-sub">AI가 모든 항목을 자동 인식합니다</span>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div className={`scan-zone ${step === 'done' ? 'zone-done' : step === 'error' ? 'zone-error' : ''}`}>
        <div className="scan-zone-top">
          <div className="scan-zone-meta">
            <span className="scan-zone-name">상담지 촬영</span>
            <span className="scan-zone-desc">방문자 정보·설문·상담 내용 전체를 AI가 자동 인식합니다</span>
          </div>
          {step === 'done' && <span className="scan-badge-done">✓ 인식 완료</span>}
          {step === 'processing' && (
            <span className="scan-badge-proc"><span className="spinner-sm" /> 분석중</span>
          )}
          {step === 'error' && <span className="scan-badge-err">⚠ 실패</span>}
        </div>

        {step === 'processing' && (
          <div className="ocr-progress">
            <div className="ocr-progress-track">
              <div className="ocr-progress-bar" />
            </div>
            <span className="ocr-progress-label">Gemini AI 인식 중…</span>
          </div>
        )}

        <ImageCapture
          label="사진 촬영 · 업로드"
          onCapture={handleFormOcr}
          preview={record.form_image_b64}
          disabled={step === 'processing'}
        />

        {step === 'done' && (record.visitor_company || record.visitor_name) && (
          <div className="ocr-snippet">
            <span className="ocr-snippet-tag">인식됨</span>
            {record.visitor_company && <span className="ocr-snippet-company">{record.visitor_company}</span>}
            {record.visitor_name && <span className="ocr-snippet-name">{record.visitor_name}</span>}
            {record.visit_day && <span className="ocr-snippet-day">{record.visit_day}</span>}
          </div>
        )}
      </div>

      {error && <div className="scan-error-msg">⚠ {error}</div>}

      <button
        className="btn-primary btn-full"
        onClick={onNext}
        disabled={step !== 'done'}
      >
        AI 추출 결과 확인 →
      </button>
    </div>
  )
}
