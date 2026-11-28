# Sispro Minutas — Formatação institucional e Groq opcional

Status: planejamento futuro; nenhuma implementação ou alteração em main.

## Decisão
Utilizar a skill Petições Judiciais PGM AMUR exclusivamente como referência estética, sem modificar o conteúdo jurídico. Recuperar e validar as regras originais da skill antes de convertê-las em código/templates DOCX. Preservar integralmente o texto, inclusive citações, pedidos e referências; não corrigir, resumir ou reescrever automaticamente. Aplicar fontes, margens, espaçamentos, estilos hierárquicos, cabeçalho, rodapé, destaques, recuos e numeração conforme padrão aprovado. Permitir revisão visual e exportação DOCX editável.

## Componentes
- Sispro Biblioteca: importar planilhas e peças, organizar tópicos, teses, legislação e jurisprudência; pesquisa e sugestões determinísticas de registros aprovados.
- Sispro Editor: montar petições com trechos selecionados pelo usuário, campos variáveis e sugestões do acervo. Revisão humana obrigatória; assinatura e protocolo separados.
- Sispro Format: aplicar padrão estético da skill por código, sem chamadas de IA e sem alteração textual.
- Groq opcional: classificar tópicos, teses e citações ambíguas que o código convencional não consiga resolver; retornar metadados estruturados e referências aos trechos originais, sem reescrever o texto. Avaliar GPT-OSS 20B/120B e modelos Qwen disponíveis na época da implementação, confirmando preços, limites e disponibilidade oficiais.

## Controle de custos e escala
Priorizar extração por estilos DOCX, padrões textuais, regex e pesquisa no banco. Analisar cada versão de peça uma vez, indexar e reutilizar resultados; cache por hash e versão do classificador, filas, limites por instituição, retentativas controladas e fallback manual/local. Não presumir que a franquia gratuita comporte a carga institucional. Medir tokens de entrada e saída, latência, qualidade e volume real; considerar 100 petições mensais por procurador e 500 por procurador de execução fiscal, com múltiplas revisões. A montagem, consulta ao acervo e formatação devem funcionar sem Groq e sem custo de API, inclusive em lote quando modelos aprovados e condições de aplicação estiverem disponíveis.

## Privacidade e homologação
Não transmitir autos ou dados sigilosos ao Groq sem autorização institucional, avaliação LGPD, minimização e confirmação das condições de retenção e transferência internacional. Segregar acervos e credenciais por instituição. Testar com material sintético/anonimizado; validar fidelidade textual antes/depois da formatação, estilos Word, classificação com evidências, pesquisa sem IA, limites de consumo e funcionamento offline da montagem/formatação. Revisar catálogo funcional e permissões por cargo. Não publicar release nem mesclar main antes de homologação.
