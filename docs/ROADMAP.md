# Roteiro — Sistema Procuradorias

## Implementado
- 1.0.18: interface, perfis locais/demonstração, processos, prazos, etiquetas, cartões, detalhes e autos com PDFs locais. CI web e Windows aprovado, 10/10 testes.
- 1.0.19: OAuth desktop, PKCE, callback loopback, drive.file, credenciais e tokens protegidos, teste e desconexão. CI web e Windows aprovado, 13/13 testes.
- 1.0.20: provedor Drive no processo principal, pasta raiz e pasta por identificador local de processo, upload explícito de cópia de PDF, SHA-256 para deduplicação dentro da pasta, listagem sob demanda, recuperação autenticada, limite 25 MB, tratamento de falhas. Sem compartilhamento público, exclusão remota ou migração automática. Arquivos locais preservados. Testes simulados adicionados; CI a confirmar.
- A conta Drive é do dispositivo; perfis locais não constituem autenticação institucional. Pastas herdam permissões do Drive; não há garantia de isolamento entre procuradores. Deduplicação serial por dispositivo, não garantia transacional entre computadores.

## Próximas etapas
1. Confirmar CI 1.0.20 e testar no Windows com credencial OAuth desktop e conta de teste. Validar PDF fictício real, reinício, upload, listagem, download, duplicidade e offline. Verificar permissões e revogação.
2. Gestão documental: tipos, datas, linha do tempo, metadados, pesquisa, auditoria, backup e restauração.
3. Autenticação institucional e permissões efetivas; avaliar banco compartilhado; revisão LGPD antes de dados reais.

## Prompt próximo passo
Valide CI 1.0.20 e teste a integração Drive com arquivos fictícios, incluindo importação e visualização Windows, reinício, upload explícito, listagem, download, duplicidade e offline. Se não houver credencial autorizada ou Windows, registre a limitação e forneça roteiro de teste local. Avance na gestão documental com tipos, datas e linha do tempo. Atualize ROADMAP.md e apresente checklist e botão.
