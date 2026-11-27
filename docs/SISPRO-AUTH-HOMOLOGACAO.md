# Homologação Auth — Sispro
Somente o projeto dedicado sispro, em São Paulo. Não promover antes da aprovação.
## Configuração obrigatória (painel Supabase)
1. Authentication > Providers / Sign In: desativar Allow new users to sign up e Allow anonymous sign-ins; manter Email/password habilitado, outros provedores não utilizados desabilitados.
2. Authentication > Users > Add user > Create new user. Criar a primeira conta administrativa com e-mail confirmado pelo proprietário e senha forte definida privadamente no painel; nunca compartilhar senha por chat ou GitHub. Não cadastrar o administrador real até finalizar homologação.
3. Copiar o UUID exato do usuário criado. No SQL Editor do projeto dedicado, executar (substituir o UUID pelo real, não usar e-mail como autorização):
```sql
insert into public.sispro_profiles(user_id,display_name,role,active)
values ('UUID-DO-USUARIO'::uuid,'Administrador','admin',true);
```
Para os testes, criar três contas descartáveis A, B e ADMIN usando endereços únicos com domínio example.invalid (criação administrativa com confirmação explícita; não enviar e-mail), senhas distintas e perfis ativos, A/B com role user e ADMIN com role admin. Não reutilizar contas reais.
## Testes API reais
Node 22+. Configurar VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY usando somente chave publicável do painel. Executar node scripts/auth-smoke.mjs para verificar endpoints públicos. Para teste completo, configurar no terminal local SISPRO_A_EMAIL, SISPRO_A_PASSWORD, SISPRO_B_EMAIL, SISPRO_B_PASSWORD, SISPRO_ADMIN_EMAIL e SISPRO_ADMIN_PASSWORD; não gravar arquivos .env no Git, não executar com tracing, não usar senhas reais. Executar node scripts/auth-smoke.mjs --accounts. O script exige três contas distintas, workspaces vazios, e verifica JWT via endpoint /user, RLS, logout e revogação do refresh token. Após a execução, remover os workspaces e perfis das três contas fictícias pelo SQL Editor usando UUIDs exatos, e depois excluir as contas pelo painel Auth. Limpar variáveis locais. Não excluir nenhum usuário real. O JWT de acesso pode continuar válido até expirar após logout; para dados jurídicos, avaliar e testar checagem de session_id no banco.
## MFA
Recomendada TOTP obrigatória para administrador e, idealmente, todos os usuários antes de dados reais. Implementar enrollment/challenge/verify na UI, testar recuperação e exigir aal2 no backend/RLS para operações sensíveis. Ativar apenas o provedor MFA não garante sua exigência. A atual UI não implementa MFA. Referência: https://supabase.com/docs/guides/auth/auth-mfa.
