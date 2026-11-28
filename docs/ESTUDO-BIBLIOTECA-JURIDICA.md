# Sispro Minutas — Biblioteca jurídica e montagem assistida

Status: proposta futura, priorizada antes da geração por IA. Nenhum código funcional alterado.

## Motivação
O usuário já mantém planilha de teses reutilizáveis e adapta os trechos ao caso. Transformar esse fluxo em acervo pesquisável integrado ao editor, reduzindo chamadas pagas e permitindo trabalhar sem IA generativa.

## Fase 1 — Acervo e importação
- Importar planilhas XLSX/CSV com mapeamento de colunas, prévia, deduplicação e confirmação; permitir cadastro e edição manual.
- Importar DOCX/PDF autorizados, mantendo vínculo com fonte, página/trecho, autoria, instituição e versão. Usar estilos de título, numeração, parágrafos e padrões de citação para sugerir separação de tópicos, teses, jurisprudência, legislação e pedidos.
- Reconhecer citações por padrões de tribunal, classe/número, temas, súmulas, artigos e leis; manter o texto original e sinalizar citações incompletas. Não presumir validade ou pertinência. Separação semântica de teses e trechos variáveis exige revisão humana ou auxílio opcional de IA local.
- Cada registro contém tipo, título, texto aprovado, tags, matéria, subtópicos, tipos de peça, condições de aplicação, contraindicações, fontes, data de revisão, status e vínculo tese-jurisprudência. Distinguir citações encontradas, aprovadas, desatualizadas e revogadas; aprovação por usuário autorizado não substitui verificação jurídica.

## Fase 2 — Pesquisa e aconselhamento determinístico
- Editor com painel de pesquisa/autocomplete: digitar 'jurisprudência', 'tese', tema ou palavra-chave e listar registros do próprio acervo autorizados. Pesquisar texto integral, termos normalizados, sinônimos cadastrados, filtros e relações entre teses e precedentes.
- Ordenar sugestões por tipo de peça, matéria, palavras-chave, tags e relações explícitas; explicar por que um resultado foi sugerido. Priorizar registros aprovados e revisados, sem declarar aplicabilidade automaticamente. Permitir busca manual e inserção de trechos selecionados com referências.
- Ao selecionar uma tese, sugerir precedentes e dispositivos vinculados, e vice-versa. Não inventar citações nem acessar outros acervos sem autorização.
- Estruturas de peças versionadas, com tópicos opcionais e campos variáveis; montar DOCX com template institucional sem uso obrigatório de IA. Preservar revisão humana e edição livre; não assinar/protocolar automaticamente.

## Fase 3 — IA opcional
Apenas para classificação semântica difícil, extração ambígua, sugestões de similaridade ou adaptação de fatos/redação quando solicitada. Indexar uma vez e reutilizar. Medir custo e qualidade antes de decidir provedor; priorizar local quando viável. Sem envio de dados sigilosos sem autorização.

## Segurança e critérios de aceite
Segregação por instituição e escopo, permissões granulares para cadastrar, aprovar, revisar, consultar e inserir; rastreabilidade de versões e fontes. Testar importação de planilha, reconhecimento de títulos/citações com variações, revisão manual, pesquisa sem IA, recomendações explicáveis, inserção em minuta e DOCX, prevenção de vazamento entre processos/instituições. Nenhuma alteração em main ou release antes de homologação.
