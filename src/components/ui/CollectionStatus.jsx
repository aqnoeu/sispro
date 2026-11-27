export function CollectionStatus({ loading, error, source, empty, label }) {
  if (loading) {
    return <div className="collection-status">Carregando {label}...</div>
  }

  if (error) {
    return <div className="collection-status collection-status--error">Erro ao carregar {label}: {error}</div>
  }

  if (source === 'local') {
    return <div className="collection-status">Armazenamento local.</div>
  }

  if (empty) {
    return <div className="collection-status">Nenhum registro encontrado em {label}.</div>
  }

  return <div className="collection-status collection-status--success">Dados carregados com sucesso.</div>
}
