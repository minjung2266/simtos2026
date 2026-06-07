import { useRef, useState } from 'react'

interface Props {
  label: string
  onCapture: (base64: string, mimeType: string) => void
  accept?: string
  preview?: string
  disabled?: boolean
}

export default function ImageCapture({ label, onCapture, accept = 'image/*', preview, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      const base64 = result.split(',')[1]
      setLocalPreview(result)
      onCapture(base64, file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const img = localPreview || (preview ? `data:image/jpeg;base64,${preview}` : null)

  return (
    <div className="img-capture">
      <div
        className={`drop-zone ${img ? 'has-image' : ''}`}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !disabled && fileRef.current?.click()}
      >
        {img ? (
          <img src={img} alt="preview" className="preview-img" />
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">📷</span>
            <span>{label}</span>
            <span className="drop-sub">클릭하거나 드래그하여 업로드</span>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {img && (
        <button
          className="btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); setLocalPreview(null); if(fileRef.current) fileRef.current.value = '' }}
        >
          다시 찍기
        </button>
      )}
    </div>
  )
}
