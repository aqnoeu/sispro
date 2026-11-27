import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
export function ProcessDialog({ editing, saving, onClose, title, icon, footer, tabs, feedback, children }) {
 const dialog=useRef(null)
 useEffect(()=>{const el=dialog.current; if(!el)return;el.showModal();return()=>{if(el.open)el.close()}},[])
 return <dialog ref={dialog} className={`work-dialog${editing?' work-dialog--editing':''}`} aria-labelledby="process-dialog-title" onCancel={event=>{event.preventDefault();if(!saving&&!editing)onClose()}}>
 <header className="work-dialog__header"><span className="work-dialog__icon">{icon}</span><div className="work-dialog__heading"><span>{editing?'Editar processo':'Detalhes do processo'}</span><h2 id="process-dialog-title">{title}</h2></div><button className="work-dialog__close" type="button" aria-label="Fechar detalhes" disabled={saving||editing} onClick={onClose}><X size={22} aria-hidden="true"/></button></header>
 {tabs}
 <div className="work-dialog__body" key={editing?'edit':'view'}>{children}</div>
 {feedback && <div className="work-dialog__feedback">{feedback}</div>}
 <footer className="work-dialog__footer">{footer}</footer>
 </dialog>
}
