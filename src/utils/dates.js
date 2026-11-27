export function toDateKey(value) {
  const parsedDate = parseStoredDate(value)

  if (!parsedDate) {
    return ''
  }

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseStoredDate(value) {
  if (!value) {
    return null
  }

  const stringValue = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const [year, month, day] = stringValue.split('-').map(Number)
    const parsedDate = new Date(year, month - 1, day)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const [datePart] = stringValue.split(' ')
  const [day, month, year] = datePart.split('/').map(Number)

  if (!day || !month || !year) {
    return null
  }

  const parsedDate = new Date(year, month - 1, day)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatDayMonth(value) {
  const parsedDate = parseStoredDate(value)

  if (!parsedDate) {
    return String(value ?? 'Não informado')
  }

  return parsedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateLabel(value) {
  const parsedDate = parseStoredDate(value)

  if (!parsedDate) {
    return String(value ?? 'Não informado')
  }

  return parsedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function isToday(value) {
  const parsedDate = parseStoredDate(value)

  if (!parsedDate) {
    return false
  }

  const today = new Date()

  return (
    parsedDate.getFullYear() === today.getFullYear() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getDate() === today.getDate()
  )
}

export function compareByDateDesc(leftValue, rightValue) {
  const leftDate = parseStoredDate(leftValue)
  const rightDate = parseStoredDate(rightValue)

  if (!leftDate && !rightDate) {
    return 0
  }

  if (!leftDate) {
    return 1
  }

  if (!rightDate) {
    return -1
  }

  return rightDate.getTime() - leftDate.getTime()
}
