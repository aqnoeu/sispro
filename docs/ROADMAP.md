# Roteiro — Sistema Procuradorias

## Implementado
- 1.0.18: interface, perfis locais/demonstração, processos, prazos, etiquetas, cartões, detalhes e autos com PDFs locais. CI web e Windows aprovado, 10/10 testes.
- 1.0.19: OAuth desktop, PKCE, callback loopback, drive.file, credenciais e tokens protegidos. CI web e Windows aprovado, 13/13 testes.
- 1.0.20: provedor Drive, pastas por processo, envio explícito, SHA-256, listagem e recuperação. CI web e Windows aprovado, 15/15 testes, incluindo API simulada. Sem teste real da conta Google ou Windows interativo.
- 1.0.21: linha do tempo, tipo editável, data de juntada explicitamente informada, ID externo opcional e ID interno, busca por nome/tipo/ID, filtros de origem, tipo e intervalo, ordenação cronológica. Metadados no banco local por processo e identificador de documento; não sincronizados com Drive. Datas legadas são referência/armazenamento, não juntada judicial confirmada. Novos testes adicionados; CI a confirmar.
- Conta Drive vinculada ao dispositivo; permissões herdadas do Drive. Perfis locais não equivalem a autenticação institucional. Não usar dados reais antes de revisão de segurança/LGPD. Deduplicação serial por dispositivo, não transacional entre computadores.

## Próximas etapas
1. Confirmar CI 1.0.21 e validar Windows com credencial OAuth desktop e conta de teste, importação de PDF fictício, visualização, reinício, upload, listagem, download, duplicidade e offline. Testar metadados e filtros.
2. Registro de alterações documentais local (auditoria operacional), backup e restauração dos arquivos e metadados, sem incluir tokens OAuth no backup.
3. Autenticação institucional real, permissões efetivas, avaliação de banco compartilhado e revisão LGPD.

## Prompt próximo passo
Valide CI 1.0.21, corrija falhas e execute os testes disponíveis. Implemente histórico de alterações documentais e backup/restauração local de arquivos e metadados, com confirmação, validação de integridade e sem incluir tokens OAuth. Preserve os arquivos do Drive e a identidade visual. Se não houver credencial autorizada ou Windows interativo, registre a limitação. Atualize ROADMAP.md, publique a versão e apresente checklist e botão de próximo passo.

## Web — etapa de autenticação
- Branch de integração: modo web independente, autenticação Supabase por e-mail/senha, perfis autorizados, sessão em memória, RLS proposta, persistência isolada por conta com revisão otimista. SQL preparado; não aplicado até existir projeto dedicado. Ver docs/SISPRO-WEB.md.
- Próximo: provisionar Supabase dedicado mediante confirmação da organização/custo; aplicar e verificar políticas, configurar variáveis Vercel e usuários fictícios; testar login e isolamento real antes de promoção.

## Homologação Supabase — 27/11/2026
- Projeto exclusivo sispro na organização homehub, região São Paulo (sa-east-1), custo de criação cotado US$ 0/mês; status ACTIVE_HEALTHY.
- Migração sispro_web_auth_rls aplicada. Security Advisor: zero alertas retornados no momento da consulta.
- Banco real: teste SQL transacional com três identidades fictícias e role authenticated/anon simulando claims JWT. Aprovados: leitura isolada, escrita própria, bloqueio de atualização e inserção cruzadas, bloqueio de autopromoção, admin lê perfis mas não dados alheios, desativação revoga acesso, bloqueio anônimo e conflito de revisão. Rollback confirmado: zero contas de teste, perfis e workspaces restantes.
- Vercel: URL e chave publicável configuradas exclusivamente em preview da branch sispro-web-auth; nenhuma chave privilegiada no código. Deploy anterior da branch READY com 23/23 testes (5 novos com API simulada). Novo deploy conectado deve ser verificado.
- Pendências impeditivas de produção: desabilitar cadastro público e acesso anônimo no Auth Dashboard; criar contas fictícias pelo Auth Admin; verificar login, logout e RLS pela API com JWT real, revisar MFA, segurança e backup. Ferramentas disponíveis não expõem administração Auth; acesso HTTP direto do ambiente falhou por DNS. Teste SQL não equivale a autenticação HTTP real. Não promover produção nem importar dados jurídicos reais.

## Auth — etapa de homologação
- Deploy e2a8c77 READY na Vercel: 23/23 testes, modo web. Banco dedicado ACTIVE_HEALTHY.
- Preparado scripts/auth-smoke.mjs (API HTTP real, verificação pública e modo de três contas descartáveis) e docs/SISPRO-AUTH-HOMOLOGACAO.md (configuração de cadastro, primeira conta administrativa, MFA e limpeza). Nenhuma credencial privada no código.
- A administração Auth não está disponível nas ferramentas conectadas; não alterar auth.users diretamente para criar contas reais. Ainda é necessário desabilitar cadastro/anônimo no painel, criar identidades autorizadas e executar o teste com JWT real. Não promover produção. A sessão JWT de acesso pode sobreviver ao logout até expirar; avaliar controle session_id e MFA antes de dados reais.

- Deploy 3b6903b READY: 23/23 testes e smoke HTTP real via Vercel. Auth settings acessível, leitura sem autenticação bloqueada e login inválido rejeitado. `disable_signup=false`; estado de login anônimo não retornado no endpoint. Cadastro público ainda precisa ser desligado no painel.
- Migração sispro_deny_anonymous_jwt aplicada: políticas restritivas negam JWT anônimo mesmo com perfil ativo de administrador. Teste transacional com claims simuladas aprovado; conta fictícia revertida. SQL em supabase/schema/sispro-deny-anonymous-jwt.sql. Não equivale a desabilitar criação de contas no Auth.
- Primeira conta administrativa, login válido, logout real e isolamento com JWT emitido permanecem pendentes. Manter produção sem promoção. MFA TOTP recomendado com AAL2 obrigatório para operações sensíveis, ainda não implementado.
