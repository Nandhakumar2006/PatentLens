import { AlertCircle } from 'lucide-react'

export default function ErrorState({ message }) {
  if (!message) return null

  return (
    <div className="banner error" role="alert" style={{ marginBottom: 16 }}>
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: 2 }}>Error Encountered</strong>
        <span>{message}</span>
      </div>
    </div>
  )
}
