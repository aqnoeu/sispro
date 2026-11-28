const {test,expect}=require('@playwright/test');
const url='https://sispro-eight.vercel.app/';
const uid='00000000-0000-4000-8000-000000000001';
const mechs=['processos','prazos','agenda','jurisprudencia','autos','usuarios','setores','gabinetes'];
async function mock(page,{level=0,ceo=false,seed={}}={}){
 let pgmData=seed,pgmRevision=1;
 await page.route('https://ntvxipvivhhjaebnnvcq.supabase.co/**',async route=>{
 const u=new URL(route.request().url()),p=u.pathname;
 const headers={'access-control-allow-origin':'https://sispro-eight.vercel.app','access-control-allow-methods':'GET,POST,PATCH,PUT,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer','content-type':'application/json'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 let body=[];
 if(p.endsWith('/sispro_permissions')&&route.request().method()==='POST')return route.fulfill({status:200,headers,body:JSON.stringify(route.request().postDataJSON())});
 if(p==='/auth/v1/token')body={access_token:'fixture-not-real',expires_in:300,user:{id:uid,email:'qa@example.invalid'}};
 else if(p==='/auth/v1/user')body={id:uid,email:'qa@example.invalid'};
 else if(p==='/auth/v1/logout')return route.fulfill({status:204,headers});
 else if(p.endsWith('/sispro_profiles'))body=[{user_id:uid,display_name:'QA fictício',role:ceo?'admin':'user',platform_role:ceo?'ceo':null,active:true}];
 else if(p.endsWith('/sispro_read_workspace'))body={data:{},revision:null,levels:Object.fromEntries(mechs.map(k=>[k,ceo?3:level]))};
 else if(p.endsWith('/sispro_test_pgm_workspaces')){if(ceo&&route.request().method()==='PATCH'){const payload=route.request().postDataJSON();if(u.searchParams.get('revision')!=='eq.'+pgmRevision)return route.fulfill({status:200,headers,body:'[]'});pgmData=payload.data;pgmRevision=payload.revision}body=ceo?[{user_id:uid,active:true,data:pgmData,revision:pgmRevision}]:[];}
 else if(p.endsWith('/sispro_mechanics'))body=mechs.map(id=>({id,name:id==='processos'?'Processos':id}));
 else if(p.endsWith('/sispro_institution_mechanics'))body=mechs.map(mechanic_id=>({institution_id:'qa-institution',mechanic_id,enabled:true}));
 else if(p.endsWith('/sispro_permissions'))body=[{role_id:'qa-role',mechanic_id:'processos',access_level:1}];
 else if(p.endsWith('/sispro_roles'))body=ceo?[{id:'qa-role',institution_id:'qa-institution',name:'Procurador',active:true}]:[];
 else if(p.endsWith('/sispro_institutions'))body=[{id:'qa-institution',name:'Procuradoria de Teste',active:true,is_test:true}];
 return route.fulfill({status:200,headers,body:JSON.stringify(body)});
 });
}
async function login(page){await page.goto(url);await page.getByRole('textbox',{name:'E-mail'}).fill('qa@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('qa-fixture-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:'Menu do usuário',exact:true})).toBeVisible();}
test('official public page requires login',async({page})=>{await page.goto(url+'#/processos');await expect(page.getByRole('heading',{name:'Entrar no sistema'})).toBeVisible();await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();await expect(page.getByText('Acesso exclusivo a contas autorizadas. Não há cadastro público.')).toBeVisible()});
for(const level of [0,1,2,3])test('official UI fixture level '+level,async({page})=>{await mock(page,{level});await login(page);const menu=page.getByRole('button',{name:'Processos',exact:true});if(level===0){await expect(menu).toHaveCount(0);await page.evaluate(()=>location.hash='/processos');await expect.poll(()=>new URL(page.url()).hash).toBe('#/')}else{await expect(menu).toBeVisible();await menu.click();const button=page.getByRole('button',{name:'Cadastrar Processo',exact:true});await expect(button).toBeVisible();if(level===1)await expect(button).toBeDisabled();else await expect(button).toBeEnabled()}});
test('official UI fixture CEO institution and PGM switch',async({page})=>{await mock(page,{ceo:true});await login(page);await expect(page.getByRole('heading',{name:'Gestão da plataforma'})).toBeVisible();await expect(page.getByRole('button',{name:'Gabinetes',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Procuradorias',exact:true})).toBeVisible();await page.getByRole('button',{name:'Procuradorias',exact:true}).click();await page.getByRole('button',{name:'Gerenciar procuradoria',exact:true}).click();await expect(page.getByRole('heading',{name:'Procuradoria de Teste',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Gabinetes',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Excluir cargo',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Vincular pessoa',exact:true}).click();await expect(page.getByLabel('Cargo',{exact:true})).toBeVisible();await expect(page.getByLabel('Gabinete',{exact:true})).toBeVisible();await expect(page.getByRole('option',{name:'Procurador',exact:true})).toHaveCount(1);await expect(page.getByRole('button',{name:'Mecânicas da instituição',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mecânicas da instituição',exact:true}).click();await expect(page.getByRole('heading',{name:'Todas as mecânicas disponíveis'})).toBeVisible();await page.getByRole('button',{name:'Níveis de acesso',exact:true}).click();const cell=page.getByRole('combobox',{name:'Processos — Procurador',exact:true});await expect(cell).toHaveValue('1');await cell.selectOption('2');const request=page.waitForRequest(r=>r.url().includes('sispro_permissions?on_conflict=')&&r.method()==='POST');await page.getByRole('button',{name:'Salvar permissões',exact:true}).click();expect((await request).postDataJSON()).toEqual([{role_id:'qa-role',mechanic_id:'processos',access_level:2}]);await expect(page.getByText('Permissões salvas com sucesso.')).toBeVisible();await page.getByRole('button',{name:'Acessar PGM',exact:true}).last().click();await expect(page.getByRole('button',{name:'Trocar para CEO'})).toBeVisible();await expect(page.getByText('PGM · Procuradoria de teste · Utilize somente dados fictícios',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Trocar para CEO'}).click();await expect(page.getByRole('heading',{name:'Gestão da plataforma'})).toBeVisible()});

test('PGM can open Prazos, batch and Oficios e Agenda and save fictitious records',async({page})=>{
 await mock(page,{ceo:true});await login(page);
 await page.getByRole('button',{name:'Trocar para PGM',exact:true}).click();
 await expect(page.getByRole('button',{name:'Trocar para CEO'})).toBeVisible();await expect(page.getByText('PGM · Procuradoria de teste · Utilize somente dados fictícios',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Prazos',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Visão rápida do que vence e do que precisa de ação'})).toBeVisible();
 await page.getByRole('button',{name:'Cadastrar prazo',exact:true}).click();
 await page.getByLabel('Número do processo',{exact:true}).fill('0000000-00.2026.8.00.0000');
 await page.getByLabel('Parte',{exact:true}).fill('Parte fictícia QA');
 await page.getByLabel('Descrição do prazo',{exact:true}).fill('Prazo fictício QA');
 await page.getByLabel('Vencimento',{exact:true}).fill('10/12/2026');
 const save=page.waitForRequest(r=>r.url().includes('/sispro_test_pgm_workspaces')&&r.method()==='PATCH');
 await page.locator('#cadastro-prazos button[type=submit]').click();
 const data=(await save).postDataJSON().data;
 expect(Object.values(data.prazos).some(r=>r.item==='Prazo fictício QA')).toBeTruthy();
 expect(Object.values(data.processos).some(r=>r.numero==='0000000-00.2026.8.00.0000')).toBeTruthy();
 await expect(page.getByText('Prazo salvo e processo criado automaticamente.')).toBeVisible();
 await page.getByRole('link',{name:'Cadastro em Lote',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Cadastro em lote via SAJ'})).toBeVisible();
 await page.getByRole('button',{name:'Ofícios e Agenda',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Compromissos, expedientes e eventos institucionais'})).toBeVisible();
 await page.getByLabel('Código',{exact:true}).fill('QA-OFICIO');
 await page.getByLabel('Tipo',{exact:true}).selectOption('Oficio');
 await page.getByLabel('Título',{exact:true}).fill('Ofício fictício QA');
 await page.getByLabel('Horário',{exact:true}).fill('10/12/2026 14:00');
 await page.getByLabel('Local',{exact:true}).fill('Sala fictícia');
 const agendaSave=page.waitForRequest(r=>r.url().includes('/sispro_test_pgm_workspaces')&&r.method()==='PATCH');
 await page.getByRole('button',{name:'Salvar cadastro',exact:true}).click();
 expect((await agendaSave).postDataJSON().data.agenda['QA-OFICIO'].titulo).toBe('Ofício fictício QA');
 await expect(page.getByText('Cadastro salvo com sucesso em agenda/QA-OFICIO.')).toBeVisible();
 await expect(page.getByText('Ofício fictício QA',{exact:true})).toBeVisible();
});

test('compact account menu and no switch for normal user',async({page})=>{await mock(page,{level:3});await login(page);await expect(page.getByRole('button',{name:'Trocar para PGM'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Sair',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Menu do usuário'}).click();await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Perfil',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Sair',exact:true})).toHaveCount(0)});

test('account header icons follow institutional white-on-blue rule',async({page})=>{await mock(page,{ceo:true});await login(page);const trigger=page.getByRole('button',{name:'Menu do usuário'});await expect(trigger.locator('svg')).toHaveCSS('stroke','rgb(255, 255, 255)');await expect(page.getByRole('button',{name:'Trocar para PGM'}).locator('svg')).toHaveCSS('stroke','rgb(255, 255, 255)');await trigger.click();await expect(page.getByRole('button',{name:'Perfil',exact:true}).locator('svg')).toHaveCSS('stroke','rgb(0, 107, 154)');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Trocar para PGM'}).click();await expect(page.getByRole('button',{name:'Trocar para CEO'}).locator('svg')).toHaveCSS('stroke','rgb(255, 255, 255)');await expect(page.getByRole('button',{name:'Menu do usuário'}).locator('svg')).toHaveCSS('stroke','rgb(255, 255, 255)')});

test('process creation fits desktop and saves without deadline',async({page})=>{await page.setViewportSize({width:1366,height:768});await mock(page,{ceo:true});await login(page);await page.getByRole('button',{name:'Trocar para PGM',exact:true}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('button',{name:'Cadastrar Processo',exact:true}).click();const d=page.getByRole('dialog',{name:'Cadastrar processo'});await expect(d.getByRole('button',{name:'Ler PDF'})).toBeVisible();await expect(d.getByRole('button',{name:'Salvar processo'})).toBeInViewport();expect(await d.locator('.work-dialog__body').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBeTruthy();for(const [k,v] of [['Número CNJ','0000001-00.2026.8.08.0011'],['Nome da parte','Parte fictícia']])await d.getByLabel(k,{exact:true}).fill(v);const save=page.waitForRequest(r=>r.url().includes('/sispro_test_pgm_workspaces')&&r.method()==='PATCH');await d.getByRole('button',{name:'Salvar processo'}).click();const data=(await save).postDataJSON().data;const row=Object.values(data.processos).find(r=>r.numero==='0000001-00.2026.8.08.0011');expect(row).toBeTruthy();expect(row.prazo||'').toBe('');await expect(d).toHaveCount(0)});

test('reload keeps PGM and current route; explicit logout clears session',async({page})=>{await mock(page,{ceo:true});await login(page);await page.getByRole('button',{name:'Trocar para PGM'}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await expect(page.getByRole('button',{name:'Cadastrar Processo',exact:true})).toBeVisible();const before=page.url();await page.reload();await expect(page.getByRole('button',{name:'Trocar para CEO'})).toBeVisible();await expect(page.getByRole('button',{name:'Cadastrar Processo',exact:true})).toBeVisible();expect(page.url()).toBe(before);await page.getByRole('button',{name:'Menu do usuário'}).click();await page.getByRole('button',{name:'Sair',exact:true}).click();await page.reload();await expect(page.getByRole('heading',{name:'Entrar no sistema'})).toBeVisible()});

test('autos toolbar is white, compact, read-only labels and export in menu',async({page})=>{await page.setViewportSize({width:1366,height:768});const numero='0000001-00.2026.8.08.0011';await mock(page,{ceo:true,seed:{processos:{qa:{numero,parte:'Parte fictícia',assunto:'Saúde',orgao:'Fazenda Pública',andamentoAtual:'Fazer',ownerUid:uid}}}});await login(page);await page.getByRole('button',{name:'Trocar para PGM'}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('link',{name:'Acessar autos de '+numero}).click();const bar=page.locator('.case-header');await expect(bar).toBeVisible();await expect(bar).toHaveCSS('background-color','rgb(255, 255, 255)');expect((await bar.boundingBox()).height).toBeLessThanOrEqual(56);const tags=bar.getByLabel('Etiquetas do processo');await expect(tags.getByText('Saúde',{exact:true})).toBeVisible();await expect(tags.getByRole('button')).toHaveCount(0);await expect(bar.getByRole('button',{name:'Baixar autos (ZIP)'})).toHaveCount(0);await bar.getByRole('button',{name:'Menu do processo'}).click();await expect(bar.getByRole('button',{name:'Baixar autos (ZIP)'})).toBeVisible()});

test('autos fill available viewport without bottom gap or page scroll',async({page})=>{const numero='0000001-00.2026.8.08.0011';await mock(page,{ceo:true,seed:{processos:{qa:{numero,parte:'Parte fictícia',assunto:'Saúde',orgao:'Fazenda Pública',andamentoAtual:'Fazer',ownerUid:uid}}}});await login(page);await page.getByRole('button',{name:'Trocar para PGM'}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('link',{name:'Acessar autos de '+numero}).click();await expect(page.locator('.case-split')).toBeVisible();for(const [width,height] of [[1920,1080],[1366,768],[1024,768]]){await page.setViewportSize({width,height});await expect.poll(async()=>Math.abs((await page.locator('.case-split').boundingBox()).y+(await page.locator('.case-split').boundingBox()).height-height)).toBeLessThanOrEqual(2);expect(await page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight)).toBeLessThanOrEqual(2);await expect(page.locator('.case-pdf-area')).toBeVisible()}await page.locator('.case-identity').click();await expect(page.locator('#case-details')).toBeVisible();await expect.poll(async()=>{const b=await page.locator('.case-split').boundingBox();return Math.abs(b.y+b.height-768)}).toBeLessThanOrEqual(2)});

test('imports a synthetic PJe PDF and separates its pieces without deadlines',async({page})=>{
 const {PDFDocument,StandardFonts}=require('pdf-lib');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 const sheets=[['Número: 0000001-00.2026.8.08.0011','A. B. C. (REQUERENTE) ADVOGADA FICTÍCIA (ADVOGADO)','Assunto: Saúde'],['Petição inicial','Num. 123456 - Pág. 1'],['Continuação','Num. 123456 - Pág. 2'],['Decisão','Num. 234567 - Pág. 1']];
 for(const lines of sheets){const p=pdf.addPage();lines.forEach((line,i)=>p.drawText(line,{x:40,y:750-i*30,size:14,font}))}
 await page.setViewportSize({width:1366,height:768});await mock(page,{ceo:true});await login(page);
 await page.getByRole('button',{name:'Trocar para PGM',exact:true}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('button',{name:'Cadastrar Processo',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Cadastrar processo'});
 await d.locator('input[type=file]').setInputFiles({name:'autos-teste.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
 await expect(d.getByLabel('Número CNJ',{exact:true})).toHaveValue('0000001-00.2026.8.08.0011',{timeout:30000});
 await expect(d.getByLabel('Nome da parte',{exact:true})).toHaveValue('A. B. C.');
 await d.getByRole('button',{name:'Documentos (3)',exact:true}).click();
 await expect(d.getByText('3 arquivo(s) · 2 com ID PJe')).toBeVisible();
 await d.getByRole('button',{name:'Próximo documento'}).click();
 await expect(d.getByText('Documento 123456 (p. 2-3).pdf',{exact:true})).toBeVisible();
 await expect(d.getByRole('button',{name:'Salvar processo'})).toBeInViewport();
 await d.getByRole('button',{name:'Prazos (opcional)'}).click();await expect(d.getByLabel('Próximo prazo (opcional)')).toHaveValue('');
});

test('compact autos tree and actions in process menu',async({page})=>{await page.setViewportSize({width:1680,height:900});const numero='0000001-00.2026.8.08.0011';await mock(page,{ceo:true,seed:{processos:{qa:{numero,parte:'Parte fictícia',assunto:'Saúde',orgao:'Fazenda Pública',ownerUid:uid}}}});await login(page);await page.getByRole('button',{name:'Trocar para PGM'}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('link',{name:'Acessar autos de '+numero}).click();const tree=page.getByRole('complementary',{name:'Árvore do processo'});await expect(tree).toBeVisible();expect((await tree.boundingBox()).width).toBeCloseTo(330,0);await expect(tree.getByRole('textbox',{name:'Pesquisar documentos ou movimentos'})).toBeVisible();await expect(tree.locator('.case-tool-row')).toHaveCount(0);const menu=page.getByRole('button',{name:'Menu do processo'});await menu.click();await expect(page.getByRole('button',{name:'Importar documentos',exact:true})).toBeVisible();await page.getByRole('button',{name:'Filtros da árvore',exact:true}).click();await expect(tree.locator('.case-filter-panel')).toBeVisible();await menu.click();await page.getByRole('button',{name:'Ocultar árvore',exact:true}).click();await expect(tree).toHaveCount(0);await menu.click();await page.getByRole('button',{name:'Exibir árvore',exact:true}).click();await expect(tree).toBeVisible()});

test('tree resize by drag and keyboard persists and timeline dots are centered',async({page})=>{await page.setViewportSize({width:1680,height:900});const numero='0000001-00.2026.8.08.0011';await mock(page,{ceo:true,seed:{processos:{qa:{numero,parte:'Parte fictícia',assunto:'Saúde',orgao:'Fazenda Pública',ownerUid:uid,historico:[{descricao:'Cadastro inicial do processo',data:'2026-11-27'}]}}}});await login(page);await page.getByRole('button',{name:'Trocar para PGM'}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('link',{name:'Acessar autos de '+numero}).click();const tree=page.getByRole('complementary',{name:'Árvore do processo'}),divider=page.getByRole('separator',{name:'Ajustar largura da árvore'});await expect(divider).toBeVisible();await expect(divider).toHaveAttribute('aria-valuenow','330');const b=await divider.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+100,b.y+b.height/2,{steps:10});await page.mouse.up();await expect(divider).toHaveAttribute('aria-valuenow','430');expect((await tree.boundingBox()).width).toBeCloseTo(430,0);await divider.focus();await page.keyboard.press('ArrowLeft');await expect(divider).toHaveAttribute('aria-valuenow','414');await page.reload();await expect(divider).toHaveAttribute('aria-valuenow','414');const dot=tree.locator('.case-event-dot').first(),card=tree.locator('.case-event-card').first();await expect(dot).toHaveCSS('width','8px');await expect(dot.locator('svg')).toHaveCount(0);await expect(card).toHaveCSS('border-radius','8px');const d=await dot.boundingBox(),c=await card.boundingBox();expect(Math.abs(d.y+d.height/2-c.y-c.height/2)).toBeLessThanOrEqual(1);await expect(card).toBeVisible();const event=tree.locator('.case-event').first();expect(await event.evaluate(e=>[getComputedStyle(e,'::before').display,getComputedStyle(e,'::after').display])).toEqual(['none','none']);await divider.dblclick();await expect(divider).toHaveAttribute('aria-valuenow','330');await page.setViewportSize({width:700,height:900});await expect(divider).toBeHidden()});

test('process registration wraps its content without empty space beneath actions',async({page})=>{
 await mock(page,{ceo:true});await login(page);await page.getByRole('button',{name:'Trocar para PGM',exact:true}).click();await page.getByRole('button',{name:'Processos',exact:true}).click();await page.getByRole('button',{name:'Cadastrar Processo',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Cadastrar processo'});
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768]]){
  await page.setViewportSize({width,height});
  for(const tab of ['Dados do processo','Documentos','Prazos (opcional)','Observações']){
   await d.getByRole('button',{name:tab,exact:true}).click();
   await expect(d.getByRole('button',{name:'Salvar processo'})).toBeInViewport();
   const metrics=await d.evaluate(el=>{const b=el.getBoundingClientRect(),footer=el.querySelector('.work-dialog__footer').getBoundingClientRect(),body=el.querySelector('.work-dialog__body');return {bottomGap:b.bottom-footer.bottom,center:b.top+b.height/2-innerHeight/2,scroll:body.scrollHeight-body.clientHeight,height:b.height}});
   expect(metrics.bottomGap).toBeLessThanOrEqual(2);expect(Math.abs(metrics.center)).toBeLessThanOrEqual(2);expect(metrics.scroll).toBeLessThanOrEqual(1);expect(metrics.height).toBeLessThan(height-80);
  }
 }
});
