import { StatusBadge } from './StatusBadge'

export function DataTable({ columns, rows, emptyMessage, getRowClassName = null }) {
  if (!rows.length) {
    return <div className="empty-state">{emptyMessage}</div>
  }

  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? row.numero} className={typeof getRowClassName === 'function' ? getRowClassName(row) : ''}>
              {columns.map((column) => {
                const value = row[column.key]

                if (typeof column.render === 'function') {
                  return <td key={column.key}>{column.render(row)}</td>
                }

                if (column.type === 'status') {
                  return (
                    <td key={column.key}>
                      <StatusBadge value={value} />
                    </td>
                  )
                }

                if (column.type === 'link') {
                  const href = row[column.hrefKey ?? column.key]

                  return (
                    <td key={column.key}>
                      {href ? (
                        <a
                          className="table-link"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {value || 'Abrir documento'}
                        </a>
                      ) : (
                        value || 'Sem link'
                      )}
                    </td>
                  )
                }

                return <td key={column.key}>{value}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
