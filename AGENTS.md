# Orientações do projeto

- Nome comercial: Sistema Procuradorias (por extenso).
- Para qualquer alteração de interface, leia [docs/IDENTIDADE-VISUAL.md](docs/IDENTIDADE-VISUAL.md) e siga a identidade aprovada.
- Rosa exclusivamente decorativo; não usar em ações ou estados. Verde, amarelo e vermelho exclusivamente funcionais.
- Preservar identificadores técnicos e dados locais; não introduzir Firebase nem publicar registros de usuários.
- Alterações da identidade oficial exigem aprovação expressa. Diferenciar documentação aprovada de conformidade visual efetivamente verificada.

- A prévia pública do GitHub Pages deve usar exclusivamente dados inventados em memória; nunca publicar dados reais, credenciais ou banco local. Preservar o build Windows independente.

- Preservar escolhas de navegação e regras de qualidade visual da seção 7 do manual. Verificar ícones, textos, botões e responsividade em ambos os perfis.

- Ao finalizar cada implementação, apresentar checklist do feito (distinguir código, testes e publicação) e pendências, com comando pronto de próximo passo. Atualizar docs/ROADMAP.md. Não afirmar integração real sem teste.

## Versionamento obrigatório

- Em toda atualização de código, configuração, banco ou funcionalidade destinada à versão oficial, incrementar a versão numérica de `package.json` antes do commit de publicação. Nunca republicar alterações usando o mesmo número.
- Usar versionamento semântico `MAJOR.MINOR.PATCH`: incrementar PATCH para correções e ajustes, MINOR para novas funcionalidades relevantes e MAJOR para mudanças incompatíveis. Não reduzir nem reutilizar versões publicadas.
- Manter a mesma versão de origem no site oficial, na prévia e no instalador Windows, incluindo metadados de atualização automática. Conferir se a interface exibe o número correto e se a release corresponde ao commit publicado.
- Registrar a versão e as alterações em `docs/ROADMAP.md`, informar o número ao responsável e distinguir deployment web, CI e release Windows efetivamente confirmados. Não declarar release publicada antes da verificação.

## Procuradoria de Teste na versão oficial
- A Procuradoria de Teste autenticada deve ter a mesma apresentação visual e os mesmos fluxos operacionais das demais procuradorias. Não inserir faixas, avisos permanentes de homologação ou elementos de demonstração no espaço de trabalho autenticado. Preservar a identificação institucional normal, o isolamento dos registros, as permissões e os avisos necessários em operações específicas. A prévia pública continua separada e identificada como demonstração.

- Cabeçalho autenticado: manter apenas identificação do usuário com menu Perfil, Configurações e Sair; botão de alternância CEO/PGM exclusivamente para perfis autorizados, representado por ícone. Não exibir indicador de armazenamento ou botão Sair permanente no cabeçalho.
