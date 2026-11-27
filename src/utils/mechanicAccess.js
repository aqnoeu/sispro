export function accessLevel(user,mechanic) {
  if(!user)return 0
  if(!user.isCloud||user.profileMode==='ceo'||user.profileMode==='pgm')return 3
  const n=user.levels?.[mechanic]
  return Number.isInteger(n)&&n>=0&&n<=3?n:0
}
export function canAccess(user,mechanic,required=1){return accessLevel(user,mechanic)>=required}
export function routeMechanic(path){
  if(/^\/processos\/[^/]+\/autos(?:\/|$)/.test(path))return 'autos'
  const root=path.split('/')[1]
  return ['processos','prazos','agenda','jurisprudencia','usuarios','setores','gabinetes'].includes(root)?root:null
}
export function canOpenRoute(user,path){
 const m=routeMechanic(path)
 if(!m)return true
 const needed=path==='/jurisprudencia/cadastro'||path==='/prazos/lote'?2:1
 return canAccess(user,m,needed)&&(!['usuarios','setores','gabinetes'].includes(m)||user.profileMode==='ceo'||!user.isCloud||user.profileMode==='pgm')
}
