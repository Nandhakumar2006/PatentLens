import { formatScore } from '../utils/format'
import { Sparkles, Check, AlertCircle } from 'lucide-react'

export default function ScoreBadge({ value, showPercent = true }) {
  if (value === null || value === undefined) {
    return <span className="score-badge score-low">sim n/a</span>
  }

  const num = Number(value)
  const percent = Math.round(num * 100)
  
  let scoreClass = 'score-low'
  let Icon = AlertCircle
  let label = `${formatScore(num)}`

  if (num >= 0.65) {
    scoreClass = 'score-high'
    Icon = Sparkles
    label = showPercent ? `${percent}% Match` : `sim ${formatScore(num)}`
  } else if (num >= 0.40) {
    scoreClass = 'score-mid'
    Icon = Check
    label = showPercent ? `${percent}% Match` : `sim ${formatScore(num)}`
  } else {
    scoreClass = 'score-low'
    label = showPercent ? `${percent}% Match` : `sim ${formatScore(num)}`
  }

  return (
    <span
      className={`score-badge ${scoreClass}`}
      title={`Relevance match: ${percent}%`}
    >
      <Icon size={13} />
      <span>{label}</span>
    </span>
  )
}
