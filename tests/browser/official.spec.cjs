const {test,expect}=require('@playwright/test');
const url='https://sispro-eight.vercel.app/';
const uid='00000000-0000-4000-8000-000000000001';
const mechs=['processos','prazos','agenda','jurisprudencia','autos','usuarios','setores','gabinetes'];
async function mock(page,{level=0,ceo=false}={}){
 let pgmData={},pgmRevision=1;
 await page.route('https://ntvxipvivhhjaebnnvcq.supabase.co/**',async route=>{
 const u=new URL(route.request().url()),p=u.pathname;
 const headers={'access-control-allow-origin':'https://sispro-eight.vercel.app','access-control-allow-methods':'GET,POST,PATCH,PUT,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer','content-type':'application/json'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 let body=[];
 if(p.endsWith('/sispro_permissions')&&route.request().method()==='POST')return route.fulfill({status:200,headers,body:JSON.stringify(route.request().postDataJSON())});
 if(p==='/auth/v1/token')body={access_token:'fixture-not-real',expires_in:300,user:{id:uid,email:'qa@example.invalid'}};
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
