import { useState, useRef } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'

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
  // Bulk CSV state
  const [file, setFile] = useState(null)
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [ingestionResult, setIngestionResult] = useState(null)

  // Index rebuild state
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildResult, setRebuildResult] = useState(null)

  const fileRef = useRef()
  const toast = useToast()

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

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Patent Ingestion</h2>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Upload bulk CSV datasets and update the AI search index
        </p>
      </div>

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
            <div>
              <strong>Ingestion Complete!</strong>
              <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                {ingestionResult.created} created · {ingestionResult.updated} updated · {ingestionResult.skipped} skipped
              </div>
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
    </div>
  )
}
