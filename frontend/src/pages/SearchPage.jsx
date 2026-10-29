import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  UploadCloud,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Lightbulb,
  FileCheck2,
  Calendar,
  Globe,
  Layers,
  ArrowRight
} from 'lucide-react'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { documentApi, searchApi } from '../services/api'
import { useToast } from '../hooks/ToastContext'

const SAMPLE_INVENTIONS = [
  {
    name: 'Solar Irrigation Controller',
    title: 'Solar-Powered Automated Drip Irrigation Controller',
    description: 'An autonomous agricultural watering apparatus having a photovoltaic solar collector coupled to a battery bank, capacitive soil moisture sensors, and pulsed solenoid valves.',
    features: [
      'Photovoltaic panel integrated with capacitive soil moisture sensor',
      'Microcontroller pulsed solenoid valve for regulated drip flow',
      'Wireless telemetry module transmitting telemetry to mobile gateway'
    ],
    country: 'IN',
    classification: 'A01G'
  },
  {
    name: 'Drone Battery Thermal Sleeve',
    title: 'Phase-Change Material Thermal Management Sleeve for UAV Batteries',
    description: 'A passive thermal regulation enclosure for high-discharge lithium-ion battery modules in unmanned aerial vehicles using phase change material.',
    features: [
      'Micro-encapsulated paraffin phase-change thermal absorption jacket',
      'Conductive aluminum heat spreader matrix',
      'Over-temperature flight safety isolation mechanism'
    ],
    country: 'US',
    classification: 'H01M'
  },
  {
    name: 'Graphene Water Filter',
    title: 'Functionalized Chitosan-Graphene Nanocomposite Membrane Filter',
    description: 'A water purification cartridge comprising electrospun chitosan polymer nanofibers impregnated with functionalized graphene oxide nanosheets.',
    features: [
      'Electrospun chitosan nanofiber microfiltration matrix',
      'Functionalized graphene oxide heavy metal adsorption layer',
      'Gravity-fed low-pressure cartridge casing'
    ],
    country: '',
    classification: 'C02F'
  }
]

export default function SearchPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    technical_features: [],
    featureInput: '',
    top_k: 10,
    country: '',
    classification: '',
    date_from: '',
    date_to: '',
  })

  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [extractingPdf, setExtractingPdf] = useState(false)
  const [extractNote, setExtractNote] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  function loadPreset(sample) {
    setForm({
      ...form,
      title: sample.title,
      description: sample.description,
      technical_features: [...sample.features],
      country: sample.country || '',
      classification: sample.classification || '',
    })
    setExtractNote(null)
    toast.info(`Loaded: ${sample.name}`)
  }

  async function handleFileProcess(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document.')
      return
    }
    setExtractingPdf(true)
    setError('')
    try {
      const result = await documentApi.extract(file)
      if (result.empty) {
        setExtractNote({
          type: 'warn',
          message: 'The uploaded PDF yielded no extractable text. Please enter your invention details manually.'
        })
      } else {
        const extractedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
        setForm((prev) => ({
          ...prev,
          title: prev.title || extractedTitle,
          description: result.text.slice(0, 18000),
        }))
        setExtractNote({
          type: 'ok',
          message: `Extracted ${result.page_count} page(s) from "${file.name}".`
        })
        toast.success(`Extracted text from ${file.name}`)
      }
    } catch (err) {
      setError(err.message || 'Failed to extract text from PDF')
      toast.error('PDF extraction failed')
    } finally {
      setExtractingPdf(false)
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    handleFileProcess(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFileProcess(file)
  }

  function addFeature() {
    const trimmed = form.featureInput.trim()
    if (!trimmed) return
    if (!form.technical_features.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        technical_features: [...prev.technical_features, trimmed],
        featureInput: '',
      }))
    } else {
      setForm((prev) => ({ ...prev, featureInput: '' }))
    }
  }

  function removeFeature(index) {
    setForm((prev) => ({
      ...prev,
      technical_features: prev.technical_features.filter((_, i) => i !== index),
    }))
  }

  function handleFeatureKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFeature()
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Invention Title is mandatory. Please provide a title.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description ? form.description.trim() : '',
        technical_features: form.technical_features,
        top_k: Number(form.top_k),
        country: form.country ? form.country.toUpperCase() : null,
        classification: form.classification || null,
        date_from: form.date_from || null,
        date_to: form.date_to || null,
      }
      const result = await searchApi.create(payload)
      toast.success('Prior-art search completed!')
      navigate(`/app/results/${result.search_id}`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Search execution failed')
    } finally {
      setBusy(false)
    }
  }

  const isTitleProvided = form.title.trim().length > 0

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 6 }}>Search Prior-Art</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Find relevant patent disclosures and technical prior-art related to your invention idea.
        </p>
      </div>

      {/* Preset Inventions Bar */}
      <div className="panel" style={{
        padding: '14px 18px',
        marginBottom: 20,
        background: 'rgba(19, 28, 49, 0.45)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 600 }}>
          <Lightbulb size={16} style={{ color: '#38bdf8' }} />
          <span>Quick Sample Presets:</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SAMPLE_INVENTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="btn secondary btn-sm"
              onClick={() => loadPreset(s)}
              style={{ fontSize: '0.8rem', borderRadius: 9999 }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <ErrorState message={error} />

      {busy && (
        <div style={{ marginBottom: 20 }}>
          <LoadingState
            label="Searching patent database…"
            subtext="Analyzing prior-art text, ranking related patent matches, and preparing excerpts"
          />
        </div>
      )}

      <form className="panel form-stack" onSubmit={onSubmit} style={{ padding: 30 }}>
        {/* Title Input - Mandatory */}
        <div>
          <label className="label" htmlFor="title">
            <span>Invention Title</span>
            <span style={{ color: 'var(--rose)', fontWeight: 700 }}>*</span>
            <span className="label-hint">(Mandatory)</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g. Autonomous Solar Agricultural Irrigation Controller"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ fontSize: '1rem' }}
          />
        </div>

        {/* Detailed Description - Optional */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="label" htmlFor="description" style={{ margin: 0 }}>
              <FileText size={15} className="text-muted" />
              <span>Invention Description</span>
              <span className="label-hint">(Optional)</span>
            </label>
          </div>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe the operational mechanics, sensor configuration, materials, or methods of your invention (optional, but helps improve accuracy)."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ minHeight: 120 }}
          />
        </div>

        {/* Technical Features Tag Builder */}
        <div>
          <label className="label">
            <Layers size={15} className="text-muted" />
            <span>Key Technical Features</span>
            <span className="label-hint">(Optional — used to compare features against patent claims)</span>
          </label>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="e.g. Conductive aluminum cooling sleeve"
              value={form.featureInput}
              onChange={(e) => setForm({ ...form, featureInput: e.target.value })}
              onKeyDown={handleFeatureKeyDown}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={addFeature}
              disabled={!form.featureInput.trim()}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {form.technical_features.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {form.technical_features.map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 12px',
                    borderRadius: 9999,
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontSize: '0.85rem',
                    color: '#c7d2fe',
                  }}
                >
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label="Remove feature"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PDF Ingestion Dropzone */}
        <div>
          <label className="label">
            <UploadCloud size={15} className="text-muted" />
            <span>Attach Invention Disclosure or Whitepaper</span>
            <span className="label-hint">(Optional PDF upload)</span>
          </label>
          
          <div
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '22px 20px' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />

            {extractingPdf ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="spinner" style={{ width: 22, height: 22 }} />
                <span style={{ fontSize: '0.9rem', color: '#c7d2fe', fontWeight: 600 }}>
                  Extracting text from PDF…
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}>
                  <UploadCloud size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>
                    Click or drop a PDF to auto-fill title & description
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supported: PDF files up to 15MB
                  </div>
                </div>
              </div>
            )}
          </div>

          {extractNote && (
            <div className={`banner ${extractNote.type}`} style={{ marginTop: 10 }}>
              <FileCheck2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{extractNote.message}</span>
            </div>
          )}
        </div>

        {/* Collapsible Filters */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(13, 19, 34, 0.4)',
          overflow: 'hidden',
          marginTop: 4,
        }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderRadius: 0,
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={15} style={{ color: '#818cf8' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Optional Search Filters (Country, IPC/CPC, Date)
              </span>
              {(form.country || form.classification || form.date_from || form.date_to || form.top_k !== 10) && (
                <span className="brand-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  Filters Active
                </span>
              )}
            </div>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showFilters && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="grid-2">
                <div>
                  <label className="label" htmlFor="country">
                    <Globe size={14} className="text-muted" />
                    <span>Country / Jurisdiction</span>
                  </label>
                  <input
                    id="country"
                    placeholder="e.g. IN, US, EP"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {['IN', 'US', 'EP', 'WO'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="btn ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', background: form.country === c ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)' }}
                        onClick={() => setForm({ ...form, country: form.country === c ? '' : c })}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="class">
                    <Layers size={14} className="text-muted" />
                    <span>IPC / CPC Classification Code</span>
                  </label>
                  <input
                    id="class"
                    placeholder="e.g. A01G, H01M, C02F"
                    value={form.classification}
                    onChange={(e) => setForm({ ...form, classification: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="from">
                    <Calendar size={14} className="text-muted" />
                    <span>Published After</span>
                  </label>
                  <input
                    id="from"
                    type="date"
                    value={form.date_from}
                    onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="to">
                    <Calendar size={14} className="text-muted" />
                    <span>Published Before</span>
                  </label>
                  <input
                    id="to"
                    type="date"
                    value={form.date_to}
                    onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="label" htmlFor="k" style={{ marginBottom: 6 }}>
                  <span>Number of Results: <strong>{form.top_k}</strong></span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[5, 10, 20, 50].map((kVal) => (
                    <button
                      key={kVal}
                      type="button"
                      className={`btn btn-sm ${Number(form.top_k) === kVal ? '' : 'secondary'}`}
                      onClick={() => setForm({ ...form, top_k: kVal })}
                    >
                      {kVal} Patents
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            className="btn btn-lg"
            disabled={busy || !isTitleProvided}
            type="submit"
            style={{ minWidth: 200 }}
          >
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                <span>Searching…</span>
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={18} />
                <span>Search Prior-Art</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
