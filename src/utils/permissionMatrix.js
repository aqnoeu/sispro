export const permissionKey=(roleId,mechanicId)=>JSON.stringify([roleId,mechanicId])
export function permissionChanges({roles,mechanics,enabledIds,permissions,draft}){
  const prior=new Map(permissions.map(p=>[permissionKey(p.role_id,p.mechanic_id),p.access_level]))
  const changes=[]
  for(const r of roles) for(const m of mechanics){
    const key=permissionKey(r.id,m.id),level=draft[key]
    if(r.active!==false&&enabledIds.includes(m.id)&&Number.isInteger(level)&&level>=0&&level<=3&&level!==(prior.get(key)??0))changes.push({role_id:r.id,mechanic_id:m.id,access_level:level})
  }
  return changes
}
