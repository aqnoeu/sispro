import { useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { permissionKey, permissionChanges } from '../../utils/permissionMatrix'
const levels=['Bloqueado','Leitura','Edição','Administração']
export function PermissionMatrix({roles,mechanics,enabledIds,permissions,busy,onSave}){
  const [draft,setDraft]=useState({})
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const ordered=[...roles].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
  const original=new Map(permissions.map(p=>[permissionKey(p.role_id,p.mechanic_id),p.access_level]))
  const changes=permissionChanges({roles,mechanics,enabledIds,permissions,draft})
  function change(key,value){setDraft(prev=>({...prev,[key]:Number(value)}));setMessage('');setError('')}
  async function save(){setMessage('');setError('');try{await onSave(changes);setDraft({});setMessage('Permissões salvas com sucesso.')}catch(e){setError(e.message)}}
  return <section className="permission-matrix">
    <p>Defina o nível de acesso de cada cargo em todas as mecânicas. As permissões já cadastradas são preservadas; células sem configuração começam bloqueadas. As alterações só são aplicadas ao salvar.</p>
    <div className="permission-legend" aria-label="Legenda dos níveis">{levels.map((name,n)=><span className={'permission-level permission-level--'+n} key={n}>{n} · {name}</span>)}</div>
    {ordered.length>0&&mechanics.length>0?<div className="permission-table-scroll" tabIndex={0} aria-label="Matriz de permissões; role horizontalmente se necessário">
      <table className="permission-table"><thead><tr><th scope="col">Mecânica</th>{ordered.map(r=><th scope="col" key={r.id}>{r.name}{r.active===false&&<small>Inativo</small>}</th>)}</tr></thead>
      <tbody>{mechanics.map(m=>{const enabled=enabledIds.includes(m.id);return <tr key={m.id}><th scope="row">{m.name}{!enabled&&<small>Desabilitada</small>}</th>{ordered.map(r=>{const key=permissionKey(r.id,m.id),before=original.get(key)??0,value=draft[key]??before;const disabled=!enabled||r.active===false;return <td key={r.id}>{disabled?<span className="permission-disabled" title={'Nível configurado: '+before+' · '+levels[before]}>—</span>:<select className={'permission-select permission-level--'+value+(value!==before?' permission-changed':'')} aria-label={m.name+' — '+r.name} disabled={busy} value={value} onChange={e=>change(key,e.target.value)}>{levels.map((name,n)=><option key={n} value={n}>{n} · {name}</option>)}</select>}</td>})}</tr>})}</tbody></table>
    </div>:<p>Nenhum cargo ou mecânica disponível neste ambiente.</p>}
    <div className="permission-footer"><span role="status">{changes.length?changes.length+' alteração(ões) não salva(s).':message||'Nenhuma alteração pendente.'}</span><div><button type="button" className="secondary-button" disabled={busy||!changes.length} onClick={()=>{setDraft({});setMessage('');setError('')}}><RotateCcw size={16}/> Descartar</button><button type="button" className="primary-button" disabled={busy||!changes.length} onClick={save}><Save size={16}/> Salvar permissões</button></div></div>
    {error&&<p role="alert" className="form-feedback form-feedback--error">{error}</p>}
  </section>
}
