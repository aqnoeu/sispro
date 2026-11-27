import { useAuth } from '../../contexts/useAuth'

export function Topbar({ searchTerm, onSearchChange, showSearch = true }) {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.isAdmin

  return (
    <header className="topbar">
      <div>
        <span className="topbar__eyebrow">
          {isAdmin ? 'Governança da Procuradoria' : 'Ambiente jurídico setorial'}
        </span>
        <h2>
          {isAdmin
            ? 'Usuários, setores e ambientes independentes sob administração central'
            : 'Processos, prazos e organização no ambiente do setor autenticado'}
        </h2>
        <p className="topbar__workspace">
          Ambiente atual: <strong>{currentUser?.sectorName ?? currentUser?.workspace ?? currentUser?.displayName ?? 'Não identificado'}</strong>
        </p>
      </div>

      <div className="topbar__actions">
        {showSearch ? (
          <label className="search-field">
            <span className="search-field__label">{isAdmin ? 'Consulta administrativa' : 'Consulta do setor'}</span>
            <input
              type="search"
              placeholder={
                isAdmin
                  ? 'Buscar setores, usuários, processos, prazos ou dados do sistema'
                  : 'Buscar processos, prazos ou compromissos do setor'
              }
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        ) : null}
      </div>
    </header>
  )
}
