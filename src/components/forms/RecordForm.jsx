import { useEffect, useMemo, useState } from 'react'
import { createCollectionDocument } from '../../services/local/localCrud'

export function RecordForm({
  config,
  formId = null,
  additionalValues = {},
  scopeMessage = '',
  initialValuesOverride = {},
}) {
  const initialValues = useMemo(() => {
    const defaults = Object.fromEntries(
      config.fields.map((field) => [field.name, field.defaultValue ?? '']),
    )

    return {
      ...defaults,
      ...initialValuesOverride,
    }
  }, [config.fields, initialValuesOverride])
  const [values, setValues] = useState(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const documentId = await createCollectionDocument({
        collectionName: config.collectionName,
        values,
        idField: config.idField,
        additionalValues,
      })

      setFeedback({
        type: 'success',
        message: `Cadastro salvo com sucesso em ${config.collectionName}/${documentId}.`,
      })
      setValues(initialValues)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Falha ao salvar os dados.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleChange(name, nextValue) {
    setValues((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  return (
    <section id={formId ?? undefined} className="form-panel">
      <div className="form-panel__header">
        <div>
          <h4>{config.title}</h4>
          <p>{config.description}</p>
          {scopeMessage ? <small className="form-panel__scope">{scopeMessage}</small> : null}
        </div>
      </div>

      <form className="record-form" onSubmit={handleSubmit}>
        <div className="record-form__grid">
          {config.fields.map((field) => (
            <label
              key={field.name}
              className={`form-field${field.type === 'textarea' ? ' form-field--full' : ''}`}
            >
              <span>{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={values[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={submitting}
                >
                  <option value="">Selecione</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={4}
                  placeholder={field.placeholder}
                  value={values[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={submitting}
                />
              ) : field.type === 'url' ? (
                <input
                  type="url"
                  placeholder={field.placeholder}
                  value={values[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={submitting}
                />
              ) : (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={values[field.name]}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={submitting}
                />
              )}
            </label>
          ))}
        </div>

        <div className="record-form__actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar cadastro'}
          </button>
        </div>

        {feedback.message ? (
          <div
            className={`form-feedback${feedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}
          >
            {feedback.message}
          </div>
        ) : null}
      </form>
    </section>
  )
}
