// Preserve the restrictive offline policy; only the dedicated Web backend is allowed.
export const SISPRO_ORIGIN = 'https://ntvxipvivhhjaebnnvcq.supabase.co'
export function applyConnectionPolicy(html, mode) {
  const policy = "connect-src 'none'"
  if (!html.includes(policy) || html.split(policy).length !== 2) throw new Error('SIPRO CSP baseline missing or ambiguous')
  return mode === 'web' ? html.replace(policy, 'connect-src ' + SISPRO_ORIGIN) : html
}
