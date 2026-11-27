export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <span className="page-header__eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </div>
  )
}
