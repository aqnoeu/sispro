export const WORKFLOW=['Nova intimação','Em triagem','Fazer','Feito','Corrigir','Corrigido','Protocolado']
export const SUBJECTS=['Saúde','Tributário','Execução fiscal','Administrativo','Urbanístico','Ambiental','Servidor público','Previdenciário','Responsabilidade civil','Educação']
export const COURTS=['Infância e Juventude','Fazenda Pública','Juizado Especial','Juizado da Fazenda Pública','Vara Cível','Execuções Fiscais','Turma Recursal','Tribunal de Justiça']
export const CATEGORIES={materia:'Matéria jurídica',competencia:'Competência judicial',gabinete:'Gabinete',perfil:'Particular'}
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
export function workflow(row){if(WORKFLOW.includes(row?.andamentoIntimacao))return row.andamentoIntimacao;return ({protocolado:'Protocolado','em andamento':'Fazer',planejado:'Nova intimação','a vencer':'Nova intimação',hoje:'Nova intimação',concluido:'Feito'})[norm(row?.status)]||'Em triagem'}
export function classification(row){
 const a=norm(row?.assunto),o=norm(row?.orgao)
 const materia=SUBJECTS.filter(x=>a.includes(norm(x))||x==='Saúde'&&/medicamento|tratamento medico|neuropediatr|hospital|cirurgia/.test(a))
 const competencia=COURTS.filter(x=>o.includes(norm(x))).filter(x=>!(x==='Fazenda Pública'&&o.includes('juizado'))&&!(x==='Juizado Especial'&&o.includes('fazenda')))
 return {materia:Array.isArray(row?.classificacao?.materia)?row.classificacao.materia:materia,competencia:Array.isArray(row?.classificacao?.competencia)?row.classificacao.competencia:competencia}
}
export function scopeId(user,scope){return String(scope==='perfil'?user?.uid:user?.sectorId||'').trim().toLowerCase()}
export function visibleAssignment(row,user){return !!user&&['perfil','gabinete'].includes(row.scope)&&!!scopeId(user,row.scope)&&row.scopeId===scopeId(user,row.scope)}
export function processLabels(row,assignments=[]){const c=classification(row);return [...c.materia.map(name=>({name,scope:'materia'})),...c.competencia.map(name=>({name,scope:'competencia'})),...assignments.filter(x=>x.processoId===row.documentId).flatMap(x=>(x.labels||[]).map(name=>({name,scope:x.scope})))]}
export function uniqueLabels(value){return [...new Set(String(value??'').split(',').map(s=>s.trim()).filter(Boolean))].slice(0,30)}
export function workflowTone(v){return ['Feito','Corrigido','Protocolado'].includes(v)?'success':v==='Corrigir'?'danger':v==='Fazer'?'warning':'info'}
