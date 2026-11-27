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
