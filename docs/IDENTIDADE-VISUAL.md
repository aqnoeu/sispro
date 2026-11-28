# Sistema Procuradorias — Identidade visual oficial

**Status:** aprovado pelo responsável do projeto em 27/11/2026. Este documento é a referência normativa para novas telas e revisões de design. A implementação será aperfeiçoada progressivamente; a aprovação da identidade não equivale à validação de todas as telas existentes.

## 1. Marca
O nome comercial é **Sistema Procuradorias**, sempre por extenso. Não usar SIPRO, SISPRO ou SISPROC como marca ou abreviação comercial. O repositório e identificadores técnicos históricos podem permanecer inalterados por compatibilidade com atualizações e dados locais. A identidade é inspirada nas cores da bandeira do Espírito Santo, sem pretensão de reproduzir uma especificação cromática oficial da bandeira. Preservar o símbolo radial aprovado; não substituir por outros símbolos. Em fundos azuis ou escuros, usar o símbolo integralmente branco, sem fundo; em fundos claros, usar a versão azul aprovada.

## 2. Paleta oficial
| Papel | Cor | Hex |
|---|---|---|
| Azul capixaba — principal | Azul | `#0098D6` |
| Superfície | Branco | `#FFFFFF` |
| Contraste decorativo | Rosa capixaba | `#EF98BC` |
| Azul suave | Azul claro | `#DDF2FC` |
| Rosa suave | Rosa claro | `#FCE7F0` |
| Fundo neutro | Branco azulado | `#F5F9FC` |
| Texto principal | Azul escuro | `#16324F` |
| Azul de contraste para textos/controles | Azul | `#006B9A` |

A interface deve ser leve, viva e arejada, com espaços livres, superfícies brancas e azul predominante. Evitar cabeçalhos azul-marinho pesados. A referência de proporção visual é aproximadamente 65% neutros, 30% azul e até 5% rosa; trata-se de orientação estética, não de medição obrigatória de cada tela.

## 3. Uso do rosa
- Uso exclusivamente decorativo, com parcimônia: detalhes gráficos pequenos, curvas e gradientes suaves, principalmente em áreas institucionais sem significado operacional.
- Não usar rosa para urgência, erro, alerta, prazos, confirmação, seleção, foco, botões de ação, etiquetas de estado ou destaque de registros.
- Não usar grandes cartões preenchidos em rosa nem rosa como cor dominante. Preferir a versão suave ou baixa opacidade.
- Caso haja risco de interpretação como alerta, omitir o rosa. Ele não é obrigatório em todas as telas.

## 4. Cores funcionais (fora da identidade de marca)
| Estado | Referência visual |
|---|---|
| Sucesso, confirmação | Verde `#16834B` |
| Atenção | Amarelo/dourado `#B58116` |
| Erro, urgência | Vermelho `#D32F2F` |

Usar pontualmente em ícones, marcadores e etiquetas de status com texto explícito. Não comunicar estados apenas por cor. Ajustar contraste quando necessário, especialmente texto pequeno e controles; buscar WCAG AA (4,5:1 para texto normal, 3:1 para texto grande e componentes relevantes). Azul mais escuro pode ser usado onde a legibilidade exigir, sem substituir a identidade clara.

## 5. Processo de evolução
Antes de alterar uma tela, consultar este documento. Mudanças de paleta, nome ou símbolo exigem aprovação expressa. Ajustes de aplicação e contraste podem ser feitos gradualmente, mantendo estas regras. Revisar especialmente os usos legados de rosa em botões/cartões e de verde/dourado em elementos decorativos. Não declarar conformidade visual integral sem revisar as telas. O CSS atual pode conter usos herdados que ainda precisam de correção.

A referência de logo branca está em `public/logo-branca.svg`; os arquivos históricos azul PNG e SVG permanecem em `public/logo-sipro.png` e `public/logo-sipro.svg`.

## 6. Tela de login oficial — aprovada em 27/11/2026
Modelo de dois painéis unidos, cantos arredondados, fundo claro azulado, painel institucional azul com símbolo oficial branco em tamanho destacado, nome por extenso em duas linhas, subtítulo “Gestão jurídica institucional”, traço rosa exclusivamente decorativo e frase “Organize processos, prazos e compromissos da Procuradoria em um ambiente simples, claro e profissional.” Ondas discretas no canto inferior. Painel branco com formulário, ícones lineares e perfis de demonstração secundários. No celular, empilhar os painéis. Não simular autenticação real enquanto não implementada; preservar o acesso local exclusivo do Windows. Implementação em React/CSS, sem usar a imagem como interface estática.

### Referência dimensional do login
Imagem de referência: 1229 × 1536; cartão aproximado 1128 × 1050, divisão 530/598, marca ~150 px, título ~58 px. Usar proporções do cartão, não apenas viewport, para preservar a hierarquia. Fundos decorativos locais `src/assets/login-background.svg` e `src/assets/login-page-background.svg`. Não substituir textos, formulário ou logo por imagem raster. A fidelidade deve ser verificada visualmente; diferenças de fonte, viewport e avisos de demonstração são esperadas.

## 7. Navegação e qualidade visual
Menu lateral compacto por padrão, ícones com nomes acessíveis e descrição em hover/foco, expansão por clique e alternativa superior. Preferências locais por perfil, mudança imediata, opção de reduzir animações. Em telas móveis, menu retrátil com rótulos completos. Ícones SVG de dimensão e traço consistentes, áreas de clique de pelo menos 44px sempre que possível, sem deformação, sobreposição ou corte de texto; tabelas largas com rolagem própria. Validar ambos os perfis e menus em 1920×1080, 1366×768, 1024×768 e celular, teclado, zoom e movimento reduzido. Não declarar validação visual concluída sem teste real.

- Login desktop: considerar a altura útil da janela, não apenas a largura. Manter proporções, legibilidade e todos os controles acessíveis; rolagem natural é permitida em janelas muito baixas, zoom e mensagens extras. Nunca ocultar o conteúdo para simular encaixe.

### Complemento visual aprovado do login
Fundo externo com símbolo oficial ampliado como marca d’água quase imperceptível (opacidade de referência 3,5%) e curvas/tons azul e rosa muito suaves. Rodapé centralizado, sem ícones ou divisores, com texto discreto `v{versão} · Desenvolvido por @aqnoeu`. A versão deriva do package.json no build. Reservar espaço para o rodapé no fluxo da página, mantendo o cartão aprovado e os dois perfis.

### Biblioteca oficial de ícones
Adotar Lucide (lucide-react, licença ISC) para os ícones de interface; evitar desenhar ícones manualmente. Preservar o símbolo institucional original, que não é um ícone de interface. Usar dimensões e espessura consistentes, empacotamento local sem CDN, e nomes acessíveis. A junção entre cabeçalho e barra lateral deve ser contínua, sem degraus, sobreposições ou recortes.

### Janelas operacionais
Padrão de diálogo branco, cabeçalho e rodapé fora da área de rolagem, ícones Lucide, formulário responsivo, abas de edição quando necessário, sem cartões aninhados excessivos. Não exibir botões ou tags fictícios; preservar funções existentes e explicitar campos somente leitura. Aplicar progressivamente aos demais diálogos. Primeiro caso: detalhes de processos, com abas Dados gerais, Demandas e prazos, Observações.

### Etiquetas
Andamento por intimação (campo independente do status temporal do prazo); matéria e competência inferidas do assunto e órgão, editáveis no processo; etiquetas personalizadas vinculadas separadamente ao setor/gabinete ou UID do perfil. Visibilidade por perfil, andamento sempre exibido. Não há integração externa de intimações nem autenticação real nesta fase.

### Seletor e aparência de etiquetas
Botão único + Etiqueta na consulta, pesquisa por nome, categorias agrupadas, seleção direta e remoção por X. Criação e gerenciamento com paleta de 60 cores, círculos de 20px, intervalo de 3px, hexadecimal e seletor de cor; estilo suave, sólido ou contorno e prévia à direita, empilhados em telas estreitas. Andamento conserva cores funcionais fixas. Catálogo local separado por categoria e escopo; exclusão preserva os processos.

### Lista de processos — cartões
Grade responsiva como padrão, com alternativa horizontal em lista e preferência por perfil. Cartões brancos, número 16–18px, parte 14px, metadados 13px, sem ornamentos sem função; etiquetas personalizadas preservadas. Ícones Lucide nos filtros, indicadores, cartões, consulta, edição e ações de cadastro. A abertura dos detalhes mantém as funções existentes.

### Ícones dos controles de conta no cabeçalho
Em cabeçalhos institucionais azuis, os ícones de expansão do perfil e alternância CEO/PGM devem ser brancos (`#FFFFFF`), inclusive em hover e foco. Usar Lucide com traço consistente e foco visível branco. Dentro do menu suspenso branco, usar azul de contraste (`#006B9A`) para ícones; não herdar a cor branca do cabeçalho. Verificar a cor efetivamente computada no navegador em ambos os perfis antes de considerar a revisão visual aprovada.

### Cadastro de processos
Diálogo operacional branco, seções compactas Dados do processo, Prazos e documentos e Observações, com ações fixas e sem rolagem na resolução desktop usual. Em tela excepcionalmente pequena ou zoom ampliado, manter acesso ao conteúdo em vez de cortá-lo. A leitura de PDF é ação secundária; não alterar dados preenchidos sem revisão.

### Barra de ferramentas dos autos
Manter cabeçalho institucional azul. A segunda barra é branca, aproximadamente 52 px em desktop, número do processo em azul e identificação complementar em segunda linha. Ícones Lucide azuis sobre branco. Etiquetas somente leitura na região direita, sem botões de criação ou remoção; respeitar visibilidade e escopo. Exportação integral no menu do processo, preservado download individual do PDF. Em tela estreita permitir reorganização sem cortar controles.

- Autos digitais em desktop: cronologia e visualizador devem alcançar a borda inferior da área útil do navegador, sem faixa vazia ou rodapé decorativo. Dimensionar pelo fluxo flexível real, mantendo rolagens independentes e controles acessíveis em janelas pequenas.
