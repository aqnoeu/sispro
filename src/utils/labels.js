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

export const PALETTE=['#16324F','#006B9A','#0098D6','#38BDF8','#A5D8F5','#164E63','#0891B2','#14B8A6','#99D5C9','#166534','#16834B','#65A30D','#84CC16','#C6E8A2','#854D0E','#B58116','#EAB308','#F59E0B','#FDBA74','#C2410C','#991B1B','#DC2626','#F87171','#F9A8D4','#DB2777','#9D174D','#A855F7','#7C3AED','#5B21B6','#C4B5FD','#4338CA','#6366F1','#818CF8','#1E40AF','#2563EB','#78716C','#475569','#64748B','#94A3B8','#CBD5E1','#374151','#111827','#FFFFFF','#000000','#FF0000','#FF8000','#FFFF00','#00FF00','#00FFFF','#0000FF','#FF00FF','#800080','#808000','#008080','#800000','#FFC0CB','#D2691E','#A0522D','#708090','#C0C0C0']
export const validColor=v=>/^#[0-9a-f]{6}$/i.test(v)
export function labelAppearance(color,style){const c=validColor(color)?color:'#006B9A';const l=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);return {background:style==='solid'?c:style==='outline'?'#fff':c+'20',color:style==='solid'?(l>.179?'#000':'#fff'):'#16324F',borderColor:style==='outline'?c:'transparent'}}
export const labelKey=(scope,name)=>scope+':'+name
