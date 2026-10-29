export function formatDate(value) {
  if (!value) return 'Date not available'
  return String(value).slice(0, 10)
}

export function formatScore(value) {
  if (value === null || value === undefined) return 'n/a'
  return Number(value).toFixed(3)
}

export function missing(value, fallback = 'Not available in source data') {
  if (value === null || value === undefined || value === '') return fallback
  return value
}
