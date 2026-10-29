import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Search,
  Layers,
  FileCheck2,
  CheckCircle2,
  Zap,
  UploadCloud,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'

const SAMPLE_QUERIES = {
  solar: {
    title: 'Solar-Powered Automated Drip Irrigation Controller',
    features: ['Photovoltaic panel integrated with soil moisture sensor', 'Microcontroller pulsed solenoid valve', 'Wireless telemetry for real-time water flow telemetry'],
    matchPatent: 'SYN-0003: Autonomous Solar Agricultural Watering System',
    score: '87% Match',
    excerpt: 'Claim 1: An agricultural irrigation device comprising a solar photovoltaic panel powering a sensor-triggered water flow regulation valve responsive to capacitive moisture readings...'
  },
  battery: {
    title: 'Drone Lithium-Ion Battery Phase-Change Cooling Sleeve',
    features: ['Micro-encapsulated paraffin wax jacket', 'Conductive aluminum heat spreader fins', 'Over-temperature cut-off switch for UAV flight safety'],
    matchPatent: 'SYN-0001: Passive Thermal Management Sleeve for Portable Batteries',
    score: '81% Match',
    excerpt: 'Claim 2: A protective battery jacket containing phase-change thermal absorption material thermally coupled to an array of dissipating metallic conduits...'
  },
  filter: {
    title: 'Chitosan-Graphene Nanocomposite Heavy Metal Water Filter',
    features: ['Electrospun biodegradable polymer nanofiber membrane', 'Functionalized graphene oxide adsorption layers', 'Gravity-fed filtration cartridge for rural purification'],
    matchPatent: 'SYN-0002: Nanostructured Adsorptive Filter for Heavy Metal Removal',
    score: '79% Match',
    excerpt: 'Claim 4: A water purification substrate having polymeric fibers crosslinked with functionalized carbon nanosheets for selective divalent ion capture...'
  }
}

export default function LandingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('solar')

  const activeSample = SAMPLE_QUERIES[activeTab]

  return (
    <div className="container">
      {/* Hero Section */}
      <section style={{ padding: '40px 0 48px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-orange-subtle)',
          border: '1px solid rgba(255, 161, 22, 0.3)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-orange)' }}>
            Prior-Art Intelligence Platform
          </span>
        </div>

        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: 700,
          lineHeight: 1.2,
          maxWidth: 780,
          margin: '0 auto 16px',
        }}>
          Discover Related Prior-Art <br />
          <span style={{ color: 'var(--accent-orange)' }}>Before You File Patent Claims</span>
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          maxWidth: 640,
          margin: '0 auto 28px',
          lineHeight: 1.55,
        }}>
          Search patent literature using your invention title, description, or PDF whitepaper. Find relevant prior art, evaluate feature gaps, and inspect matching claims.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? '/app' : '/register'} className="btn btn-lg">
            <span>{user ? 'Open Dashboard' : 'Get Started Free'}</span>
            <ArrowRight size={16} />
          </Link>
          <Link to={user ? '/app/search' : '/login'} className="btn secondary btn-lg">
            <span>{user ? 'New Search' : 'Sign in'}</span>
          </Link>
        </div>

        {/* Feature badges */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          flexWrap: 'wrap',
          marginTop: 32,
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} style={{ color: 'var(--lc-green)' }} />
            Natural Language Search
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} style={{ color: 'var(--lc-green)' }} />
            PDF & Whitepaper Ingestion
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} style={{ color: 'var(--lc-green)' }} />
            Feature-to-Claim Gap Analysis
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} style={{ color: 'var(--lc-green)' }} />
            Downloadable PDF Reports
          </span>
        </div>
      </section>

      {/* Interactive Concept Preview */}
      <section style={{ margin: '12px 0 48px' }}>
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-orange)', fontWeight: 700 }}>
                Concept Retrieval Preview
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem' }}>
                How Your Invention Maps to Real Prior-Art Claims
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${activeTab === 'solar' ? '' : 'secondary'}`}
                onClick={() => setActiveTab('solar')}
                type="button"
              >
                Solar Irrigation
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'battery' ? '' : 'secondary'}`}
                onClick={() => setActiveTab('battery')}
                type="button"
              >
                Drone Battery Cooling
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'filter' ? '' : 'secondary'}`}
                onClick={() => setActiveTab('filter')}
                type="button"
              >
                Nanocomposite Filter
              </button>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            {/* Left: Input Invention */}
            <div style={{
              background: '#202020',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span className="brand-badge" style={{ color: 'var(--accent-orange)', borderColor: 'rgba(255, 161, 22, 0.3)' }}>
                  Invention Input
                </span>
              </div>
              <h4 style={{ margin: '0 0 10px', color: '#ffffff' }}>{activeSample.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Technical Features:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeSample.features.map((feat, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: '#282828',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <ChevronRight size={13} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Retrieved Result */}
            <div style={{
              background: '#202020',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="brand-badge" style={{ color: 'var(--lc-green)', borderColor: 'rgba(44, 187, 93, 0.3)' }}>
                    Top Prior-Art Match
                  </span>
                  <span className="score-badge score-high">
                    {activeSample.score}
                  </span>
                </div>
                <h4 style={{ margin: '0 0 8px', color: '#ffffff' }}>{activeSample.matchPatent}</h4>
                <div className="excerpt-box">
                  <div style={{ fontStyle: 'italic', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    "{activeSample.excerpt}"
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Semantic Match Found</span>
                <Link to={user ? '/app/search' : '/register'} style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-orange)' }}>
                  Try your idea <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Advantages Grid */}
      <section style={{ margin: '48px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 8px' }}>Platform Capabilities</h2>
          <p style={{ maxWidth: 540, margin: '0 auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Search by technical meaning without needing complex Boolean syntax
          </p>
        </div>

        <div className="grid-3">
          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <Search size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>Semantic Search</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Matches your invention against patent claims, abstracts, and specifications by conceptual meaning.
            </p>
          </div>

          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <UploadCloud size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>PDF Text Ingestion</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Upload draft disclosures or whitepapers to automatically extract and populate your query.
            </p>
          </div>

          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <Layers size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>Feature Gap Matrix</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Map individual features against claims and identify white-space gaps where no prior art exists.
            </p>
          </div>

          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <FileCheck2 size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>PDF Reports</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Generate structured prior-art search summaries with citations and excerpts ready to download.
            </p>
          </div>

          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <Zap size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>Fast Retrieval</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              High-speed vector index searches thousands of patent records in milliseconds.
            </p>
          </div>

          <div className="panel">
            <div className="stat-icon" style={{ marginBottom: 12 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--lc-green)' }} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>Grounded Excerpts</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Every hit shows the exact authentic claim text or abstract snippet that matched your idea.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
