export const isCloud = import.meta.env.MODE === 'web'
export const isPreview = import.meta.env.MODE === 'preview'
export function createPreviewData() {
  const date = (offset) => { const d = new Date(); d.setDate(d.getDate()+offset); return d.toLocaleDateString('pt-BR') }
  const owner = { ownerId:'sipro-demo-user', ownerUid:'sipro-demo-user', ownerName:'Usuário de demonstração', setorId:'demo', setorNome:'Setor de demonstração', responsavel:'Usuário de demonstração' }
  return {
    processos: {
      'DEMO-001': { ...owner, numero:'DEMO-001', assunto:'Exemplo de ação administrativa', orgao:'Vara fictícia', fase:'Contestação', prioridade:'Média', prazo:date(5), status:'Em andamento', parte:'Parte fictícia A' },
      'DEMO-002': { ...owner, numero:'DEMO-002', assunto:'Exemplo de obrigação de fazer', orgao:'Vara fictícia', fase:'Manifestação', prioridade:'Baixa', prazo:date(9), status:'Em andamento', parte:'Parte fictícia B' }
    },
    prazos: { 'PRZ-DEMO-001': { ...owner, id:'PRZ-DEMO-001', processo:'DEMO-001', parte:'Parte fictícia A', item:'Apresentar contestação (exemplo)', setor:'Demonstração', vencimento:date(5), status:'A vencer' } },
    agenda: { 'AG-DEMO-001': { ...owner, id:'AG-DEMO-001', tipo:'Reuniao', titulo:'Reunião de demonstração', horario:date(2)+' 14:00', local:'Sala fictícia' } }
  }
}
