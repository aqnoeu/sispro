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


## Web oficial — administração CEO
- Migração administrativa aplicada no Supabase existente: instituições, cargos, membros, setores, gabinetes, catálogo e permissões. RLS restrito ao CEO ativo. Procuradoria de Teste cadastrada. Cadastro Auth, painel e aplicação das permissões aos módulos ainda pendentes; não usar dados reais até validação.

- Integração do código web-auth à main e painel CEO para CRUD administrativo via RLS. Vincula contas Auth existentes; criação de credenciais e aplicação de níveis aos módulos jurídicos ainda pendentes. Testes e deployment a confirmar.

- Commit 98deb8a: Vercel production READY, CI web e Windows success. Edge Function sispro-ceo-accounts ativa, UI de contas e catálogo completo de mecânicas por instituição. CEO confirma titularidade do e-mail e define senha inicial (mín. 12 caracteres); troca de senha pelo titular e testes reais pendentes. Revogação via perfil ativo/RLS; validar sessões abertas. Permissões dos módulos jurídicos ainda pendentes; não usar dados reais antes de validação.

- Proteção conservadora do JSONB aplicada: leitura integral exige acesso de leitura a todas as mecânicas do catálogo; gravação integral exige edição de todas. CEO preservado. Acesso granular filtrado por coleção ainda necessário. Perfil web recebe troca de senha mediante confirmação da senha atual e tentativa de logout global; revogação de JWT já emitido ainda precisa de teste. Sem teste real de senha/contas nesta etapa.

- RPC granular para workspace individual: leitura filtrada e escrita por coleções alteradas, revisão otimista; acesso direto ao JSON integral revogado. PGM mantém caminho isolado. Mapeamento inicial explícito (processos, prazos, agenda, autosMetadata, etiquetas); demais coleções bloqueadas para não CEO até inventário. Testes de sessão, navegação e publicação pendentes.

- Mapeamento de jurisprudência e usuários aplicado no banco oficial e conferido. Níveis do RPC carregados no login de usuário comum; menus e rotas filtrados, administração institucional ainda restrita ao CEO. Cadastro individual de prazo usa o mesmo batch atômico do cadastro em lote (atomicidade por prazo, não por lote inteiro); backend valida todas as coleções modificadas. Testes unitários dos quatro níveis adicionados. Botões específicos por página, testes de API com contas reais e atualização dinâmica de permissões durante sessão pendentes.

- Commit 2e9d2d1 Vercel READY; CI ainda na fila quando consultado. SQL session_valid exige sessão Auth ativa e invalida sessões anteriores à revogação mesmo após reativação. Exclusão de documentos inteiros exige nível 3. Teste SQL transacional dos níveis 0–3 e revogação aprovado; nenhuma conta real usada. Edge CEO v2 consulta perfil sob JWT do solicitante. Atualização de permissões a cada 30 s, controles principais de edição e exclusão condicionados; inventário completo de ações e testes reais de Auth/HTTP pendentes. Plano gratuito mantido.

- 2e9d2d1: Vercel READY, CI web/Windows success. Trigger de troca de senha em auth.users invalida sessões anteriores pelo marco de revogação; teste transacional com conta fictícia aprovado. Teste SQL reprodutível incluído. Avisos do advisor: dois RPC SECURITY DEFINER intencionais (revisar arquitetura) e proteção de senhas vazadas desativada. HTTP real bloqueado por DNS no ambiente de execução; testes Auth reais e auditoria de todos os controles ainda pendentes.

- 0e44b0c confirmado READY e CI web/Windows success. RPCs privilegiadas movidas para sispro_private com wrappers invoker; regressão SQL aprovada, advisor restou apenas proteção de senhas vazadas (Pro). Restrições de consulta/edição/exclusão no detalhe de jurisprudência e atalhos do dashboard; edições de processo e prazo agrupadas em uma transação, exigem edição de ambos devido à sincronização. Autenticação real HTTP e teste visual CEO/PGM pendentes (DNS indisponível no ambiente); sem alterações em contas existentes ou plano.

- e8dddff: Vercel READY, CI web/Windows success, 34/34 testes web. HTTP 200 oficial. Corrigido descarte de estado da interface ao mudar níveis (remontagem do Workspace), identificação explícita de edição no painel e mensagem antiga de permissões. Acrescentados testes unitários de refresh, CEO/PGM e troca de senha; workflow Chromium sobre URL oficial com fixtures interceptadas e smoke público sem autenticação. Não são logins reais; nenhum dado fictício persistido. Navegador conectado indisponível e DNS do container bloqueado, homologação autenticada real ainda pendente. Nenhuma migração repetida, plano gratuito sem alteração.

- CEO: interface separada em administração interna, procuradorias, credenciais globais e catálogo global; seleção e CRUD institucional usam o escopo escolhido. Procuradoria de Teste: habilitadas 8/8 mecânicas, adicionados setor/gabinete fictícios e quatro cargos de homologação com 32 permissões (níveis 0–3), conferidos via SQL no projeto oficial. Nenhuma conta criada nem registro de outra instituição alterado. O subperfil PGM continua isolado; cadastro institucional via CEO, gestão de usuários pelo PGM e logins reais dos quatro níveis ainda pendentes. Fixture Chromium adaptada; CI e deployment a confirmar.

- Revisão a pedido do responsável: removidos somente os quatro cargos de homologação sem vínculo e suas 32 permissões. Cargo original Procurador mantido, vinculado ao CEO com subperfil de teste ativo e nível 3 nas oito mecânicas; conferido no banco oficial. Inclusão de exclusão transacional de cargos de teste via RPC restrito ao CEO com sessão válida; impede excluir cargos vinculados e instituições não-testes. Cadastros de outros cargos ficam a critério do responsável. CI/deployment e teste de navegador a confirmar.
