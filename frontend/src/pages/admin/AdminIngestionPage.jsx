import { useState, useRef, useEffect } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Zap,
  History,
  FileText,
  Calendar,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileDown,
  Trash2,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'
import SecretConfirmDialog from '../../components/SecretConfirmDialog'

const MANDATORY_COLUMNS = [
  'patent_id', 'title', 'abstract', 'claims',
  'description', 'inventor', 'country',
]

const CSV_COLUMNS_INFO = [
  ['patent_id', true, 'Unique patent identification code', 'US-2024-0012345-A1'],
  ['title', true, 'Invention title', 'High-Efficiency Perovskite Solar Cell'],
  ['abstract', true, 'Brief summary of invention', 'A multi-junction photovoltaic device…'],
  ['claims', true, 'Claims separated by numbering', '1. A solar cell comprising… 2. The solar cell…'],
  ['description', true, 'Full detailed description', 'Detailed description of preferred embodiment…'],
  ['inventor', true, 'Inventor name(s)', 'Dr. Alice Vance, Dr. Gordon Freeman'],
  ['country', true, '2-letter country code (US, EP, IN, etc.)', 'US'],
  ['publication_date', false, 'Date in YYYY-MM-DD format', '2024-04-10'],
  ['publication_number', false, 'Official filing or publication number', 'US11223344B2'],
  ['ipc_cpc_codes', false, 'Classification codes separated by semicolons', 'H02S10/00; H01L31/04'],
  ['applicant', false, 'Assignee or applicant company/organization', 'Apex Energy Innovations LLC'],
  ['source_url', false, 'Direct web URL to official patent document', 'https://patents.google.com/patent/…'],
]

export default function AdminIngestionPage() {
  const [activeTab, setActiveTab] = useState('bulk') // 'bulk' | 'history'

  // Bulk CSV state
  const [file, setFile] = useState(null)
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [ingestionResult, setIngestionResult] = useState(null)

  // Index rebuild state
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildResult, setRebuildResult] = useState(null)

  // Ingestion History state
  const [historyData, setHistoryData] = useState({ items: [], total: 0, page: 1, page_size: 15 })
  const [loadingHistory, setLoadingHistory] = useState(false)

  // View Modal state
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalContent, setModalContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // Delete modals state
  const [historyToDelete, setHistoryToDelete] = useState(null)
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false)

  const fileRef = useRef()
  const toast = useToast()

  function loadHistory(page = 1) {
    setLoadingHistory(true)
    adminApi
      .ingestionHistory(page, 15)
      .then(setHistoryData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingHistory(false))
  }

  async function handleDeleteHistoryItem(secretPassword) {
    if (!historyToDelete) return
    await adminApi.deleteIngestionHistory(historyToDelete.id, secretPassword)
    toast.success(`Ingestion record #${historyToDelete.id} removed successfully`)
    setHistoryToDelete(null)
    loadHistory(historyData.page)
  }

  async function handleClearAllHistory(secretPassword) {
    const res = await adminApi.clearAllIngestionHistory(secretPassword)
    toast.success(res.message || 'All ingestion history cleared successfully')
    setClearAllModalOpen(false)
    loadHistory(1)
  }

  useEffect(() => {
    loadHistory(1)
  }, [])

  function handleFileSelect(e) {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only .csv files are supported')
      return
    }
    setFile(selected)
    setValidation(null)
    setIngestionResult(null)
  }

  async function handleValidate() {
    if (!file) return
    setValidating(true)
    setValidation(null)
    try {
      const result = await adminApi.validateCsv(file)
      setValidation(result)
      if (result.is_valid) {
        toast.success('CSV structure verified successfully!')
      } else {
        toast.error('CSV structure does not match the required format')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setValidating(false)
    }
  }

  async function handleIngest() {
    if (!file || !validation?.is_valid) return
    setIngesting(true)
    try {
      const result = await adminApi.processCsv(file)
      setIngestionResult(result)
      toast.success(result.message)
      // Refresh history so new ingestion appears immediately
      loadHistory(1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setIngesting(false)
    }
  }

  async function handleRebuildIndex() {
    setRebuilding(true)
    setRebuildResult(null)
    try {
      const result = await adminApi.rebuildIndex()
      setRebuildResult(result)
      if (result.success) {
        toast.success(`AI index rebuilt: ${result.total_vectors} vectors`)
      } else {
        toast.error(result.message)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRebuilding(false)
    }
  }

  async function openDetailModal(item) {
    setSelectedItem(item)
    setModalContent(null)
    setLoadingContent(true)
    try {
      const content = await adminApi.ingestionHistoryContent(item.id)
      setModalContent(content)
    } catch (e) {
      toast.error(e.message || 'Failed to load details')
    } finally {
      setLoadingContent(false)
    }
  }

  function closeDetailModal() {
    setSelectedItem(null)
    setModalContent(null)
  }

  async function handleDownloadFile(item) {
    try {
      toast.info('Starting CSV download…')
      await adminApi.downloadIngestedFile(item.id, item.filename)
      toast.success('Download complete!')
    } catch (e) {
      toast.error(e.message || 'Download failed')
    }
  }

  const historyTotalPages = Math.ceil(historyData.total / historyData.page_size) || 1

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Patent Ingestion</h2>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Upload bulk datasets, track audit logs in ingestion history, and rebuild the AI index
        </p>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'bulk' ? '' : 'secondary'}`}
          onClick={() => setActiveTab('bulk')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Upload size={15} /> Bulk CSV Ingestion
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'history' ? '' : 'secondary'}`}
          onClick={() => {
            setActiveTab('history')
            loadHistory(historyData.page)
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <History size={15} /> Ingestion History
          {historyData.total > 0 && (
            <span
              style={{
                background: 'var(--accent-orange)',
                color: '#1a1a1a',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: '0.72rem',
                fontWeight: 700,
                marginLeft: 4,
              }}
            >
              {historyData.total}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BULK CSV INGESTION */}
      {activeTab === 'bulk' && (
        <>
          {/* Step 1: Required CSV Format */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0 }}>
                <FileSpreadsheet size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Required CSV Format
              </h4>
              <button className="btn secondary btn-sm" onClick={() => adminApi.downloadTemplate()}>
                <Download size={13} /> Download Template
              </button>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Required</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {CSV_COLUMNS_INFO.map(([col, req, desc, example]) => (
                    <tr key={col}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-orange)' }}>{col}</td>
                      <td>
                        {req ? (
                          <span className="score-badge score-high" style={{ fontSize: '0.7rem' }}>Required</span>
                        ) : (
                          <span className="score-badge score-low" style={{ fontSize: '0.7rem' }}>Optional</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{desc}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 2: Upload & Validate */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 14 }}>
              <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Upload & Validate CSV
            </h4>

            <div
              className={`dropzone ${file ? 'active' : ''}`}
              onClick={() => fileRef.current?.click()}
              style={{ marginBottom: 14, flexDirection: 'column', gap: 8, padding: 28 }}
            >
              <Upload size={24} style={{ color: file ? 'var(--accent-orange)' : 'var(--text-muted)' }} />
              {file ? (
                <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              ) : (
                <span className="muted">Click to select a .csv file or drag and drop</span>
              )}
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>

            {file && !validation && (
              <button className="btn" onClick={handleValidate} disabled={validating}>
                {validating ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Validating…</> : 'Validate CSV Structure'}
              </button>
            )}

            {/* Validation Result */}
            {validation && (
              <div style={{ marginTop: 14 }}>
                {validation.is_valid ? (
                  <div className="banner ok" style={{ marginBottom: 14 }}>
                    <CheckCircle size={18} />
                    <div>
                      <strong>Structure Verified!</strong> All {MANDATORY_COLUMNS.length} required columns matched.
                      {' '}{validation.total_rows} row{validation.total_rows !== 1 ? 's' : ''} ready for ingestion.
                    </div>
                  </div>
                ) : (
                  <div className="banner error" style={{ marginBottom: 14 }}>
                    <XCircle size={18} />
                    <div>
                      <strong>Invalid CSV Structure</strong>
                      <div style={{ marginTop: 4 }}>
                        Missing required column{validation.missing_columns.length > 1 ? 's' : ''}:{' '}
                        {validation.missing_columns.map((c) => (
                          <code key={c} style={{ background: 'rgba(239,71,67,0.2)', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>
                            {c}
                          </code>
                        ))}
                      </div>
                      <div style={{ marginTop: 4, fontSize: '0.82rem' }}>
                        Detected columns: {validation.detected_columns.join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                {validation.preview.length > 0 && (
                  <>
                    <h4 style={{ marginBottom: 8, fontSize: '0.88rem' }}>Preview (first {validation.preview.length} rows)</h4>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            {Object.keys(validation.preview[0]).map((k) => (
                              <th key={k} style={{ fontSize: '0.72rem' }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validation.preview.map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((v, j) => (
                                <td key={j} style={{ fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {v || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Proceed Button */}
                {validation.is_valid && !ingestionResult && (
                  <button className="btn" onClick={handleIngest} disabled={ingesting} style={{ marginTop: 14 }}>
                    {ingesting ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Ingesting…</> : 'Proceed with Ingestion'}
                  </button>
                )}
              </div>
            )}

            {/* Ingestion Result */}
            {ingestionResult && (
              <div className="banner ok" style={{ marginTop: 14 }}>
                <CheckCircle size={18} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <strong>Ingestion Complete!</strong>
                    <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                      {ingestionResult.created} created · {ingestionResult.updated} updated · {ingestionResult.skipped} skipped
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => {
                      setActiveTab('history')
                      loadHistory(1)
                    }}
                    style={{ marginLeft: 16 }}
                  >
                    View in Ingestion History
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Index Update Panel */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>
                  <Zap size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Update AI Search Index
                </h4>
                <p className="muted small" style={{ margin: '4px 0 0' }}>
                  Rebuild the FAISS vector index after adding new patents so they appear in AI semantic search results
                </p>
              </div>
              <button className="btn" onClick={handleRebuildIndex} disabled={rebuilding}>
                {rebuilding ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Rebuilding…</> : 'Rebuild AI Index'}
              </button>
            </div>

            {rebuildResult && (
              <div className={`banner ${rebuildResult.success ? 'ok' : 'error'}`} style={{ marginTop: 14 }}>
                {rebuildResult.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
                <div>
                  <strong>{rebuildResult.success ? 'Index Rebuilt Successfully' : 'Rebuild Failed'}</strong>
                  <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                    {rebuildResult.message}
                    {rebuildResult.success && ` (${rebuildResult.total_vectors} vectors, ${rebuildResult.dimension}d)`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: INGESTION HISTORY */}
      {activeTab === 'history' && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} /> Ingestion Audit History
              </h4>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                Complete log of single patents and bulk CSV files ingested into the platform
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {historyData.total > 0 && (
                <button
                  type="button"
                  className="btn btn-sm danger"
                  onClick={() => setClearAllModalOpen(true)}
                  disabled={loadingHistory}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  title="Clear all ingestion audit history and stored files"
                >
                  <Trash2 size={12} /> Clear All History
                </button>
              )}
              <button
                className="btn secondary btn-sm"
                onClick={() => loadHistory(historyData.page)}
                disabled={loadingHistory}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={12} className={loadingHistory ? 'spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
              <p className="muted small">Loading history…</p>
            </div>
          ) : historyData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <History size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>No ingestion events recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Ingested By</th>
                      <th>Date & Time</th>
                      <th>Summary</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.ingestion_type === 'single' ? (
                            <span
                              className="score-badge"
                              style={{
                                background: 'var(--lc-blue-subtle)',
                                color: 'var(--lc-blue)',
                                border: '1px solid rgba(0,122,255,0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.72rem',
                              }}
                            >
                              <FileText size={11} /> Single Patent
                            </span>
                          ) : (
                            <span
                              className="score-badge"
                              style={{
                                background: 'var(--accent-orange-subtle)',
                                color: 'var(--accent-orange)',
                                border: '1px solid rgba(255,161,22,0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.72rem',
                              }}
                            >
                              <FileSpreadsheet size={11} /> Bulk CSV
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {item.user_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                            @{item.username || 'system'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.user_email}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} />
                            {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                          </div>
                        </td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                          {item.summary}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => openDetailModal(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              <Eye size={12} /> View Details
                            </button>
                            {item.has_file && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleDownloadFile(item)}
                                title="Download uploaded CSV file"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <FileDown size={12} /> Download
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm danger"
                              onClick={() => setHistoryToDelete(item)}
                              title="Delete this history record (requires secret password)"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {historyTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
                  <button
                    className="btn secondary btn-sm"
                    disabled={historyData.page <= 1}
                    onClick={() => loadHistory(historyData.page - 1)}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="muted small">
                    Page {historyData.page} of {historyTotalPages}
                  </span>
                  <button
                    className="btn secondary btn-sm"
                    disabled={historyData.page >= historyTotalPages}
                    onClick={() => loadHistory(historyData.page + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* DETAIL MODAL (What Was Ingested) */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeDetailModal}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              width: '100%',
              maxWidth: 820,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedItem.ingestion_type === 'single' ? (
                  <FileText size={20} style={{ color: 'var(--lc-blue)' }} />
                ) : (
                  <FileSpreadsheet size={20} style={{ color: 'var(--accent-orange)' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {selectedItem.ingestion_type === 'single' ? 'Single Patent Ingestion Record' : 'Bulk CSV Ingestion Record'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ingested by <strong>{selectedItem.user_name}</strong> (@{selectedItem.username || 'system'}) on{' '}
                    {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={closeDetailModal}
                style={{ padding: 4, color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {loadingContent ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
                  <p className="muted small">Loading details…</p>
                </div>
              ) : selectedItem.ingestion_type === 'single' ? (
                /* Single Patent Detail Display */
                modalContent?.details ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patent ID</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-orange)' }}>
                          {modalContent.details.patent_id}
                        </div>
                      </div>

                      {modalContent.details.publication_number && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 6 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Publication Number</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            {modalContent.details.publication_number}
                          </div>
                        </div>
                      )}

                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Country & Date</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                          {modalContent.details.country || '—'} · {modalContent.details.publication_date || 'N/A'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inventor</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                          {modalContent.details.inventor || '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Title</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
                        {modalContent.details.title}
                      </div>
                    </div>

                    {modalContent.details.abstract && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Abstract</div>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                          {modalContent.details.abstract}
                        </div>
                      </div>
                    )}

                    {modalContent.details.claims && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Claims</div>
                        <pre style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
                          {modalContent.details.claims}
                        </pre>
                      </div>
                    )}

                    {modalContent.details.description && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Detailed Description</div>
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.6, maxHeight: 200, overflowY: 'auto', color: 'var(--text-secondary)' }}>
                          {modalContent.details.description}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="muted">No details found for this record.</p>
                )
              ) : (
                /* Bulk CSV Detail Display */
                <div>
                  {/* File Stats Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Name</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-orange)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {modalContent?.filename || selectedItem.filename || 'dataset.csv'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Size</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {modalContent?.filesize ? `${(modalContent.filesize / 1024).toFixed(1)} KB` : 'N/A'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--lc-green)' }}>
                        {modalContent?.created ?? selectedItem.details?.created ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Updated</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--lc-blue)' }}>
                        {modalContent?.updated ?? selectedItem.details?.updated ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {modalContent?.skipped ?? selectedItem.details?.skipped ?? '0'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      File Data Preview {modalContent?.rows?.length ? `(${modalContent.rows.length} rows preview)` : ''}
                    </div>

                    {selectedItem.has_file && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleDownloadFile(selectedItem)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <FileDown size={14} /> Download Ingested CSV
                      </button>
                    )}
                  </div>

                  {/* Tabular CSV View */}
                  {modalContent?.rows && modalContent.rows.length > 0 ? (
                    <div className="table-wrapper" style={{ maxHeight: 380, overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            {(modalContent.headers && modalContent.headers.length > 0
                              ? modalContent.headers
                              : Object.keys(modalContent.rows[0])
                            ).map((h) => (
                              <th key={h} style={{ fontSize: '0.72rem', position: 'sticky', top: 0, background: '#252525' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modalContent.rows.map((row, i) => (
                            <tr key={i}>
                              {(modalContent.headers && modalContent.headers.length > 0
                                ? modalContent.headers
                                : Object.keys(row)
                              ).map((h, j) => (
                                <td
                                  key={j}
                                  style={{
                                    fontSize: '0.76rem',
                                    maxWidth: 220,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontFamily: h.toLowerCase().includes('id') ? 'monospace' : 'inherit',
                                  }}
                                  title={row[h] || ''}
                                >
                                  {row[h] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="panel" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No preview rows available for this file.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                background: 'var(--bg-secondary)',
              }}
            >
              {selectedItem.ingestion_type === 'bulk' && selectedItem.has_file && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleDownloadFile(selectedItem)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download File
                </button>
              )}
              <button type="button" className="btn secondary btn-sm" onClick={closeDetailModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Ingestion Record Modal */}
      <SecretConfirmDialog
        open={Boolean(historyToDelete)}
        title="Delete Ingestion Record"
        description={
          historyToDelete ? (
            <span>
              Are you sure you want to permanently delete ingestion record{' '}
              <strong style={{ color: 'var(--text-primary)' }}>#{historyToDelete.id}</strong> (
              <span style={{ color: 'var(--accent-orange)' }}>
                {historyToDelete.ingestion_type === 'bulk' ? 'Bulk CSV' : 'Single Patent'}
              </span>
              : {historyToDelete.summary})?
              {historyToDelete.has_file && (
                <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  📁 The uploaded CSV file stored on the server will also be permanently deleted.
                </div>
              )}
            </span>
          ) : null
        }
        warning="This audit log entry will be permanently removed from the system."
        confirmText="Confirm & Delete Record"
        onConfirm={handleDeleteHistoryItem}
        onCancel={() => setHistoryToDelete(null)}
        isDanger={true}
      />

      {/* Clear All Ingestion History Modal */}
      <SecretConfirmDialog
        open={clearAllModalOpen}
        title="Clear All Ingestion History"
        description={
          <span>
            Are you sure you want to permanently erase all{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{historyData.total}</strong> ingestion
            audit record{historyData.total !== 1 ? 's' : ''} and all associated stored CSV files from the server?
          </span>
        }
        warning="All history entries and stored batch files will be permanently erased."
        confirmText="Confirm & Clear All"
        onConfirm={handleClearAllHistory}
        onCancel={() => setClearAllModalOpen(false)}
        isDanger={true}
      />
    </div>
  )
}
