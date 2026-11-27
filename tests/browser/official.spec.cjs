const {test,expect}=require('@playwright/test');
const url='https://sispro-eight.vercel.app/';
const uid='00000000-0000-4000-8000-000000000001';
const mechs=['processos','prazos','agenda','jurisprudencia','autos','usuarios','setores','gabinetes'];
async function mock(page,{level=0,ceo=false}={}){
 await page.route('https://ntvxipvivhhjaebnnvcq.supabase.co/**',async route=>{
 const u=new URL(route.request().url()),p=u.pathname;
 const headers={'access-control-allow-origin':'https://sispro-eight.vercel.app','access-control-allow-methods':'GET,POST,PATCH,PUT,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,prefer','content-type':'application/json'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 let body=[];
 if(p==='/auth/v1/token')body={access_token:'fixture-not-real',expires_in:300,user:{id:uid,email:'qa@example.invalid'}};
 else if(p==='/auth/v1/logout')return route.fulfill({status:204,headers});
 else if(p.endsWith('/sispro_profiles'))body=[{user_id:uid,display_name:'QA fictício',role:ceo?'admin':'user',platform_role:ceo?'ceo':null,active:true}];
 else if(p.endsWith('/sispro_read_workspace'))body={data:{},revision:null,levels:Object.fromEntries(mechs.map(k=>[k,ceo?3:level]))};
 else if(p.endsWith('/sispro_test_pgm_workspaces'))body=ceo?[{user_id:uid,active:true,data:{},revision:1}]:[];
 else if(p.endsWith('/sispro_institutions'))body=[{id:'qa-institution',name:'Procuradoria de Teste',active:true,is_test:true}];
 return route.fulfill({status:200,headers,body:JSON.stringify(body)});
 });
}
async function login(page){await page.goto(url);await page.getByRole('textbox',{name:'E-mail'}).fill('qa@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('qa-fixture-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible();}
test('official public page requires login',async({page})=>{await page.goto(url+'#/processos');await expect(page.getByRole('heading',{name:'Entrar no sistema'})).toBeVisible();await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();await expect(page.getByText('Acesso exclusivo a contas autorizadas. Não há cadastro público.')).toBeVisible()});
for(const level of [0,1,2,3])test('official UI fixture level '+level,async({page})=>{await mock(page,{level});await login(page);const menu=page.getByRole('button',{name:'Processos',exact:true});if(level===0){await expect(menu).toHaveCount(0);await page.evaluate(()=>location.hash='/processos');await expect.poll(()=>new URL(page.url()).hash).toBe('#/')}else{await expect(menu).toBeVisible();await menu.click();const button=page.getByRole('button',{name:'Cadastrar Processo',exact:true});await expect(button).toBeVisible();if(level===1)await expect(button).toBeDisabled();else await expect(button).toBeEnabled()}});
test('official UI fixture CEO institution and PGM switch',async({page})=>{await mock(page,{ceo:true});await login(page);await expect(page.getByRole('heading',{name:'Gestão da plataforma'})).toBeVisible();await expect(page.getByText('Procuradoria de Teste',{exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'Acessar PGM',exact:true}).last().click();await expect(page.getByText('PGM · Procuradoria de teste · Utilize somente dados fictícios')).toBeVisible();await page.getByRole('button',{name:'Voltar ao CEO'}).click();await expect(page.getByRole('heading',{name:'Gestão da plataforma'})).toBeVisible()});
