# Sistema Procuradorias

**Identidade visual oficial:** [manual de marca e regras de cores](docs/IDENTIDADE-VISUAL.md). As próximas revisões de interface devem seguir esse padrão.

Aplicativo Windows independente, derivado do código de interface AMUR-PGM. Base inicial vazia; não há conexão, credenciais, dependências, usuários ou dados do Firebase. O original não é alterado.

## Versão inicial 1.0.0

- Interface de painel, processos, prazos (inclusive lote), jurisprudência, agenda e perfil.
- Edição preliminar de usuário único, sem login próprio; o perfil do Windows é a fronteira de acesso. Não inclui gestão multiusuário e de setores, removida da interface por depender do modelo anterior de autenticação.
- Dados armazenados em `app.getPath('userData')/sipro-data.json`, fora dos arquivos instalados. No Windows, normalmente `%APPDATA%\SIPRO\sipro-data.json` (confirme o caminho real após instalar). Escrita atômica; não há sincronização, criptografia própria ou backup automático. Faça cópias de segurança com o aplicativo fechado e proteja o acesso à conta Windows. Não utilizar com dados reais ou sigilosos antes de validar a segurança, os fluxos e a recuperação de backup.
- O aplicativo consulta GitHub Releases no início e a cada seis horas enquanto estiver aberto; baixa a atualização disponível e a instala ao encerrar. Os dados locais não entram na release. O GitHub não hospeda a aplicação como site nem é usado como banco de dados. Links de documentos podem ser abertos explicitamente pelo usuário no navegador.

## Compilar em Windows

Node.js 22.12+ e Git. No PowerShell:

```powershell
npm install
npm test
npm run desktop
npm run dist:win
```

O instalador será gerado em `release/`. O arquivo de dependências lock não pôde ser gerado no ambiente original por indisponibilidade do registro npm. Após `npm install`, registre o `package-lock.json` para builds reproduzíveis.

## Publicar no GitHub

O repositório é `aqnoeu/sispro`. O feed de atualização foi configurado para releases públicas, sem token embutido. Se o código precisar permanecer privado, use outro repositório público exclusivo de releases e ajuste o feed e o workflow antes de distribuir; não coloque credenciais no app.

Na pasta extraída, após conferir a visibilidade e os arquivos:

```powershell
git init -b main
git add .
git commit -m "SIPRO 1.0.0 — edição local Windows"
git remote add origin https://github.com/aqnoeu/sispro.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

O workflow `.github/workflows/windows-release.yml` valida a versão, executa os testes, compila e publica os artefatos NSIS e metadados `latest.yml` para o atualizador. A tag precisa coincidir com a versão do `package.json`. Para futuras versões, incremente a versão, envie o commit e uma nova tag. Não inclua base local, logs, segredos ou arquivos de usuários no repositório. O instalador ainda não possui certificado de assinatura de código; configure assinatura Authenticode antes de distribuição institucional e valide a integridade do feed.

## Validação disponível

Teste automatizado do adaptador local (CRUD, consultas, lote, persistência e observação) aprovado no ambiente Node.js; sintaxe do renderer e arquivos Electron conferida. A compilação Vite, a geração NSIS, o teste de instalação no Windows e o teste de atualização entre duas versões ainda não foram executados. O repositório foi criado; confira a publicação e os resultados do workflow no GitHub.

## Versão 1.0.1 — entrada e prévia de perfis
A tela de entrada permite conhecer os dois perfis sem autenticação real. A demonstração usa armazenamento temporário em memória, separado do banco existente, e permite alternar perfis após sair. O acesso local original continua disponível. As telas administrativas de usuários e setores são prévias, não cadastro real. Não use esta versão como mecanismo de controle de acesso a dados sigilosos.

## Versão 1.0.2 — tela de login
Layout baseado no AMUR-PGM original (painel institucional e formulário). Identidade SIPRO, e-mails fictícios de demonstração e senha desabilitada até implementar autenticação local real. A base temporária dos dois perfis permanece separada do ambiente local existente.

## 1.0.3 — Identidade capixaba
Azul #0098D6, branco #FFFFFF e rosa #EF98BC; verde, amarelo e vermelho reservados a estados funcionais. Azul de contraste acessível para textos e áreas com texto branco. Nome comercial por extenso; identificador técnico, appId, repositório e diretório de dados preservados.
