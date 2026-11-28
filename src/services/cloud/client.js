// Supabase Auth and Data API. Session lives only in memory; no browser storage.
export class CloudClient {
  constructor({ url, key, fetcher = (...args) => globalThis.fetch(...args) }) {
    this.url = String(url || '').replace(/\/$/, '')
    this.key = String(key || '')
    this.fetcher = (...args) => fetcher(...args)
    this.session = null
  }
  get configured() { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.url) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(this.key) }
  async request(path, { token, method = 'GET', body, prefer } = {}) {
    if (!this.configured) throw new Error('Servidor ainda não configurado.')
    const headers = { apikey: this.key, 'Content-Type': 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    if (prefer) headers.Prefer = prefer
    let response
    try { response = await this.fetcher(this.url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(20000) }) }
    catch { throw new Error('Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.') }
    if (!response.ok) {
      let code; try { const payload = await response.json(); code = payload?.error_code ?? payload?.code } catch { /* no response body */ }
      const passwordGrant = path === '/auth/v1/token?grant_type=password'
      const message = passwordGrant && code === 'invalid_credentials' ? 'E-mail ou senha incorretos.' : passwordGrant && code === 'email_not_confirmed' ? 'Confirme seu e-mail antes de entrar.' : response.status === 429 ? 'Muitas tentativas. Aguarde alguns instantes e tente novamente.' : code === '23505' ? 'Já existe um registro com esses dados. Edite o registro existente.' : code === '23503' ? 'O registro está vinculado a outro cadastro ou pertence a outro ambiente.' : response.status === 409 ? 'Conflito de gravação. Recarregue e tente novamente.' : response.status === 401 || response.status === 403 ? 'Acesso não autorizado ou sessão expirada.' : 'Não foi possível concluir a operação no servidor.'
      const error = new Error(message); error.status = response.status; throw error
    }
    return response.status === 204 ? null : response.json()
  }
  async signIn(email, password) {
    this.session = null
    const auth = await this.request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })
    if (!auth?.access_token || !auth?.user?.id || !Number.isFinite(auth.expires_in) || auth.expires_in <= 0) throw new Error('Sessão inválida.')
    const s = { token: auth.access_token, uid: auth.user.id, expires: Date.now() + auth.expires_in * 1000 }
    try {
      const rows = await this.request('/rest/v1/sispro_profiles?select=user_id,display_name,role,active,platform_role&user_id=eq.' + encodeURIComponent(s.uid), { token:s.token })
      const p = rows?.[0]
      if (!p || p.user_id !== s.uid || !p.active || !['user','admin'].includes(p.role)) throw new Error('Conta sem autorização no Sispro.')
      const ceo=p.role==='admin'&&p.platform_role==='ceo'
      const grants=ceo?await this.request('/rest/v1/sispro_test_pgm_workspaces?select=user_id,active&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token}):[]
      const canTestPgm=grants?.some(g=>g.user_id===s.uid&&g.active===true)===true
      const user={uid:s.uid,email:auth.user.email,displayName:p.display_name,isAdmin:p.role==='admin',role:ceo?'CEO':p.role==='admin'?'Administrador':'Usuário',workspace:ceo?'SISPRO · CEO':'Sispro Web',sectorId:'web',sectorName:ceo?'SISPRO':'Ambiente individual',sectorSigla:'WEB',isCloud:true,profileMode:ceo?'ceo':'standard',canTestPgm}
      if(!ceo){
        const access=await this.request('/rest/v1/rpc/sispro_read_workspace',{token:s.token,method:'POST',body:{}})
        user.levels=access.levels||{}
      }
      this.session={...s,user,mode:user.profileMode}
      return user
    } catch (e) { try { await this.request('/auth/v1/logout?scope=local',{token:s.token,method:'POST'}) } catch { /* session discarded */ } throw e }
  }
  requireSession() { const s=this.session; if (!s || s.expires <= Date.now()) throw new Error('Sessão expirada. Entre novamente.'); return s }
  assertSession(s) { if (this.requireSession() !== s) throw new Error('Sessão encerrada.') }
  async signOut() { const s=this.session; this.session=null; if (s) await this.request('/auth/v1/logout?scope=local',{token:s.token,method:'POST'}) }
  async switchProfile(mode) {
    const s=this.requireSession()
    if (!['ceo','pgm'].includes(mode)||s.user.profileMode!=='ceo'||!s.user.canTestPgm) throw new Error('Subperfil não autorizado.')
    if (mode==='pgm') {
      const rows=await this.request('/rest/v1/sispro_test_pgm_workspaces?select=user_id,active&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token})
      this.assertSession(s)
      if (!rows?.some(g=>g.user_id===s.uid&&g.active===true)) throw new Error('Subperfil PGM revogado.')
    }
    this.assertSession(s)
    this.session={...s,mode}
    return mode==='ceo'?s.user:{...s.user,role:'PGM',workspace:'Procuradoria de teste · PGM',sectorId:'pgm-test',sectorName:'Procuradoria de teste',sectorSigla:'PGM',profileMode:'pgm',accessLevel:4,isTestPgm:true}
  }
  workspaceTable(s) { return s.mode==='pgm'?'sispro_test_pgm_workspaces':'sispro_workspaces' }
  async read() {
    const s=this.requireSession()
    if(s.mode!=='pgm'){
      const result=await this.request('/rest/v1/rpc/sispro_read_workspace',{token:s.token,method:'POST',body:{}})
      this.assertSession(s)
      return {data:result.data,original:JSON.parse(JSON.stringify(result.data)),revision:result.revision,levels:result.levels,session:s}
    }
    const rows=await this.request('/rest/v1/'+this.workspaceTable(s)+'?select=data,revision&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token})
    this.assertSession(s)
    if (s.mode==='pgm'&&!rows?.length) throw new Error('Subperfil PGM revogado.')
    return { data:rows[0]?.data ?? {}, revision:rows[0]?.revision ?? null, session:s }
  }
  async write(state, data) {
    const s=state.session; this.assertSession(s)
    if(s.mode!=='pgm'){
      const changes=Object.fromEntries(Object.entries(data).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(state.original?.[k])))
      if(Object.keys(changes).length)await this.request('/rest/v1/rpc/sispro_write_workspace',{token:s.token,method:'POST',body:{expected_revision:state.revision,changes}})
      this.assertSession(s);return
    }
    const initial=state.revision===null
    if (s.mode==='pgm'&&initial) throw new Error('Subperfil PGM não autorizado.')
    const body=initial?{user_id:s.uid,data,revision:1}:{data,revision:state.revision+1}
    const path='/rest/v1/'+this.workspaceTable(s)+(initial?'':'?user_id=eq.'+encodeURIComponent(s.uid)+'&revision=eq.'+state.revision)
    const rows=await this.request(path,{token:s.token,method:initial?'POST':'PATCH',body,prefer:'return=representation'})
    this.assertSession(s)
    if (!Array.isArray(rows)||rows.length!==1) throw new Error('Conflito de gravação ou acesso negado. Recarregue e tente novamente.')
  }
  async savePermissions(changes) {
    const s=this.requireSession()
    if(s.mode!=='ceo') throw new Error('Acesso administrativo não autorizado.')
    if(!Array.isArray(changes)||!changes.length||changes.length>500||changes.some(p=>!p.role_id||!p.mechanic_id||!Number.isInteger(p.access_level)||p.access_level<0||p.access_level>3)) throw new Error('Permissões inválidas.')
    const body=changes.map(({role_id,mechanic_id,access_level})=>({role_id,mechanic_id,access_level}))
    const rows=await this.request('/rest/v1/sispro_permissions?on_conflict=role_id,mechanic_id',{token:s.token,method:'POST',body,prefer:'resolution=merge-duplicates,return=representation,missing=default'})
    this.assertSession(s)
    if(!Array.isArray(rows)||rows.length!==body.length) throw new Error('Não foi possível confirmar todas as permissões gravadas. Atualize a página.')
    return rows
  }
  async adminTable(table, row, id) {
    const s=this.requireSession()
    const allowed=['institutions','roles','sectors','cabinets','members','mechanics','permissions','institution_mechanics']
    if(s.mode!=='ceo'||!allowed.includes(table)) throw new Error('Acesso administrativo não autorizado.')
    const path='/rest/v1/sispro_'+table+(row?(id?'?id=eq.'+encodeURIComponent(id):''):'?select=*')
    const rows=await this.request(path,{token:s.token,method:row?(id?'PATCH':'POST'):'GET',body:row,prefer:row?'return=representation':undefined})
    this.assertSession(s)
    if(row&&rows?.length!==1) throw new Error('Gravação não autorizada.')
    return rows
  }
  async refreshAccess() {
    const s=this.requireSession()
    const profiles=await this.request('/rest/v1/sispro_profiles?select=user_id,active,role,platform_role&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token})
    this.assertSession(s)
    const p=profiles?.[0]
    if(!p?.active||(s.user.profileMode==='ceo'&&(p.role!=='admin'||p.platform_role!=='ceo'))) {const e=new Error('Sessão revogada.');e.status=403;throw e}
    if(s.mode==='pgm'){
      const rows=await this.request('/rest/v1/sispro_test_pgm_workspaces?select=user_id,active&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token})
      this.assertSession(s)
      if(!rows?.some(r=>r.active&&r.user_id===s.uid)){const e=new Error('Subperfil revogado.');e.status=403;throw e}
      return null
    }
    if(s.mode==='ceo')return null
    const result=await this.request('/rest/v1/rpc/sispro_read_workspace',{token:s.token,method:'POST',body:{}})
    this.assertSession(s)
    const levels=result.levels||{}
    if(JSON.stringify(levels)===JSON.stringify(s.user.levels))return null
    s.user={...s.user,levels}
    return s.user
  }
  async changePassword(currentPassword,newPassword) {
    const s=this.requireSession()
    if(typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128||newPassword===currentPassword) throw new Error('Escolha uma nova senha de 12 a 128 caracteres.')
    const verified=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:s.user.email,password:currentPassword}})
    if(verified?.user?.id!==s.uid||!verified.access_token) throw new Error('Não foi possível confirmar a identidade.')
    try {
      this.assertSession(s)
      await this.request('/auth/v1/user',{token:verified.access_token,method:'PUT',body:{password:newPassword}})
    } finally {
      this.session=null
      await this.request('/auth/v1/logout?scope=global',{token:verified.access_token,method:'POST'}).catch(()=>{})
    }
  }
  async manageAccount(body) {
    const s=this.requireSession()
    if(s.mode!=='ceo') throw new Error('Acesso administrativo não autorizado.')
    const result=await this.request('/functions/v1/sispro-ceo-accounts',{token:s.token,method:'POST',body})
    this.assertSession(s); return result
  }
  async listProfiles() {
    const s=this.requireSession()
    if(s.mode==='pgm') throw new Error('A gestão de contas institucionais ainda não está habilitada no teste PGM.')
    const rows=await this.request('/rest/v1/sispro_profiles?select=user_id,display_name,role,active,platform_role&order=display_name',{token:s.token})
    this.assertSession(s); return rows
  }
}
