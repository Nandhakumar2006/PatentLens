import { Cpu, Sparkles } from 'lucide-react'

export default function LoadingState({ label = 'Retrieving prior-art vectors…', subtext = 'Searching dense embedding space with FAISS inner-product index' }) {
  return (
    <div className="panel radar-sweep" style={{
      padding: '40px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      borderColor: 'rgba(99, 102, 241, 0.3)',
      background: 'rgba(19, 28, 49, 0.85)',
      boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
    }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          border: '2px dashed rgba(6, 182, 212, 0.3)',
          borderRightColor: '#06b6d4',
          animation: 'spin 1.8s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#818cf8',
        }}>
          <Sparkles size={22} />
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>{label}</h3>
        {subtext && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subtext}</p>}
      </div>
    </div>
  )
}
