# Sispro Connect — estudo de interoperabilidade judicial

Status: estudo futuro; nenhuma integração implementada ou homologada.

## Objetivo
Criar módulo independente de comunicação judicial para procuradorias, inicialmente com foco no TJES. Receber comunicações, localizar processos, baixar autos e documentos, sincronizar movimentações e, em fases posteriores, registrar ciência e protocolar petições mediante autorização explícita.

## Referências a investigar
- https://github.com/gestoricit/pje-mni-client — cliente MNI.
- https://github.com/fbmoulin/pje-download — download de autos/documentos.
- https://github.com/fbmoulin/Pje-MCP- — referência TJES.
- https://github.com/ma-serra/pje-mcp-server2 — referência TJBA.
- https://github.com/trf2-jus-br/balcaovirtual — referência institucional.
- https://github.com/fxbarros/MCP-PJe-TJPI — referência TJPI.
- https://github.com/andrecccruz/juris-br-mcp — DataJud/DJEN.

Referências levantadas na conversa; confirmar existência, licença, código, manutenção, funcionalidades e compatibilidade real antes de incorporar qualquer trecho. Consultar documentação oficial vigente do CNJ e TJES sobre MNI, Domicílio Judicial Eletrônico, DJEN, DataJud, credenciamento e autenticação. Não presumir que endpoints ou permissões estejam disponíveis.

## Arquitetura proposta
Adaptadores independentes por tribunal/canal; autenticação institucional segura; filas e sincronização idempotente; caixa de entrada de comunicações; integração com a árvore documental existente do Sispro; isolamento por procuradoria, permissões granulares e trilha de auditoria. DataJud para metadados públicos, não como fonte de autos integrais. Domicílio/DJEN conforme natureza e regras das comunicações; MNI/PJe para operações efetivamente autorizadas.

## Etapas
1. Auditar referências, licenças e documentação oficial; levantar requisitos de credenciamento TJES e certificados A1/A3 quando aplicáveis.
2. Definir contratos de adaptadores e simular respostas e falhas no Tribunal Simulado (aqnoeu/sispro-tribunaltest). Relacionar ao estudo de importação de PDF na branch feature/importacao-pdf-sispro daquele repositório.
3. Implementar consulta e download somente leitura, com dados sintéticos/anonimizados e homologação autorizada.
4. Implementar caixa de entrada, deduplicação, atualização incremental e distribuição conforme permissões.
5. Avaliar ciência e peticionamento separadamente: confirmação humana, registro de protocolo, controle de duplicidade, consequências jurídicas e testes autorizados; nunca disparar atos reais automaticamente durante testes.

## Critérios de segurança e aceite
Sem credenciais, certificados, senhas ou dados processuais reais no GitHub/logs; segregação de instituições; armazenamento seguro de segredos; nenhum teste em produção sem autorização; tratamento de indisponibilidade, expiração de credenciais e reprocessamento; validação de integridade dos documentos e rastreabilidade. Verificar regras de sigilo e LGPD. Preservar Sispro oficial e dados existentes. Não mesclar main nem publicar release antes de revisão e homologação.
