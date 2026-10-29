import { formatDate, missing } from '../utils/format'
import { Calendar, Globe, Hash, Layers } from 'lucide-react'

export default function PatentMeta({ patent }) {
  if (!patent) return null

  return (
    <div className="meta-row">
      <span className="chip" title="Publication Number">
        <Hash size={11} className="text-muted" />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {missing(patent.publication_number, 'No ID')}
        </span>
      </span>

      {patent.country && (
        <span className="chip" title="Jurisdiction">
          <Globe size={11} className="text-muted" />
          <span>{patent.country}</span>
        </span>
      )}

      {patent.publication_date && (
        <span className="chip" title="Publication Date">
          <Calendar size={11} className="text-muted" />
          <span>{formatDate(patent.publication_date)}</span>
        </span>
      )}

      {patent.ipc_cpc_codes && (
        <span className="chip" title={`Classification: ${patent.ipc_cpc_codes}`}>
          <Layers size={11} className="text-muted" />
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {patent.ipc_cpc_codes}
          </span>
        </span>
      )}
    </div>
  )
}
