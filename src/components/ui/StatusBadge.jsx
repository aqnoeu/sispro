export function StatusBadge({ value }) {
  const tone = getTone(value)

  return <span className={`status-badge status-badge--${tone}`}>{value ?? 'Sem status'}</span>
}

function getTone(value) {
  const normalizedValue = String(value ?? '').toLowerCase()

  if (normalizedValue.includes('duplicado') || normalizedValue.includes('invalida')) {
    return 'warning'
  }

  if (normalizedValue.includes('novo')) {
    return 'success'
  }

  if (normalizedValue.includes('critica') || normalizedValue.includes('hoje')) {
    return 'danger'
  }

  if (normalizedValue.includes('alta') || normalizedValue.includes('prioritaria')) {
    return 'warning'
  }

  if (normalizedValue.includes('publicado') || normalizedValue.includes('consolidada')) {
    return 'success'
  }

  return 'neutral'
}
