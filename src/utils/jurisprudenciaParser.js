const PROCESS_NUMBER_PATTERN = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/
const LEADING_CASE_PATTERN = /\b(?:RE|ARE|ADI|ADPF|HC|RMS|MS|AgR|Tema)\s*\.?\s*\d{2,9}\b/i
const ADMIN_PROCESS_PATTERN = /\b\d{2,4}(?:\.\d{3})*(?:\/\d{2,4})?\b/
const DATE_PATTERN = /\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/
const INTERNAL_REFERENCE_PATTERN = /\b(?:PRE|PAR|TES)[-_ ]?\d{1,4}\b/gi

export function processJurisprudenciaText({ tipo, textoBruto = '', link = '' }) {
  const normalizedText = normalizeWhitespace(textoBruto)

  if (tipo === 'precedente') {
    const data = extractDate(normalizedText)
    const tese = extractTese(normalizedText)
    const ementa = detectExistingEmenta(normalizedText) || buildLegalEmenta({
      text: normalizedText,
      tese,
      tema: extractTema(normalizedText),
    })
    const tribunal = extractTribunal(normalizedText)
    const casoReferencia = extractCasoReferencia(normalizedText)

    return {
      ementa,
      tribunal,
      relator: extractRelator(normalizedText),
      data,
      ano: extractAno({ text: normalizedText, data, casoReferencia }),
      casoReferencia,
      tese,
      numeroProcesso: extractProcessNumber(normalizedText),
      link,
      dataTs: dateToTimestamp(data),
      tipoRegistro: isPrecedenteRelevante(normalizedText) ? 'precedente relevante' : 'precedente',
    }
  }

  if (tipo === 'parecer') {
    const dataEmissao = extractDate(normalizedText)
    return {
      ementa,
      dataEmissao,
      procuradorResponsavel: extractProcurador(normalizedText),
      processoAdministrativo: extractAdministrativeProcess(normalizedText),
      link,
      dataTs: dateToTimestamp(dataEmissao),
    }
  }

  if (tipo === 'referencia') {
    return {
      ementa: detectExistingEmenta(normalizedText) || buildEmenta(normalizedText),
      numeroAno: extractReferenceNumber(normalizedText),
      tipoReferencia: extractReferenceType(normalizedText),
      palavrasChave: extractReferenceKeywords(normalizedText),
      link,
    }
  }

  return {
    ementa: buildEmenta(normalizedText),
    area: extractAreaTematica(normalizedText),
    referencias: extractInternalReferences(normalizedText),
    link,
  }
}

function buildEmenta(text) {
  if (!text) {
    return ''
  }

  const cleanedText = text
    .replace(/\b(ac[oó]rd[aã]o|ementa|relat[oó]rio|fundamenta[cç][aã]o|decis[aã]o)\b:?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const sentences = cleanedText
    .split(/(?<=[.!?;])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18)

  const summary = []
  let length = 0

  for (const sentence of sentences) {
    if (length + sentence.length > 340 && summary.length) {
      break
    }

    summary.push(sentence)
    length += sentence.length

    if (summary.length === 2 || length >= 220) {
      break
    }
  }

  if (!summary.length) {
    return truncate(cleanedText, 340)
  }

  return truncate(summary.join(' '), 340)
}

function extractTribunal(text) {
  const normalized = removeAccents(text).toLowerCase()

  if (normalized.includes('stf') || normalized.includes('repercussao geral') || /\bRE\s*\d+/i.test(text) || /\bARE\s*\d+/i.test(text)) {
    return 'STF'
  }

  if (normalized.includes('stj')) {
    return 'STJ'
  }

  const patterns = [
    /\b(STF|STJ|TST|TSE|TRF ?\d|TJ[A-Z]{2}|TRE-[A-Z]{2}|TRT ?\d{1,2})\b/i,
    /\b(Tribunal de Justi[cç]a do [^.;\n]+)/i,
    /\b(Tribunal Regional Federal da [^.;\n]+)/i,
  ]

  return extractFirstMatch(text, patterns) || 'não identificado'
}

function extractRelator(text) {
  const patterns = [
    /\brelator(?:a)?\s*[:\-]\s*([^.;\n]+)/i,
    /\brel\.\s*([^.;\n]+)/i,
    /\bministro relator\s*[:\-]?\s*([^.;\n]+)/i,
    /\bMIN\.\s*([^.;\n]+)/i,
  ]

  return normalizePersonName(extractFirstMatch(text, patterns, 1))
}

function extractProcurador(text) {
  const patterns = [
    /\bprocurador(?:a)?(?: responsável)?\s*[:\-]\s*([^.;\n]+)/i,
    /\bparecerista\s*[:\-]\s*([^.;\n]+)/i,
    /\bassinado por\s*([^.;\n]+)/i,
  ]

  return extractFirstMatch(text, patterns, 1)
}

function extractDate(text) {
  const match = text.match(DATE_PATTERN)

  if (!match) {
    return ''
  }

  return formatDate(match[1])
}

function extractProcessNumber(text) {
  const match = text.match(PROCESS_NUMBER_PATTERN)
  return match?.[0] ?? ''
}

function extractCasoReferencia(text) {
  const labelledMatch = text.match(/\bLeading Case\s*[:\-]\s*([^.;\n]+)/i)

  if (labelledMatch?.[1]) {
    return labelledMatch[1].trim()
  }

  const match = text.match(LEADING_CASE_PATTERN)
  return match?.[0]?.replace(/\s+/g, ' ').trim() ?? ''
}

function extractAdministrativeProcess(text) {
  const labelledMatch = text.match(/\bprocesso administrativo\s*(?:n[oº°.]*)?\s*[:\-]?\s*([^.;\n]+)/i)

  if (labelledMatch?.[1]) {
    return labelledMatch[1].trim()
  }

  const genericMatch = text.match(ADMIN_PROCESS_PATTERN)
  return genericMatch?.[0] ?? ''
}

function extractAreaTematica(text) {
  const normalized = removeAccents(text).toLowerCase()

  if (normalized.match(/\bambient|licenciamento|app\b|meio ambiente/)) {
    return 'Ambiental'
  }

  if (normalized.match(/\burban|parcelamento|zoneamento|regularizacao fundiaria|reurb/)) {
    return 'Urbanística'
  }

  if (normalized.match(/\bsaude|medicamento|hospital|tratamento|sus\b/)) {
    return 'Saúde'
  }

  if (normalized.match(/\btribut|fiscal|execucao fiscal|iss|iptu\b/)) {
    return 'Fiscal'
  }

  if (normalized.match(/\bservidor|administrativo|licitacao|contrato\b/)) {
    return 'Administrativa'
  }

  return ''
}

function extractInternalReferences(text) {
  const processReference = extractProcessNumber(text)
  const references = new Set()

  if (processReference) {
    references.add(processReference)
  }

  const internalMatches = text.match(INTERNAL_REFERENCE_PATTERN) ?? []
  internalMatches.forEach((reference) => references.add(reference.trim().replace(/\s+/g, '-').toUpperCase()))

  return [...references].join(', ')
}

function extractTese(text) {
  const labelledMatch = text.match(/\bTese\s*[:\-]\s*([\s\S]+?)(?=\n\s*\n|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n]*:|$)/i)

  if (labelledMatch?.[1]) {
    return normalizeWhitespace(labelledMatch[1])
  }

  const enumMatch = text.match(/(?:^|\n)\s*1\.\s*([\s\S]+?)(?=\n\s*\d+\.|\n\s*\n|$)/)

  if (enumMatch?.[1]) {
    return normalizeWhitespace(enumMatch[1])
  }

  return ''
}

function detectExistingEmenta(text) {
  const labelledMatch = text.match(/\bEMENTA\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\n|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}[^\n]*:|$)/i)

  if (labelledMatch?.[1]) {
    return toLegalUpperCase(normalizeWhitespace(labelledMatch[1]))
  }

  const firstParagraph = normalizeWhitespace(String(text ?? '').split('\n\n')[0] ?? '')

  if (isSyntheticLegalSummary(firstParagraph)) {
    return toLegalUpperCase(firstParagraph)
  }

  return ''
}

function buildLegalEmenta({ text, tese, tema }) {
  const parts = []
  const normalizedText = removeAccents(text).toLowerCase()

  if (tema) {
    parts.push(tema)
  } else if (normalizedText.includes('medicamento')) {
    parts.push('FORNECIMENTO DE MEDICAMENTO')
  } else if (normalizedText.includes('saude')) {
    parts.push('DIREITO À SAÚDE')
  } else if (normalizedText.includes('tribut')) {
    parts.push('MATÉRIA TRIBUTÁRIA')
  } else if (normalizedText.includes('urban')) {
    parts.push('MATÉRIA URBANÍSTICA')
  } else if (normalizedText.includes('ambient')) {
    parts.push('MATÉRIA AMBIENTAL')
  } else {
    parts.push('JURISPRUDÊNCIA')
  }

  if (tese) {
    splitLegalClauses(tese).forEach((clause) => parts.push(clause))
  } else {
    buildEmenta(text)
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4)
      .forEach((item) => parts.push(item))
  }

  const uniqueParts = [...new Set(parts.map((item) => toLegalUpperCase(item)).filter(Boolean))]
  return truncate(uniqueParts.join('. ') + '.', 500)
}

function extractTema(text) {
  const match = text.match(/\bTema\s*(?:de repercuss[aã]o geral)?\s*[:\-]?\s*([^.;\n]+)/i)
  return match?.[1] ? toLegalUpperCase(match[1]) : ''
}

function extractReferenceNumber(text) {
  const patterns = [
    /\b(Lei\s+n?[oº°.]?\s*\d[\d./-]*\/\d{4})/i,
    /\b(Decreto\s+n?[oº°.]?\s*\d[\d./-]*\/\d{4})/i,
    /\b(Resolu[cç][aã]o\s+n?[oº°.]?\s*\d[\d./-]*\/\d{4})/i,
    /\b(Norma\s+t[eé]cnica\s+[A-Z0-9.-]+\/\d{4})/i,
  ]

  return extractFirstMatch(text, patterns, 1)
}

function extractReferenceType(text) {
  const normalized = removeAccents(text).toLowerCase()

  if (normalized.includes('lei')) return 'Lei'
  if (normalized.includes('decreto')) return 'Decreto'
  if (normalized.includes('norma tecnica') || normalized.includes('abnt') || normalized.includes('nbr')) return 'Norma técnica'
  if (normalized.includes('resolucao')) return 'Resolução'
  if (normalized.includes('portaria')) return 'Portaria'

  return ''
}

function extractReferenceKeywords(text) {
  const normalized = removeAccents(text).toLowerCase()
  const keywords = []

  if (normalized.includes('licit')) keywords.push('licitação')
  if (normalized.includes('contrat')) keywords.push('contratos')
  if (normalized.includes('ambient')) keywords.push('ambiental')
  if (normalized.includes('urban')) keywords.push('urbanístico')
  if (normalized.includes('saude')) keywords.push('saúde')
  if (normalized.includes('anvisa')) keywords.push('anvisa')
  if (normalized.includes('servidor')) keywords.push('servidor público')
  if (normalized.includes('administracao publica')) keywords.push('administração pública')

  return [...new Set(keywords)].join(', ')
}

function extractAno({ text, data, casoReferencia }) {
  if (data) {
    const parts = data.split('/')
    return parts[2] ?? ''
  }

  const source = `${casoReferencia} ${text}`
  const match = source.match(/\b(19|20)\d{2}\b/)
  return match?.[0] ?? ''
}

function isPrecedenteRelevante(text) {
  const normalized = removeAccents(text).toLowerCase()
  return normalized.includes('repercussao geral') || normalized.includes('tema de repercussao geral')
}

function extractFirstMatch(text, patterns, groupIndex = 0) {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match?.[groupIndex]) {
      return match[groupIndex].trim()
    }
  }

  return ''
}

function normalizePersonName(value) {
  const cleaned = String(value ?? '')
    .replace(/\bMIN\.\s*/i, '')
    .replace(/\bMINISTRO(A)?\s*/i, '')
    .replace(/\bDES\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
    ? cleaned
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : ''
}

function normalizeWhitespace(text) {
  return String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function removeAccents(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  return value
}

function dateToTimestamp(value) {
  const formattedValue = formatDate(value)

  if (!formattedValue) {
    return 0
  }

  const [day, month, year] = formattedValue.split('/').map(Number)

  if (!day || !month || !year) {
    return 0
  }

  return new Date(year, month - 1, day).getTime()
}

function truncate(value, maxLength) {
  const text = String(value ?? '').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3).trim()}...`
}

function toLegalUpperCase(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function isSyntheticLegalSummary(text) {
  if (!text) {
    return false
  }

  const hasMultipleClauses = text.split('.').filter((item) => item.trim().length > 8).length >= 2
  const uppercaseRatio = text.replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g, '').length >= 20
  return hasMultipleClauses || uppercaseRatio
}

function splitLegalClauses(text) {
  return String(text ?? '')
    .split(/(?:\.\s+|\n+|;\s+)/)
    .map((item) => item.trim())
    .filter((item) => item.length > 8)
    .slice(0, 6)
}
