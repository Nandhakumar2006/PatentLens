import { useState, useEffect } from 'react'
import { Search, Trash2, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useToast } from '../../hooks/ToastContext'

const initialPatentForm = {
  patent_id: '',
  publication_number: '',
  title: '',
  abstract: '',
  claims: '',
  description: '',
  inventor: '',
  country: 'US',
  publication_date: '',
  source_url: '',
}

export default function AdminPatentsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(initialPatentForm)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  function loadPatents(page = 1, q = searchQuery) {
    setLoading(true)
    adminApi
      .patents(page, 20, q)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPatents() }, [])

  async function handleDelete(patent) {
    if (!confirm(`Delete patent "${patent.patent_id}"? This cannot be undone.`)) return
    try {
      await adminApi.deletePatent(patent.id)
      toast.success(`Patent ${patent.patent_id} removed`)
      loadPatents(data.page)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleAddPatent(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminApi.createSinglePatent(form)
      toast.success(`Patent ${form.patent_id} created successfully! Remember to rebuild the AI index under Ingestion to update search.`)
      setShowAddForm(false)
      setForm(initialPatentForm)
      loadPatents(1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    loadPatents(1, searchQuery)
  }

  const totalPages = Math.ceil(data.total / data.page_size) || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>Patent Catalog</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>{data.total} patents in database</p>
        </div>
        <button className="btn btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Add Single Patent'}
        </button>
      </div>

      {/* Add Single Patent Form */}
      {showAddForm && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 14 }}>Add Single Patent</h4>
          <form onSubmit={handleAddPatent} className="form-stack">
            <div className="grid-2">
              <div>
                <label className="label">Patent ID <span style={{ color: 'var(--lc-red)' }}>*</span></label>
                <input placeholder="e.g. US-2024-0012345-A1" value={form.patent_id} onChange={(e) => setForm({ ...form, patent_id: e.target.value })} required />
              </div>
              <div>
                <label className="label">Publication Number <span className="label-hint">(optional)</span></label>
                <input placeholder="e.g. US11223344B2" value={form.publication_number} onChange={(e) => setForm({ ...form, publication_number: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Title <span style={{ color: 'var(--lc-red)' }}>*</span></label>
              <input placeholder="e.g. Solar-Powered Water Purification" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Abstract</label>
              <textarea placeholder="Brief summary of the invention…" value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="label">Claims</label>
              <textarea placeholder="1. A system comprising… 2. The method of claim 1…" value={form.claims} onChange={(e) => setForm({ ...form, claims: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="label">Detailed Description</label>
              <textarea placeholder="Full technical description…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid-3">
              <div>
                <label className="label">Inventor</label>
                <input placeholder="Dr. Jane Doe" value={form.inventor} onChange={(e) => setForm({ ...form, inventor: e.target.value })} />
              </div>
              <div>
                <label className="label">Country</label>
                <input placeholder="US" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div>
                <label className="label">Publication Date</label>
                <input type="date" value={form.publication_date} onChange={(e) => setForm({ ...form, publication_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Source URL <span className="label-hint">(optional)</span></label>
              <input type="url" placeholder="https://patents.google.com/patent/…" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            </div>
            <div>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : 'Create Patent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by patent ID or title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button type="submit" className="btn secondary">Search</button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
        </div>
      ) : data.items.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          No patents found
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Patent ID</th>
                  <th>Title</th>
                  <th>Country</th>
                  <th>Claims</th>
                  <th>Chunks</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>{p.patent_id}</td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title || '—'}
                    </td>
                    <td>
                      <span className="brand-badge">{p.country || '—'}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{p.claims_count}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.chunks_count}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.publication_date || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn danger btn-sm" onClick={() => handleDelete(p)} title="Delete patent">
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, alignItems: 'center' }}>
              <button className="btn secondary btn-sm" disabled={data.page <= 1} onClick={() => loadPatents(data.page - 1)}>
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="muted small">Page {data.page} of {totalPages}</span>
              <button className="btn secondary btn-sm" disabled={data.page >= totalPages} onClick={() => loadPatents(data.page + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
