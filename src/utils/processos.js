export const PROCESSO_STATUS_OPTIONS = ['Fazer', 'Corrigir', 'Protocolar', 'Produtividade']

export function getProcessoStatusTone(status) {
  const normalizedStatus = normalizeProcessText(status)

  if (normalizedStatus.includes('corrigir')) {
    return 'danger'
  }

  if (normalizedStatus.includes('protocolar')) {
    return 'success'
  }

  if (normalizedStatus.includes('fazer')) {
    return 'warning'
  }

  return 'info'
}

export function getTagLabel(tag) {
  return tag?.name ?? tag?.label ?? ''
}

export function normalizeTagIds(tags) {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => {
      if (!tag) {
        return ''
      }

      if (typeof tag === 'string') {
        return tag
      }

      return tag.id ?? tag.name ?? ''
    })
    .filter(Boolean)
}

export function enrichProcessoTags(processo, tags) {
  const processTagIds = normalizeTagIds(processo?.tags)
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))

  return processTagIds
    .map((tagId) => tagsById.get(tagId))
    .filter(Boolean)
}

export function processMatchesUserTag(processo, tags, currentUser) {
  if (!processo || !currentUser) {
    return false
  }

  const processTags = enrichProcessoTags(processo, tags)
  const userName = normalizeProcessText(currentUser.displayName)
  const userNameWithoutTitle = normalizeProcessText(
    String(currentUser.displayName ?? '').replace(/^(dr|dra)\.?\s+/i, ''),
  )

  return processTags.some((tag) => {
    const linkedUserId = String(tag.linkedUserId ?? '').trim()
    const linkedUserName = normalizeProcessText(tag.linkedUserName ?? '')
    const tagName = normalizeProcessText(tag.name ?? '')

    if (linkedUserId && linkedUserId === currentUser.uid) {
      return true
    }

    return Boolean(
      (linkedUserName && (linkedUserName === userName || linkedUserName === userNameWithoutTitle)) ||
      (tagName && (tagName === userName || tagName === userNameWithoutTitle)),
    )
  })
}

export function filterProcessos(processos, filters, tags) {
  const normalizedSearch = normalizeProcessText(filters.search)
  const selectedTags = normalizeTagIds(filters.tags)

  return processos.filter((processo) => {
    const processTagIds = normalizeTagIds(processo.tags)
    const processoDateKey = getMonthKey(processo.dataUltimoProtocolo || processo.prazo)
    const isInMonth = filters.onlyCurrentMonth
      ? processoDateKey === getCurrentMonthKey()
      : true

    if (!isInMonth) {
      return false
    }

    if (filters.status && processo.andamentoAtual !== filters.status) {
      return false
    }

    if (filters.prioridade && processo.prioridade !== filters.prioridade) {
      return false
    }

    if (filters.orgao && normalizeProcessText(processo.orgao) !== normalizeProcessText(filters.orgao)) {
      return false
    }

    if (filters.tag && !processTagIds.includes(filters.tag)) {
      return false
    }

    if (selectedTags.length && !selectedTags.every((tagId) => processTagIds.includes(tagId))) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const resolvedTags = enrichProcessoTags(processo, tags)
    const haystack = [
      processo.numero,
      processo.parte,
      processo.assunto,
      processo.orgao,
      processo.andamentoAtual,
      ...resolvedTags.map((tag) => tag.name),
    ]
      .map((value) => normalizeProcessText(value))
      .join(' ')

    return haystack.includes(normalizedSearch)
  })
}

export function buildProcessoStats(processos) {
  const currentMonthKey = getCurrentMonthKey()

  return {
    month: processos.filter((processo) => getMonthKey(processo.dataUltimoProtocolo || processo.prazo) === currentMonthKey).length,
    fazer: processos.filter((processo) => processo.andamentoAtual === 'Fazer').length,
    corrigir: processos.filter((processo) => processo.andamentoAtual === 'Corrigir').length,
    protocolar: processos.filter((processo) => processo.andamentoAtual === 'Protocolar').length,
  }
}

export function buildTagAssignmentValue(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return normalizeTagIds(value)
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getMonthKey(value) {
  const date = parseDate(value)

  if (!date) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentMonthKey() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function parseDate(value) {
  if (!value) {
    return null
  }

  const stringValue = String(value).trim()

  if (/^\d{2}\/\d{2}\/\d{4}/.test(stringValue)) {
    const [datePart] = stringValue.split(' ')
    const [day, month, year] = datePart.split('/').map(Number)
    return new Date(year, month - 1, day)
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    const [year, month, day] = stringValue.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return null
}

function normalizeProcessText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
