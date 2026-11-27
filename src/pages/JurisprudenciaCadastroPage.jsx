import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from '../services/local/database'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'
import { getLocalServices, hasLocalDatabase } from '../services/local/client'
import {
  createJurisprudenciaRecord,
  resolveJurisprudenciaCollection,
  resolveJurisprudenciaRouteSegment,
  updateJurisprudenciaRecord,
} from '../services/local/jurisprudencia'
import { processJurisprudenciaText } from '../utils/jurisprudenciaParser'

const tipos = [
  { value: 'precedente', label: 'Precedente' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'tese', label: 'Tese' },
  { value: 'referencia', label: 'Referência' },
]

const initialProcessedValues = {
  ementa: '',
  link: '',
  tribunal: '',
  relator: '',
  data: '',
  ano: '',
  casoReferencia: '',
  tese: '',
  numeroProcesso: '',
  dataEmissao: '',
  procuradorResponsavel: '',
  processoAdministrativo: '',
  area: '',
  referencias: '',
  numeroAno: '',
  tipoReferencia: '',
  palavrasChave: '',
}

export function JurisprudenciaCadastroPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('modo') === 'editar' ? 'editar' : 'novo'
  const editingTipo = searchParams.get('tipo') || 'precedente'
  const editingId = searchParams.get('id') || ''
  const [tipo, setTipo] = useState(editingTipo)
  const [textoBruto, setTextoBruto] = useState('')
  const [link, setLink] = useState('')
  const [values, setValues] = useState(initialProcessedValues)
  const [currentRecord, setCurrentRecord] = useState(null)
  const [loadingRecord, setLoadingRecord] = useState(mode === 'editar' && hasLocalDatabase())
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const visibleFields = useMemo(() => {
    if (tipo === 'precedente') {
      return [
        { name: 'ementa', label: 'Ementa', type: 'textarea' },
        { name: 'tribunal', label: 'Tribunal' },
        { name: 'relator', label: 'Relator' },
        { name: 'data', label: 'Data' },
        { name: 'ano', label: 'Ano' },
        { name: 'casoReferencia', label: 'Caso de referência' },
        { name: 'tese', label: 'Tese', type: 'textarea' },
        { name: 'numeroProcesso', label: 'Número do processo' },
      ]
    }

    if (tipo === 'parecer') {
      return [
        { name: 'ementa', label: 'Ementa', type: 'textarea' },
        { name: 'dataEmissao', label: 'Data de emissão' },
        { name: 'procuradorResponsavel', label: 'Procurador responsável' },
        { name: 'processoAdministrativo', label: 'Processo administrativo' },
      ]
    }

    if (tipo === 'referencia') {
      return [
        { name: 'numeroAno', label: 'Número / ano' },
        { name: 'tipoReferencia', label: 'Tipo de referência' },
        { name: 'ementa', label: 'Ementa', type: 'textarea' },
        { name: 'palavrasChave', label: 'Palavras-chave' },
      ]
    }

    return [
      { name: 'ementa', label: 'Ementa', type: 'textarea' },
      { name: 'area', label: 'Área temática' },
      { name: 'referencias', label: 'Vínculos' },
    ]
  }, [tipo])

  useEffect(() => {
    setTipo(editingTipo)
  }, [editingTipo])

  useEffect(() => {
    if (mode !== 'editar' || !editingId) {
      setCurrentRecord(null)
      setLoadingRecord(false)
      return undefined
    }

    const collectionName = resolveJurisprudenciaCollection(editingTipo)

    if (!hasLocalDatabase()) {
      setLoadingRecord(false)
      return undefined
    }

    const { db } = getLocalServices()

    if (!db || !collectionName) {
      setLoadingRecord(false)
      return undefined
    }

    const unsubscribe = onSnapshot(
      doc(db, collectionName, editingId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setCurrentRecord(null)
          setLoadingRecord(false)
          return
        }

        const data = snapshot.data()
        setCurrentRecord({
          documentId: snapshot.id,
          ...data,
        })
        setLink(data.link ?? '')
        setTextoBruto(data.textoBruto ?? '')
        setValues({
          ...initialProcessedValues,
          ...data,
        })
        setLoadingRecord(false)
      },
      (error) => {
        setFeedback({
          type: 'error',
          message: error.message || 'Não foi possível carregar o registro para edição.',
        })
        setLoadingRecord(false)
      },
    )

    return unsubscribe
  }, [editingId, editingTipo, mode])

  function handleTipoChange(nextTipo) {
    setTipo(nextTipo)
    setTextoBruto('')
    setLink('')
    setValues(initialProcessedValues)
    setFeedback({ type: '', message: '' })
  }

  function handleFieldChange(name, nextValue) {
    setValues((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  function handleProcessText() {
    setProcessing(true)
    setFeedback({ type: '', message: '' })

    try {
      const processed = processJurisprudenciaText({
        tipo,
        textoBruto,
        link,
      })

      setValues((current) => ({
        ...current,
        ...processed,
      }))
      setFeedback({
        type: 'success',
        message: 'Texto processado. Revise os campos antes de salvar.',
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível processar o texto informado.',
      })
    } finally {
      setProcessing(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const payload = {
        ...values,
        link,
        textoBruto,
      }

      let documentId = ''

      if (mode === 'editar' && currentRecord) {
        await updateJurisprudenciaRecord({
          tipo,
          documentId: currentRecord.documentId ?? editingId,
          currentRecord,
          values: payload,
          currentUser,
        })
        documentId = currentRecord.documentId ?? editingId
      } else {
        documentId = await createJurisprudenciaRecord({
          tipo,
          values: payload,
          currentUser,
        })
      }

      navigate(`/jurisprudencia/${resolveJurisprudenciaRouteSegment(tipo)}/${documentId}`)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Falha ao salvar o cadastro.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Cadastro de jurisprudência"
        title={mode === 'editar' ? 'Editar registro de jurisprudência' : 'Processar texto e estruturar novo registro'}
        description="Cole o conteúdo bruto, extraia os campos possíveis de forma automática e revise tudo manualmente antes de salvar no armazenamento local."
        action={(
          <Link className="secondary-button" to="/jurisprudencia">
            Voltar à consulta
          </Link>
        )}
      />

      <section className="form-panel">
        <div className="form-panel__header">
          <div>
            <h4>{mode === 'editar' ? 'Edição de registro' : 'Novo registro'}</h4>
            <p>Selecione o tipo, processe o texto e finalize os campos necessários.</p>
          </div>
        </div>

        <form className="record-form" onSubmit={handleSubmit}>
          <div className="jurisprudencia-type-selector">
            {tipos.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`jurisprudencia-type-button${tipo === item.value ? ' jurisprudencia-type-button--active' : ''}`}
                onClick={() => handleTipoChange(item.value)}
                disabled={mode === 'editar'}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="record-form__grid">
            <label className="form-field form-field--full">
              <span>Link</span>
              <input
                type="url"
                placeholder="https://..."
                value={link}
                onChange={(event) => {
                  setLink(event.target.value)
                  handleFieldChange('link', event.target.value)
                }}
                disabled={submitting || loadingRecord}
              />
            </label>

            <label className="form-field form-field--full">
              <span>Texto bruto</span>
              <textarea
                rows={9}
                placeholder="Cole aqui o inteiro teor, a decisão, o parecer ou o texto-base da tese."
                value={textoBruto}
                onChange={(event) => setTextoBruto(event.target.value)}
                disabled={submitting || loadingRecord}
                required
              />
            </label>
          </div>

          <div className="record-form__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleProcessText}
              disabled={processing || submitting || loadingRecord || !textoBruto.trim()}
            >
              {processing ? 'Processando...' : 'Processar texto'}
            </button>
          </div>

          <div className="record-form__grid">
            {visibleFields.map((field) => (
              <label
                key={field.name}
                className={`form-field${field.type === 'textarea' ? ' form-field--full' : ''}`}
              >
                <span>{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={5}
                    value={values[field.name] ?? ''}
                    onChange={(event) => handleFieldChange(field.name, event.target.value)}
                    disabled={submitting || loadingRecord}
                    required={field.name === 'ementa'}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.name] ?? ''}
                    onChange={(event) => handleFieldChange(field.name, event.target.value)}
                    disabled={submitting || loadingRecord}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="record-form__actions">
            <button type="submit" className="primary-button" disabled={submitting || loadingRecord || !values.ementa.trim()}>
              {submitting ? 'Salvando...' : mode === 'editar' ? 'Salvar edição' : 'Salvar registro'}
            </button>
          </div>

          {feedback.message ? (
            <div className={`form-feedback${feedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}>
              {feedback.message}
            </div>
          ) : null}
        </form>
      </section>
    </div>
  )
}
