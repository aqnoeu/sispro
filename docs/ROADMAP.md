# Roteiro — Sistema Procuradorias

## Implementado
- Até 1.0.18: interface, perfis locais/demonstração, processos, prazos, etiquetas, cartões, janela gerencial e autos com PDFs locais.
- CI 1.0.18: prévia e Windows aprovados; 10/10 testes passaram. Visualização real e reinício do Electron ainda pendentes.
- 1.0.19: OAuth desktop com PKCE S256, state, callback 127.0.0.1 em porta dinâmica, escopo drive.file, importação local de credencial, tokens cifrados via Electron safeStorage, teste da API about.get, renovação e revogação. Sem envio de documentos. Prévia e demonstração sem controles de conexão. O modelo de perfis local ainda não constitui autenticação institucional.
- Testes adicionais de PKCE, callback, credencial desktop e reabertura do armazenamento; execução CI 1.0.19 a confirmar.

## Próximas etapas
1. Confirmar CI 1.0.19, testar Windows real e autorização com conta institucional de teste e credencial OAuth desktop criada no Google Cloud (Drive API ativada).
2. Implementar provedor Drive: pasta privada do aplicativo, pastas por processo, upload explícito, listagem, download, deduplicação e tratamento de erros; preservar arquivos locais e não migrar automaticamente.
3. Gestão documental, auditoria, backup, autenticação institucional e revisão LGPD; avaliar banco compartilhado quando necessário.

## Prompt próximo passo
Valide CI 1.0.19 e implemente o provedor Google Drive para autos, mantendo o armazenamento local, upload explícito, escopo drive.file, pasta privada por processo, listagem e download autenticados no processo principal. Teste com mocks e, se houver credencial autorizada, conta de teste; não afirme teste real sem evidência. Atualize o roteiro e apresente checklist e próximo comando.
