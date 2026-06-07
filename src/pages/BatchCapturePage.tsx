import { useState, useRef } from 'react'
import { ConsultationRecord } from '../types'
import { processFormImage } from '../services/api'

type FileStatus = 'queued' | 'processing' | 'done' | 'error'

interface FileItem {
  id: string
  file: File
  previewUrl: string
  status: FileStatus
  error?: string
}

interface Props {
  onComplete: (records: ConsultationRecord[]) => void
  onCancel: () => void
}

export default function BatchCapturePage({ onComplete, onCancel }: Props) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<ConsultationRecord[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (fileList: FileList) => {
    const items: FileItem[] = Array.from(fileList).map(f => ({
      id: `${f.name}_${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'queued',
    }))
    setFiles(prev => [...prev, ...items])
  }

  const removeFile = (id: string) =>
    setFiles(prev => prev.filter(f => f.id !== id))

  const updateStatus = (idx: number, status: FileStatus, error?: string) =>
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, error } : f))

  const runOcr = async () => {
    if (files.length === 0) return
    setRunning(true)
    const recs: ConsultationRecord[] = []

    for (let i = 0; i < files.length; i++) {
      setCurrentIdx(i + 1)
      updateStatus(i, 'processing')
      try {
        const rec = await processFormImage(files[i].file)
        recs.push(rec)
        updateStatus(i, 'done')
      } catch (e) {
        updateStatus(i, 'error', e instanceof Error ? e.message : '처리 실패')
      }
    }

    setResults(recs)
    setRunning(false)
    setDone(true)
  }

  const doneCount = files.filter(f => f.status === 'done').length
  const progress = files.length > 0 ? Math.round((currentIdx / files.length) * 100) : 0

  return (
    <div className="batch-page">
      <div className="scan-header">
        <button className="btn-ghost btn-sm" onClick={onCancel}>← 목록</button>
        <div className="scan-header-center">
          <span className="scan-page-title">일괄 업로드</span>
          <span className="scan-page-sub">여러 장의 상담지를 한 번에 AI 인식합니다</span>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {!running && !done && (
        <div
          className="batch-dropzone"
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
          <span className="batch-drop-icon">📂</span>
          <span className="batch-drop-text">클릭하거나 드래그하여 사진 선택</span>
          <span className="batch-drop-sub">여러 장 동시 선택 가능 · JPG, PNG, HEIC</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="batch-file-list">
          {files.map((f) => (
            <div key={f.id} className={`batch-file-row bfr-${f.status}`}>
              <img src={f.previewUrl} className="batch-thumb" alt="" />
              <div className="batch-file-meta">
                <span className="batch-file-name">{f.file.name}</span>
                <span className="batch-file-size">{(f.file.size / 1024).toFixed(0)} KB</span>
              </div>
              <div className="batch-file-status">
                {f.status === 'queued'     && <span className="bfs-tag bfs-queued">대기</span>}
                {f.status === 'processing' && <span className="bfs-tag bfs-proc"><span className="spinner-sm" /> 처리중</span>}
                {f.status === 'done'       && <span className="bfs-tag bfs-done">✓ 완료</span>}
                {f.status === 'error'      && <span className="bfs-tag bfs-err" title={f.error}>⚠ 실패</span>}
              </div>
              {!running && f.status === 'queued' && (
                <button className="btn-icon btn-delete" onClick={() => removeFile(f.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {running && (
        <div className="batch-progress-wrap">
          <div className="batch-progress-info">
            <span>서버에서 OCR 처리 중</span>
            <span className="batch-progress-count">{currentIdx} / {files.length}</span>
          </div>
          <div className="batch-progress-track">
            <div className="batch-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {done && (
        <div className="batch-done-banner">
          <span className="batch-done-icon">✓</span>
          <div>
            <div className="batch-done-title">{doneCount}건 인식 · 저장 완료</div>
            {files.filter(f => f.status === 'error').length > 0 && (
              <div className="batch-done-sub">
                {files.filter(f => f.status === 'error').length}건 실패 (건너뜀)
              </div>
            )}
          </div>
        </div>
      )}

      {!running && !done && files.length > 0 && (
        <button className="btn-primary btn-full" onClick={runOcr}>
          OCR 추출 시작 ({files.length}장) →
        </button>
      )}
      {done && results.length > 0 && (
        <button className="btn-primary btn-full" onClick={() => onComplete(results)}>
          결과 확인 ({doneCount}건) →
        </button>
      )}
    </div>
  )
}
