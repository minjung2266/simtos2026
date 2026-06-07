import { useState, useEffect } from 'react'
import logoImg from './assets/logo.png'
import { ConsultationRecord } from './types'
import { fetchRecords, deleteRecordApi, updateRecord } from './services/api'
import ListPage from './pages/ListPage'
import BatchCapturePage from './pages/BatchCapturePage'
import BatchResultPage from './pages/BatchResultPage'
import ResultPage from './pages/ResultPage'
import './App.css'

type View = 'list' | 'batch' | 'batch-result' | 'detail'

export default function App() {
  const [records, setRecords] = useState<ConsultationRecord[]>([])
  const [view, setView] = useState<View>('list')
  const [batchDrafts, setBatchDrafts] = useState<ConsultationRecord[]>([])
  const [detailRecord, setDetailRecord] = useState<ConsultationRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRecords = async () => {
    try {
      const data = await fetchRecords()
      setRecords(data)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [])

  const handleNew = () => setView('batch')

  const handleBatchComplete = (recs: ConsultationRecord[]) => {
    setBatchDrafts(recs)
    setView('batch-result')
  }

  // /api/process가 최초 OCR 결과를 DB에 넣어둔 상태. 사용자 편집을 PUT 으로 반영.
  const handleSaveAll = async () => {
    try {
      await Promise.all(batchDrafts.map(r => updateRecord(r)))
    } catch (e) {
      alert(`저장 중 일부 항목이 실패했습니다: ${e instanceof Error ? e.message : e}`)
    }
    await loadRecords()
    setBatchDrafts([])
    setView('list')
  }

  const handleEdit = (id: string) => {
    const r = records.find(r => r.id === id)
    if (r) { setDetailRecord({ ...r }); setView('detail') }
  }

  const handleDetailSave = async () => {
    if (detailRecord) {
      try {
        await updateRecord(detailRecord)
      } catch (e) {
        alert(`저장 실패: ${e instanceof Error ? e.message : e}`)
        return
      }
      await loadRecords()
    }
    setDetailRecord(null)
    setView('list')
  }

  const handleDelete = async (id: string) => {
    await deleteRecordApi(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const handleCancel = () => {
    setBatchDrafts([])
    setDetailRecord(null)
    setView('list')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand" onClick={handleCancel}
            style={{ cursor: view !== 'list' ? 'pointer' : 'default' }}>
            <img src={logoImg} alt="InterX" className="header-logo-img" />
            <span className="header-sub">SIMTOS 2026 · 방문자 상담일지</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {view === 'list' && (
          <ListPage
            records={records}
            loading={loading}
            onNew={handleNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {view === 'batch' && (
          <BatchCapturePage
            onComplete={handleBatchComplete}
            onCancel={handleCancel}
          />
        )}
        {view === 'batch-result' && (
          <BatchResultPage
            records={batchDrafts}
            onChange={setBatchDrafts}
            onSaveAll={handleSaveAll}
            onBack={() => setView('batch')}
          />
        )}
        {view === 'detail' && detailRecord && (
          <ResultPage
            record={detailRecord}
            onChange={setDetailRecord}
            onSave={handleDetailSave}
            onBack={handleCancel}
          />
        )}
      </main>
    </div>
  )
}
