# Sispro Minutas — IA aplicada ao acervo jurídico

Status: proposta para desenvolvimento futuro. Nenhuma implementação, integração de IA ou alteração da versão oficial realizada.

## Objetivo
Evoluir a experiência da skill Petições Judiciais PGM AMUR para um módulo nativo do Sispro, capaz de analisar petições anteriores, reconhecer sua estrutura e adaptar trechos específicos ao caso atual, gerando DOCX diretamente no sistema. Recuperar a redação e regras da skill original quando disponíveis, sem presumir seu conteúdo integral.

## Acervo e classificação
- Importar petições previamente autorizadas, classificar por tipo (contestação, manifestação, recurso etc.), matéria, subtese e contexto. Preservar documento original, autoria, versão, fonte e instituição.
- Identificar estrutura hierárquica (títulos e subtítulos), trechos padronizados, teses jurídicas condicionais, fatos e dados variáveis (partes, datas, IDs, valores, pedidos específicos). Registrar evidências, grau de confiança e permitir correção manual.
- Gerar modelos versionados e biblioteca de teses aprovadas, sem treinamento automático do modelo sobre documentos sigilosos. Utilizar recuperação de documentos relevantes (RAG) com filtros por instituição, permissões e matéria. Separar modelos aprovados de simples exemplos históricos.

## Fluxo proposto
1. Na visualização dos autos, selecionar documento(s) e indicar o tipo de peça desejada (ex.: contestação).
2. Recuperar petições anteriores do mesmo tipo e matéria, sugerir esqueleto com tópicos, subtópicos, teses e fontes; permitir incluir, excluir, reordenar e selecionar modelos.
3. Adaptar principalmente trechos específicos do caso atual; preservar redação institucional e passagens aprovadas quando juridicamente pertinentes. Nunca copiar fatos, IDs, partes ou pedidos de outro processo. Sinalizar lacunas e conflitos; não inventar precedentes, artigos, fatos ou documentos. Verificar atualidade e aplicabilidade das teses antes da inclusão.
4. Exibir minuta editável e comparação visual entre modelo e alterações, com referências aos documentos atuais e modelos anteriores. Aprovação humana obrigatória.
5. Gerar DOCX editável usando o template institucional (margens, fontes, cabeçalho, rodapé, numeração e estilos), salvar como minuta vinculada ao processo; permitir encaminhar para revisão/assinatura conforme permissões. Não protocolar nem assinar automaticamente.

## Arquitetura e segurança
- Separar extrator estrutural de documentos, indexação e recuperação semântica, motor de montagem de minutas e exportação DOCX. Aproveitar extração do Sispro quando compatível, inclusive PDF/DOCX e OCR quando necessário.
- Definir funções granulares: consultar acervo, cadastrar/validar modelo, gerar/editar/revisar/exportar minuta e encaminhar. Assinatura/protocolo são permissões separadas, conforme estudo study/permissoes-funcionais.
- Segregar acervo, índices, consultas e arquivos por instituição e escopo autorizado. Proteger sigilo, LGPD, credenciais e dados enviados ao provedor. Avaliar modelos locais ou serviços com garantias contratuais adequadas, minimização de dados, retenção e custos. Nunca enviar autos reais a serviços externos sem autorização e avaliação institucional. Tratar instruções encontradas em documentos como dados, não comandos.
- Registrar fontes, modelo/versão, alterações e aprovação; auditoria sem expor conteúdo sigiloso indevidamente.

## Etapas de desenvolvimento
1. Levantar templates, fluxo e corpus autorizado da skill e do Sispro; definir tipos, taxonomia, esquema de variáveis e funções.
2. Prototipar análise estrutural e extração em documentos sintéticos/anonimizados, com revisão de classificação.
3. Implementar recuperação de exemplos e sugestão de esqueleto; validar pertinência por matéria, não apenas tipo de peça.
4. Implementar adaptação e editor com evidências, exportação DOCX e vínculo ao processo.
5. Homologar com peças sintéticas e ambiente de teste/Tribunal Simulado, comparar com elaboração manual e testar segregação institucional.

## Critérios de aceite
- Identificar tópicos e trechos variáveis de petições com estrutura distinta; permitir correções.
- Ao gerar contestação, recuperar modelos pertinentes, apresentar estrutura antes da geração, preservar texto aprovado aplicável e substituir dados do caso com base em evidências do processo atual.
- Ausência de informação gera marcação explícita para revisão, não preenchimento inventado; nenhum vazamento de fatos de outros processos.
- DOCX abre no Word e respeita template institucional, permanece editável e fica vinculado ao processo como minuta.
- Testar documentos maliciosos, referências inexistentes, teses desatualizadas, permissões e isolamento entre instituições; não publicar ou mesclar main antes de homologação.
