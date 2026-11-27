# Roteiro — Sistema Procuradorias

## Implementado no código até 1.0.18
- Login e demonstração isolada; navegação personalizável; identidade e Lucide.
- Processos e prazos locais; etiquetas de andamento, matéria, competência, gabinete e perfil; paleta e modos de exibição.
- Cartões em lista/grade; detalhes em diálogo; rota exclusiva de autos, importação PDF local (Windows), links existentes, busca, visualização e download.
- Configurações de integração Google Drive: estado não conectado, orientação de configuração.

## Próximas etapas
1. Validar CI e interface 1.0.18, testar importação, visualização, download e persistência Windows com arquivos fictícios.
2. Configurar Google Cloud: Drive API, OAuth desktop com PKCE e loopback, escopo drive.file, sem segredos no GitHub, armazenamento protegido de tokens. Não conectar na prévia pública.
3. Implementar provedor Drive: pasta institucional privada, pasta por processo, listagem, upload, download, tratamento de cotas e falhas; testar com conta institucional autorizada.
4. Melhorar gestão documental (tipos, datas, ordenação, pesquisa e auditoria); backup e restauração.
5. Autenticação real e permissões institucionais; avaliar SQLite e banco compartilhado quando necessário; revisão LGPD e segurança antes de dados reais.

## Prompt próximo passo
Valide a versão 1.0.18 do Sistema Procuradorias no GitHub aqnoeu/sispro, corrija erros de CI e teste a rota de autos, importação PDF, visualização, download e persistência com dados fictícios. Atualize o roteiro e apresente o próximo comando. Não publique dados reais nem credenciais.
