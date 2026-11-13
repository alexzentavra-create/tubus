// Integration test: explicitly opt in to creating two temporary, email-less test accounts.
// Run from the repository: node --env-file=.env.local scripts/verify-admin-collaboration.cjs
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const { createServerClient } = require('@supabase/ssr')
const { chromium } = require('playwright')
const base = process.env.COLLAB_TEST_URL || 'http://localhost:3006'
if (!base.startsWith('http://localhost:')) throw new Error('This harness only targets a local application server.')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const users = [], contexts = [], testId = randomUUID(), password = randomUUID() + 'aA!9'
let browser
function checked(result) { if(result.error) throw new Error(result.error.message); return result.data }
async function request(context, body, query = '') {
  const response = body ? await context.request.post(base + '/api/admin/collaboration' + query, { data: body, headers: { Origin: base } }) : await context.request.get(base + '/api/admin/collaboration' + query)
  const json = await response.json()
  assert.equal(response.status(), 200, JSON.stringify(json)); return json
}
async function poll(fn, predicate, label) {
  const until = Date.now()+30000
  while(Date.now()<until) { const result=await fn(); if(predicate(result)) return result; await new Promise(r=>setTimeout(r,500)) }
  throw new Error('Timed out: '+label)
}
;(async()=>{
  browser = await chromium.launch({ channel: 'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'] })
  for(let i=0;i<2;i++) {
    const name='Verificación '+(i===0?'A':'B')
    const email=`collab-${testId}-${i}@example.invalid`
    const {user}=checked(await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}}))
    users.push(user)
    checked(await db.from('profiles').update({role:'superadmin',name}).eq('id',user.id))
    checked(await db.from('admin_collaborators').insert({user_id:user.id}))
    const jar = new Map()
    const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{get:name=>jar.get(name),set:(name,value)=>jar.set(name,value),remove:name=>jar.delete(name)}})
    checked(await auth.auth.signInWithPassword({email,password}))
    const context=await browser.newContext({permissions:['camera','microphone'],acceptDownloads:true,viewport:{width:1440,height:1000}})
    contexts.push(context)
    await context.addCookies([{name:'bp_access',value:'granted_2026',url:base},...[...jar].map(([name,value])=>({name,value,url:base}))])
    await context.addInitScript(({id,name,email})=>{
      const now=Date.now(); localStorage.setItem('active_user',JSON.stringify({id,name,email,role:'superadmin',session_created_at:now,session_last_active_at:now}));
      localStorage.setItem('super_admin_identity',name); sessionStorage.setItem('super_admin_identity',name)
    },{id:user.id,name,email})
    // Isolate unrelated legacy sync writes; collaboration itself uses the real API and database.
    await context.route('**/api/sync**',route=>route.fulfill({json:{success:true,data:{}}}))
  }
  const [a,b]=contexts
  const sidA=randomUUID(),sidB=randomUUID()
  await request(a,{action:'heartbeat',sessionId:sidA}); await request(b,{action:'heartbeat',sessionId:sidB})
  let state=await request(a)
  assert(state.presence.some(p=>p.user_id===users[0].id));assert(state.presence.some(p=>p.user_id===users[1].id));
  console.log('PASS: two independent authenticated sessions see each other online')
  const messageId=randomUUID(), text='Integration verification '+testId
  await Promise.all([request(a,{action:'message',id:messageId,text}),request(b,{action:'message',id:randomUUID(),text:'Reply '+testId})])
  await request(a,{action:'message',id:messageId,text})
  state=await request(b)
  assert.equal(state.messages.filter(m=>m.id===messageId).length,1)
  assert(state.messages.some(m=>m.body==='Reply '+testId))
  await request(a,{action:'read',ids:[messageId]})
  assert((await request(a)).events.find(e=>e.id===messageId).read)
  assert.equal((await request(b)).events.find(e=>e.id===messageId).read,false)
  console.log('PASS: concurrent durable messages, idempotent retry, independent notification reads')
  const anon=await browser.newContext(); await anon.addCookies([{name:'bp_access',value:'granted_2026',url:base}])
  assert.equal((await anon.request.get(base+'/api/admin/collaboration')).status(),401); await anon.close()
  const spoof=await a.request.post(base+'/api/admin/collaboration',{data:{action:'message',id:randomUUID(),text:'Denied'},headers:{Origin:'https://example.invalid'}})
  assert.equal(spoof.status(),403)
  console.log('PASS: unauthenticated access and cross-origin mutations rejected')
  const pa=await a.newPage(), pb=await b.newPage()
  const pageErrors=[]; for(const p of [pa,pb]) p.on('pageerror',e=>pageErrors.push(e.message))
  await Promise.all([pa.goto(base+'/admin/super',{waitUntil:'domcontentloaded',timeout:120000}),pb.goto(base+'/admin/super',{waitUntil:'domcontentloaded',timeout:120000})])
  await Promise.all([pa.getByRole('button',{name:'Chat interno',exact:true}).click(),pb.getByRole('button',{name:'Chat interno',exact:true}).click()])
  await pb.getByText(text,{exact:true}).waitFor()
  await pb.reload(); await pb.getByRole('button',{name:'Chat interno',exact:true}).click(); await pb.getByText(text,{exact:true}).waitFor()
  console.log('PASS: saved message remains visible after browser reload')
  // A failed save must retain the draft, and retry must save exactly once.
  const failureRoute = async route => {
    const body=route.request().postDataJSON()
    if(body?.action==='message') return route.fulfill({status:503,json:{error:'Intentional test outage'}})
    return route.continue()
  }
  await pa.route('**/api/admin/collaboration',failureRoute)
  await pa.getByRole('textbox',{name:'Mensaje',exact:true}).fill('Retry verification '+testId)
  await pa.getByRole('button',{name:'Enviar',exact:true}).click()
  await pa.getByText(/Intentional test outage/).waitFor()
  assert.equal(await pa.getByRole('textbox',{name:'Mensaje',exact:true}).inputValue(),'Retry verification '+testId)
  await pa.unroute('**/api/admin/collaboration',failureRoute)
  await pa.getByRole('button',{name:'Enviar',exact:true}).click()
  await pb.getByText('Retry verification '+testId,{exact:true}).waitFor()
  console.log('PASS: failed save preserves draft and retry delivers it')
  await pa.screenshot({path:process.env.COLLAB_SCREENSHOT || 'scratch/admin-chat-verification.png',fullPage:true})
  await pa.getByRole('button',{name:'Cerrar',exact:true}).click();await pb.getByRole('button',{name:'Cerrar',exact:true}).click()
  await pa.getByRole('button',{name:'Llamar',exact:true}).click();await pa.getByRole('combobox').selectOption(users[1].id)
  await pa.getByRole('button',{name:'Iniciar llamada',exact:true}).click()
  await pb.getByRole('button',{name:'Atender',exact:true}).click({timeout:30000})
  await pa.getByText('En llamada',{exact:true}).waitFor({timeout:30000});await pb.getByText('En llamada',{exact:true}).waitFor({timeout:30000})
  console.log('PASS: incoming call, acceptance, real WebRTC media connection')
  const videos=await pa.locator('video').evaluateAll(v=>v.map(x=>({ready:x.readyState,width:x.videoWidth,tracks:x.srcObject?.getTracks().map(t=>({kind:t.kind,state:t.readyState}))})))
  assert(videos.some(v=>v.width>0));console.log('PASS: video frames received')
  await pa.getByRole('button',{name:'Grabar',exact:true}).click();await pb.getByRole('button',{name:'Aceptar grabación',exact:true}).click()
  await pa.getByRole('button',{name:'Detener grabación',exact:true}).waitFor()
  const da=pa.waitForEvent('download'), dbDownload=pb.waitForEvent('download')
  await new Promise(r=>setTimeout(r,1500));await pa.getByRole('button',{name:'Finalizar',exact:true}).click()
  const downloads=await Promise.all([da,dbDownload]);assert(downloads.every(d=>d.suggestedFilename().endsWith('.webm')||d.suggestedFilename().endsWith('.mp4')))
  for(const [i,d] of downloads.entries()) await d.saveAs(`scratch/admin-call-verification-${i}.webm`)
  console.log('PASS: consent-based recording downloads on both participants at call end')
  await pa.getByRole('button',{name:'Cerrar',exact:true}).click();await pb.getByRole('button',{name:'Cerrar',exact:true}).click()
  await pa.getByRole('button',{name:'Llamar',exact:true}).click();await pa.getByRole('combobox').selectOption(users[1].id)
  await pa.getByRole('button',{name:'Sólo voz',exact:true}).click();await pa.getByRole('button',{name:'Iniciar llamada',exact:true}).click()
  await pb.getByRole('button',{name:'Atender',exact:true}).click({timeout:30000})
  await pa.getByText('En llamada',{exact:true}).waitFor({timeout:30000})
  await pb.getByText('En llamada',{exact:true}).waitFor({timeout:30000})
  await pa.getByRole('button',{name:'Silenciar micrófono',exact:true}).click()
  await pa.getByRole('button',{name:'Activar micrófono',exact:true}).waitFor()
  await pa.getByRole('button',{name:'Finalizar',exact:true}).click()
  await pb.getByText('Llamada finalizada',{exact:true}).waitFor()
  await pa.getByRole('button',{name:'Cerrar',exact:true}).click();await pb.getByRole('button',{name:'Cerrar',exact:true}).click()
  console.log('PASS: audio-only call, mute, and remote hangup')
  await pa.screenshot({path:'scratch/admin-dashboard-verification.png',fullPage:true})
  await pa.setViewportSize({width:390,height:844})
  await pa.getByRole('button',{name:'Chat interno',exact:true}).click()
  const rect=await pa.getByRole('dialog').boundingBox()
  assert(rect && rect.x>=0 && rect.y>=0 && rect.x+rect.width<=391 && rect.y+rect.height<=845)
  await pa.screenshot({path:'scratch/admin-mobile-verification.png',fullPage:true})
  console.log('PASS: mobile dialog fits the viewport')
  const relevantErrors=pageErrors.filter(e=>!e.includes('Failed to fetch'))
  assert.deepEqual(relevantErrors,[])
  console.log('PASS: no browser runtime errors')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  await browser?.close()
  for(const user of users){
    const calls=checked(await db.from('admin_calls').select('id').or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`))
    if(calls.length) checked(await db.from('admin_calls').delete().in('id',calls.map(c=>c.id)))
    checked(await db.from('admin_event_reads').delete().eq('user_id',user.id))
    checked(await db.from('admin_events').delete().eq('actor_id',user.id))
    checked(await db.from('admin_messages').delete().eq('sender_id',user.id))
    checked(await db.from('admin_presence').delete().eq('user_id',user.id))
    checked(await db.from('admin_collaborators').delete().eq('user_id',user.id))
    checked(await db.auth.admin.deleteUser(user.id))
  }
  console.log('Temporary test accounts and collaboration data removed.')
})
