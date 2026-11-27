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
      const message = passwordGrant && code === 'invalid_credentials' ? 'E-mail ou senha incorretos.' : passwordGrant && code === 'email_not_confirmed' ? 'Confirme seu e-mail antes de entrar.' : response.status === 429 ? 'Muitas tentativas. Aguarde alguns instantes e tente novamente.' : response.status === 409 ? 'Conflito de gravação. Recarregue e tente novamente.' : response.status === 401 || response.status === 403 ? 'Acesso não autorizado ou sessão expirada.' : 'Não foi possível concluir a operação no servidor.'
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
      const rows = await this.request('/rest/v1/sispro_profiles?select=user_id,display_name,role,active&user_id=eq.' + encodeURIComponent(s.uid), { token:s.token })
      const p = rows?.[0]
      if (!p || p.user_id !== s.uid || !p.active || !['user','admin'].includes(p.role)) throw new Error('Conta sem autorização no Sispro.')
      this.session = s
      return { uid:s.uid, email:auth.user.email, displayName:p.display_name, isAdmin:p.role==='admin', role:p.role==='admin'?'Administrador':'Usuário', workspace:'Sispro Web', sectorId:'web', sectorName:'Ambiente individual', sectorSigla:'WEB', isCloud:true }
    } catch (e) { try { await this.request('/auth/v1/logout?scope=local',{token:s.token,method:'POST'}) } catch { /* session discarded */ } throw e }
  }
  requireSession() { const s=this.session; if (!s || s.expires <= Date.now()) throw new Error('Sessão expirada. Entre novamente.'); return s }
  assertSession(s) { if (this.requireSession() !== s) throw new Error('Sessão encerrada.') }
  async signOut() { const s=this.session; this.session=null; if (s) await this.request('/auth/v1/logout?scope=local',{token:s.token,method:'POST'}) }
  async read() {
    const s=this.requireSession()
    const rows=await this.request('/rest/v1/sispro_workspaces?select=data,revision&user_id=eq.'+encodeURIComponent(s.uid),{token:s.token})
    this.assertSession(s)
    return { data:rows[0]?.data ?? {}, revision:rows[0]?.revision ?? null, session:s }
  }
  async write(state, data) {
    const s=state.session; this.assertSession(s)
    const initial=state.revision===null
    const body=initial?{user_id:s.uid,data,revision:1}:{data,revision:state.revision+1}
    const path='/rest/v1/sispro_workspaces'+(initial?'':'?user_id=eq.'+encodeURIComponent(s.uid)+'&revision=eq.'+state.revision)
    const rows=await this.request(path,{token:s.token,method:initial?'POST':'PATCH',body,prefer:'return=representation'})
    this.assertSession(s)
    if (!Array.isArray(rows)||rows.length!==1) throw new Error('Conflito de gravação ou acesso negado. Recarregue e tente novamente.')
  }
  async listProfiles() {
    const s=this.requireSession()
    const rows=await this.request('/rest/v1/sispro_profiles?select=user_id,display_name,role,active&order=display_name',{token:s.token})
    this.assertSession(s); return rows
  }
}
