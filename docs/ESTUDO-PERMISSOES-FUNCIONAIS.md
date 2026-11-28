# Sispro — Catálogo de funções e permissões por cargo

Status: planejamento futuro. Nenhuma alteração funcional realizada.

## Premissa
Antes de reformular os níveis de acesso, definir e catalogar as funções efetivamente disponíveis no Sispro. Acesso a uma página ou módulo não equivale à autorização para executar todas as ações nele contidas.

## Fase 1 — Inventário e definição funcional (pré-requisito)
- Auditar módulos, telas, botões, menus, ações, APIs, operações no banco e fluxos existentes, distinguindo funcionalidades implementadas, planejadas e incompletas.
- Definir cada função de negócio com identificador estável, nome, descrição, módulo, entradas, resultados, pré-condições, efeitos, estados permitidos, dependências, riscos e escopo institucional.
- Separar ações de leitura, criação, edição, exclusão, elaboração/revisão de minuta, encaminhamento para assinatura, assinatura, tramitação interna, distribuição e protocolo externo; não confundir tramitação com assinatura ou peticionamento.
- Validar o catálogo com o usuário antes de implementar o novo modelo. Não inventar funcionalidades ou atribuições como se já estivessem aprovadas.

## Fase 2 — Modelo de autorização
- Instituição define módulos habilitados e cargos configuráveis. Ao habilitar um módulo, listar todas as funções catalogadas correspondentes para atribuição granular aos cargos.
- Cargo determina quais ações são permitidas; nível de acesso e lotação determinam abrangência (próprio usuário, gabinete, setor, instituição, conforme política validada). Permissão efetiva exige módulo habilitado, ação autorizada, escopo permitido e pré-condições válidas.
- Exemplo ilustrativo: estagiário pode visualizar autos, ler documentos, elaborar minutas, encaminhar e tramitar internamente quando autorizado; assinatura jurídica reservada ao procurador legalmente habilitado. Protocolar, distribuir, excluir e demais ações devem ter permissões próprias. Restrições legais não podem ser contornadas por configuração de cargo.
- Negação por padrão, segregação entre instituições, proteção contra elevação indevida de privilégios. Definir regra explícita para múltiplos cargos e conflitos antes da implementação.

## Fase 3 — Interface e aplicação efetiva
- Painel administrativo de funções agrupadas por módulo e cargo, com descrição clara, seleção individual e visualização de permissões efetivas.
- Adaptar interface para mostrar ações disponíveis, mas validar toda operação também no backend e banco/RLS, sem confiar no cliente. Auditar alterações de permissões, assinatura, protocolo e demais atos sensíveis.
- Mapear níveis existentes e migrar de maneira segura, preservando dados e usuários sem ampliação automática de privilégios; prever reversão e testes de regressão.

## Homologação
Testar perfis fictícios, mesma tela com ações distintas, tentativas diretas de API não autorizadas, isolamento entre instituições e gabinetes, fluxo minuta → revisão → assinatura por agente competente, tramitação interna e revogação de permissões. Usar ambiente de teste e Tribunal Simulado quando pertinente. Não alterar main, publicar release ou modificar dados reais antes de revisão e homologação.

## Critério de conclusão da etapa inicial
Catálogo funcional completo, validado pelo usuário, com responsabilidades e regras de cada ação suficientemente definidas para construir a matriz de permissões. Somente então iniciar a reformulação de autorização.
