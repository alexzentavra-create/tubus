'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Mail, Lock, Eye, EyeOff, ArrowRight, User, BarChart2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register'

function CityBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', onResize)
    const GAP=160,ROAD=32,LANE=ROAD/2,NEAR=-LANE/2,FAR=LANE/2,CYCLE=360
    const getCols=()=>{const a=[];for(let x=GAP;x<W;x+=GAP)a.push(x);return a}
    const getRows=()=>{const a=[];for(let y=GAP;y<H;y+=GAP)a.push(y);return a}
    let cols=getCols(),rows=getRows()
    type Dir='R'|'L'|'D'|'U'
    const DX:Record<Dir,number>={R:1,L:-1,D:0,U:0}
    const DY:Record<Dir,number>={R:0,L:0,D:1,U:-1}
    const laneOff:Record<Dir,number>={R:NEAR,L:FAR,D:NEAR,U:FAR}
    const dirAngle:Record<Dir,number>={R:0,L:Math.PI,D:Math.PI/2,U:-Math.PI/2}
    interface TLight{cx:number;cy:number;offset:number}
    const buildLights=():TLight[]=>{const o:TLight[]=[];cols.forEach((cx,ci)=>rows.forEach((cy,ri)=>{if((ci+ri)%2===0)o.push({cx,cy,offset:(ci*13+ri*19)%CYCLE})}));return o}
    let lights=buildLights()
    const lState=(cx:number,cy:number,f:number)=>{
      const l=lights.find(l=>l.cx===cx&&l.cy===cy);if(!l)return'n'
      const t=(f+l.offset)%CYCLE
      if(t<CYCLE*0.43)return'h';if(t<CYCLE*0.50)return'y';if(t<CYCLE*0.93)return'v';return'y'
    }
    interface Seg{type:'straight';x:number;y:number;dir:Dir;sc:number}
    interface TurnSeg{type:'turn';p0x:number;p0y:number;p1x:number;p1y:number;p2x:number;p2y:number;p3x:number;p3y:number;t:number;spd:number;toDir:Dir}
    interface Veh{id:number;type:'bus'|'car';ph:Seg|TurnSeg;spd:number;waiting:boolean;wf:number;stuck:number;len:number;wid:number;bc:string;gc:string;op:number;cx:number;cy:number;ang:number;tp:number;isY:boolean;rp:Array<[number,number]>}
    let vid=0;const vehs:Veh[]=[]
    const BC=[{b:'rgba(34,211,160,',g:'rgba(34,211,160,',y:false},{b:'rgba(56,189,248,',g:'rgba(56,189,248,',y:false},{b:'rgba(250,190,40,',g:'rgba(250,190,40,',y:true}]
    const CC=['rgba(148,163,184,','rgba(100,116,139,','rgba(80,96,115,','rgba(170,182,196,']
    const mkSeg=(x:number,y:number,dir:Dir,sc:number):Seg=>({type:'straight',x,y,dir,sc})
    const bez=(p0:number,p1:number,p2:number,p3:number,t:number)=>{const u=1-t;return u*u*u*p0+3*u*u*t*p1+3*u*t*t*p2+t*t*t*p3}
    const bezD=(p0:number,p1:number,p2:number,p3:number,t:number)=>{const u=1-t;return 3*(u*u*(p1-p0)+2*u*t*(p2-p1)+t*t*(p3-p2))}
    const spawn=(isBus:boolean,edge:'T'|'B'|'L'|'R')=>{
      if(!cols.length||!rows.length)return
      let dir:Dir,sx:number,sy:number,sc:number
      if(edge==='L'){dir='R';const r=rows[Math.floor(Math.random()*rows.length)];sx=-50;sy=r+laneOff['R'];sc=r}
      else if(edge==='R'){dir='L';const r=rows[Math.floor(Math.random()*rows.length)];sx=W+50;sy=r+laneOff['L'];sc=r}
      else if(edge==='T'){dir='D';const c=cols[Math.floor(Math.random()*cols.length)];sx=c+laneOff['D'];sy=-50;sc=c}
      else{dir='U';const c=cols[Math.floor(Math.random()*cols.length)];sx=c+laneOff['U'];sy=H+50;sc=c}
      const spd=isBus?0.55+Math.random()*0.5:0.7+Math.random()*0.9
      const len=isBus?28:13,wid=isBus?10:6
      const ci=isBus?Math.floor(Math.random()*BC.length):-1
      const bc=isBus?BC[ci]:null,cc=!isBus?CC[Math.floor(Math.random()*CC.length)]:null
      const tp=isBus?0.25+Math.random()*0.2:Math.random()<0.4?0:Math.random()*0.18
      vehs.push({id:vid++,type:isBus?'bus':'car',ph:mkSeg(sx,sy,dir,sc),spd,waiting:false,wf:0,stuck:0,len,wid,bc:isBus?bc!.b:cc!,gc:isBus?bc!.g:cc!,op:isBus?0.8+Math.random()*0.15:0.55+Math.random()*0.3,cx:sx,cy:sy,ang:dirAngle[dir],tp,isY:isBus&&bc!.y,rp:[]})
    }
    const buildTurn=(v:Veh,inter:{cx:number,cy:number},nd:Dir):TurnSeg=>{
      const seg=v.ph as Seg,od=seg.dir,cp=LANE*1.4
      const p0x=v.cx,p0y=v.cy,p1x=p0x+DX[od]*cp,p1y=p0y+DY[od]*cp
      const newOff=laneOff[nd]
      let p3x:number,p3y:number
      if(nd==='R'||nd==='L'){p3x=inter.cx+DX[nd]*cp;p3y=inter.cy+newOff}
      else{p3x=inter.cx+newOff;p3y=inter.cy+DY[nd]*cp}
      return{type:'turn',p0x,p0y,p1x,p1y,p2x:p3x-DX[nd]*cp,p2y:p3y-DY[nd]*cp,p3x,p3y,t:0,spd:v.spd,toDir:nd}
    }
    const nearInter=(v:Veh)=>{
      if(v.ph.type!=='straight')return null
      const seg=v.ph as Seg,dx=DX[seg.dir],dy=DY[seg.dir]
      let best:any=null
      for(const cx of cols)for(const cy of rows){
        const proj=(cx-v.cx)*dx+(cy-v.cy)*dy
        if(proj<0||proj>60)continue
        if(Math.abs((cx-v.cx)*dy-(cy-v.cy)*dx)>LANE)continue
        if(!best||proj<best.dist)best={cx,cy,dist:proj}
      }
      return best
    }
    const isBlocked=(v:Veh)=>{
      if(v.ph.type!=='straight')return false
      const dx=DX[(v.ph as Seg).dir],dy=DY[(v.ph as Seg).dir],gap=v.len+5
      return vehs.some(o=>{
        if(o.id===v.id)return false
        const rx=o.cx-v.cx,ry=o.cy-v.cy,fwd=rx*dx+ry*dy
        if(fwd<=2||fwd>gap)return false
        return Math.abs(rx*dy-ry*dx)<v.wid+3
      })
    }
    const drawV=(v:Veh)=>{
      ctx.save();ctx.translate(v.cx,v.cy);ctx.rotate(v.ang)
      const hl=v.len/2,hw=v.wid/2,r=v.type==='bus'?2.5:1.6
      ctx.shadowColor=v.gc+'0.7)';ctx.shadowBlur=v.type==='bus'?10:5
      ctx.beginPath()
      ctx.moveTo(-hl+r,-hw);ctx.lineTo(hl-r,-hw);ctx.arcTo(hl,-hw,hl,-hw+r,r)
      ctx.lineTo(hl,hw-r);ctx.arcTo(hl,hw,hl-r,hw,r)
      ctx.lineTo(-hl+r,hw);ctx.arcTo(-hl,hw,-hl,hw-r,r)
      ctx.lineTo(-hl,-hw+r);ctx.arcTo(-hl,-hw,-hl+r,-hw,r)
      ctx.closePath()
      ctx.fillStyle=v.bc+v.op+')';ctx.strokeStyle=v.bc+Math.min(v.op+0.2,1)+')';ctx.lineWidth=0.6;ctx.fill();ctx.stroke()
      ctx.shadowBlur=0
      if(v.type==='bus'){
        ctx.fillStyle=v.bc+Math.min(v.op+0.3,1)+')'
        for(let i=0;i<3;i++){ctx.beginPath();ctx.roundRect(-hl+5+i*8,-hw+1.5,5.5,3,0.8);ctx.fill()}
        ctx.fillStyle='rgba(255,55,55,0.9)';ctx.shadowColor='rgba(255,55,55,0.8)';ctx.shadowBlur=6
        ctx.beginPath();ctx.roundRect(-hl+0.5,-hw+1,2,v.wid-2,0.5);ctx.fill()
        ctx.fillStyle='rgba(255,255,170,0.95)';ctx.shadowColor='rgba(255,255,200,0.9)';ctx.shadowBlur=10
        ctx.beginPath();ctx.arc(hl-2,-hw+2,1.4,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(hl-2,hw-2,1.4,0,Math.PI*2);ctx.fill()
      }else{
        ctx.fillStyle=v.bc+Math.min(v.op+0.2,1)+')'
        ctx.beginPath();ctx.roundRect(-hl+2,-hw+1.2,v.len*0.5,v.wid-2.4,1);ctx.fill()
        ctx.fillStyle='rgba(255,55,55,0.85)';ctx.shadowColor='rgba(255,55,55,0.6)';ctx.shadowBlur=4
        ctx.beginPath();ctx.roundRect(-hl+0.5,-hw+1,1.5,v.wid-2,0.5);ctx.fill()
        ctx.fillStyle='rgba(255,255,170,0.9)';ctx.shadowColor='rgba(255,255,200,0.8)';ctx.shadowBlur=7
        ctx.beginPath();ctx.arc(hl-1.5,-hw+1.6,1.1,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(hl-1.5,hw-1.6,1.1,0,Math.PI*2);ctx.fill()
      }
      ctx.shadowBlur=0
      const bLen=v.type==='bus'?22:14,beam=ctx.createLinearGradient(hl,0,hl+bLen,0)
      beam.addColorStop(0,'rgba(255,255,200,0.12)');beam.addColorStop(1,'rgba(255,255,200,0)')
      ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(hl,-hw);ctx.lineTo(hl+bLen,-hw-6);ctx.lineTo(hl+bLen,hw+6);ctx.lineTo(hl,hw);ctx.closePath();ctx.fill()
      ctx.restore()
    }
    const drawLight=(cx:number,cy:number,st:string)=>{
      if(st==='n')return
      ;[[-ROAD/2-8,-ROAD/2-8],[ROAD/2+8,-ROAD/2-8]].forEach(([ox,oy])=>{
        const lx=cx+ox,ly=cy+oy
        ctx.strokeStyle='rgba(184,200,224,0.3)';ctx.lineWidth=1.5
        ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx,ly+10);ctx.stroke()
        ctx.fillStyle='rgba(16,22,34,0.95)';ctx.strokeStyle='rgba(184,200,224,0.2)';ctx.lineWidth=0.7
        ctx.beginPath();ctx.roundRect(lx-4,ly-13,8,13,2);ctx.fill();ctx.stroke()
        const red=st==='v'||st==='y',grn=st==='h'
        ctx.fillStyle=red?'rgba(255,50,50,0.95)':'rgba(255,50,50,0.15)';ctx.shadowColor=red?'rgba(255,50,50,0.8)':'transparent';ctx.shadowBlur=red?8:0
        ctx.beginPath();ctx.arc(lx,ly-10,1.8,0,Math.PI*2);ctx.fill()
        ctx.fillStyle=grn?'rgba(34,211,160,0.95)':'rgba(34,211,160,0.15)';ctx.shadowColor=grn?'rgba(34,211,160,0.8)':'transparent';ctx.shadowBlur=grn?8:0
        ctx.beginPath();ctx.arc(lx,ly-4,1.8,0,Math.PI*2);ctx.fill()
        ctx.shadowBlur=0
      })
    }
    for(let i=0;i<18;i++)spawn(true,(['T','B','L','R']as const)[i%4])
    for(let i=0;i<38;i++)spawn(false,(['T','B','L','R']as const)[i%4])
    let frame=0,spawnT=0,animId:number
    const leftOf:Record<Dir,Dir>={R:'U',L:'D',D:'R',U:'L'}
    const rightOf:Record<Dir,Dir>={R:'D',L:'U',D:'L',U:'R'}
    const update=()=>{
      cols=getCols();rows=getRows()
      for(let i=vehs.length-1;i>=0;i--){
        const v=vehs[i]
        if(v.cx<-120||v.cx>W+120||v.cy<-120||v.cy>H+120){vehs.splice(i,1);continue}
        if(v.ph.type==='turn'){
          const ts=v.ph as TurnSeg
          ts.t+=ts.spd*0.022
          if(ts.t>=1){
            ts.t=1;v.cx=ts.p3x;v.cy=ts.p3y
            const nd=ts.toDir
            if(nd==='R'||nd==='L'){const nr=rows.reduce((a,b)=>Math.abs(b-(ts.p3y-laneOff[nd]))<Math.abs(a-(ts.p3y-laneOff[nd]))?b:a,rows[0]||0);v.ph=mkSeg(ts.p3x,ts.p3y,nd,nr);v.cy=nr+laneOff[nd];v.cx=ts.p3x}
            else{const nc=cols.reduce((a,b)=>Math.abs(b-(ts.p3x-laneOff[nd]))<Math.abs(a-(ts.p3x-laneOff[nd]))?b:a,cols[0]||0);v.ph=mkSeg(ts.p3x,ts.p3y,nd,nc);v.cx=nc+laneOff[nd];v.cy=ts.p3y}
            v.ang=dirAngle[nd];v.stuck=0;v.waiting=false
          }else{
            v.cx=bez(ts.p0x,ts.p1x,ts.p2x,ts.p3x,ts.t);v.cy=bez(ts.p0y,ts.p1y,ts.p2y,ts.p3y,ts.t)
            const bdx=bezD(ts.p0x,ts.p1x,ts.p2x,ts.p3x,ts.t),bdy=bezD(ts.p0y,ts.p1y,ts.p2y,ts.p3y,ts.t)
            if(Math.abs(bdx)+Math.abs(bdy)>0.01)v.ang=Math.atan2(bdy,bdx)
          }
          if(v.isY&&v.rp.length<800)v.rp.push([v.cx,v.cy])
          continue
        }
        if(v.waiting){v.wf--;v.stuck++;if(v.wf<=0||v.stuck>200){v.waiting=false;v.stuck=0}continue}
        const seg=v.ph as Seg,inter=nearInter(v)
        if(inter&&inter.dist<22){
          const st=lState(inter.cx,inter.cy,frame)
          const isH=seg.dir==='R'||seg.dir==='L'
          const green=(isH&&st==='h')||(!isH&&st==='v')||st==='n'
          if(!green){v.waiting=true;v.wf=12;continue}
          const occ=vehs.some(o=>{if(o.id===v.id)return false;return Math.abs(o.cx-inter.cx)<ROAD*0.9&&Math.abs(o.cy-inter.cy)<ROAD*0.9})
          if(occ){v.waiting=true;v.wf=8;continue}
          if(v.tp>0){
            const rand=Math.random()
            let chosen=seg.dir
            if(rand<v.tp)chosen=leftOf[seg.dir]
            else if(rand<v.tp*2)chosen=rightOf[seg.dir]
            if(chosen!==seg.dir){v.ph=buildTurn(v,inter,chosen);continue}
          }
        }
        if(isBlocked(v)){v.waiting=true;v.wf=6;continue}
        const dx=DX[seg.dir],dy=DY[seg.dir]
        v.cx+=dx*v.spd;v.cy+=dy*v.spd
        if(seg.dir==='R'||seg.dir==='L')v.cy=seg.sc+laneOff[seg.dir]
        else v.cx=seg.sc+laneOff[seg.dir]
        v.ang=dirAngle[seg.dir]
        if(v.isY&&v.rp.length<800)v.rp.push([v.cx,v.cy])
      }
    }
    const render=()=>{
      ctx.clearRect(0,0,W,H)
      rows.forEach(sy=>{
        ctx.fillStyle='rgba(15,21,33,0.93)';ctx.fillRect(0,sy-ROAD/2,W,ROAD)
        ctx.strokeStyle='rgba(184,200,224,0.16)';ctx.lineWidth=0.8
        ctx.beginPath();ctx.moveTo(0,sy-ROAD/2);ctx.lineTo(W,sy-ROAD/2);ctx.stroke()
        ctx.beginPath();ctx.moveTo(0,sy+ROAD/2);ctx.lineTo(W,sy+ROAD/2);ctx.stroke()
        ctx.strokeStyle='rgba(240,180,40,0.3)';ctx.lineWidth=0.9;ctx.setLineDash([9,13])
        ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(W,sy);ctx.stroke();ctx.setLineDash([])
      })
      cols.forEach(sx=>{
        ctx.fillStyle='rgba(15,21,33,0.93)';ctx.fillRect(sx-ROAD/2,0,ROAD,H)
        ctx.strokeStyle='rgba(184,200,224,0.16)';ctx.lineWidth=0.8
        ctx.beginPath();ctx.moveTo(sx-ROAD/2,0);ctx.lineTo(sx-ROAD/2,H);ctx.stroke()
        ctx.beginPath();ctx.moveTo(sx+ROAD/2,0);ctx.lineTo(sx+ROAD/2,H);ctx.stroke()
        ctx.strokeStyle='rgba(240,180,40,0.3)';ctx.lineWidth=0.9;ctx.setLineDash([9,13])
        ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,H);ctx.stroke();ctx.setLineDash([])
      })
      cols.forEach(sx=>rows.forEach(sy=>{ctx.fillStyle='rgba(18,26,40,0.97)';ctx.fillRect(sx-ROAD/2,sy-ROAD/2,ROAD,ROAD)}))
      cols.forEach(sx=>rows.forEach(sy=>drawLight(sx,sy,lState(sx,sy,frame))))
      vehs.filter(v=>v.isY&&v.rp.length>1).forEach(v=>{
        ctx.save();ctx.strokeStyle='rgba(250,200,40,0.15)';ctx.lineWidth=1.5;ctx.setLineDash([6,10]);ctx.lineCap='round'
        ctx.beginPath();v.rp.forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py));ctx.stroke()
        ctx.setLineDash([]);ctx.restore()
      })
      vehs.filter(v=>v.type==='car').forEach(drawV)
      vehs.filter(v=>v.type==='bus').forEach(drawV)
      spawnT++;if(spawnT>90&&vehs.length<70){spawn(Math.random()<0.38,(['T','B','L','R']as const)[Math.floor(Math.random()*4)]);spawnT=0}
      frame++;update();animId=requestAnimationFrame(render)
    }
    render()
    return()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(animId)}
  },[])
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0}}/>
}

function Input({type='text',placeholder,value,onChange,right}:{type?:string;placeholder:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;right?:React.ReactNode}) {
  const [f,setF]=useState(false)
  return (
    <div style={{position:'relative'}}>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} required
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:'100%',padding:'13px 44px 13px 16px',background:f?'rgba(255,255,255,0.09)':'rgba(255,255,255,0.05)',border:`1px solid ${f?'rgba(255,255,255,0.28)':'rgba(255,255,255,0.1)'}`,borderRadius:'10px',color:'#E8ECF2',fontSize:'14px',fontFamily:'DM Sans,sans-serif',outline:'none',transition:'all 180ms',boxSizing:'border-box' as const}}
      />
      <div style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',color:f?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.25)',display:'flex',alignItems:'center'}}>{right}</div>
    </div>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email:'', password:'', name:'', age:'', weeklyTrips:'' })
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}))

  const loginWithGoogle = async () => supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/auth/callback`}})

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setLoading(true)

    if (mode === 'login') {
      let email = form.email

      // Username login (e.g. Linea12) — resolve to email in two steps
      if (!email.includes('@')) {
        const { data: company, error: cErr } = await supabase
          .from('bus_companies')
          .select('profile_id')
          .ilike('username', email.trim())
          .single()
        if (cErr || !company) { toast.error('Usuario no encontrado'); setLoading(false); return }

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', company.profile_id)
          .single()
        if (pErr || !prof) { toast.error('Error al obtener cuenta'); setLoading(false); return }
        email = prof.email
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (error) { toast.error('Credenciales incorrectas'); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role === 'superadmin') window.location.href = '/admin/super'
      else if (p?.role === 'company') window.location.href = '/admin/company'
      else if (p?.role === 'driver') window.location.href = '/driver'
      else window.location.href = '/'

    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name, role: 'user' } },
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          age: parseInt(form.age) || 0,
          weekly_trips: parseInt(form.weeklyTrips) || 0,
        })
      }
      toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
      setMode('login')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'#07090F',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>
      <CityBackground/>
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse at center,rgba(7,9,15,0.05) 0%,rgba(7,9,15,0.58) 100%)',zIndex:1,pointerEvents:'none'}}/>

      <motion.div initial={{opacity:0,y:28,scale:0.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}} style={{width:'100%',maxWidth:'360px',position:'relative',zIndex:2}}>

        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <motion.div style={{width:'52px',height:'52px',borderRadius:'16px',background:'linear-gradient(145deg,rgba(34,211,160,0.18),rgba(34,211,160,0.06))',border:'1px solid rgba(34,211,160,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 11px'}} animate={{boxShadow:['0 0 16px rgba(34,211,160,0.15)','0 0 40px rgba(34,211,160,0.32)','0 0 16px rgba(34,211,160,0.15)']}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}>
            <Bus size={24} style={{color:'#22D3A0'}}/>
          </motion.div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'28px',color:'#fff',letterSpacing:'-0.02em',margin:0,textShadow:'0 2px 24px rgba(0,0,0,0.9)'}}>Bien Parada</h1>
          <p style={{color:'rgba(255,255,255,0.28)',fontSize:'12px',marginTop:'4px'}}>Seguí tu colectivo en tiempo real</p>
        </div>

        <div style={{background:'rgba(12,16,26,0.82)',backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',overflow:'hidden',position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,0.8),0 1px 0 rgba(255,255,255,0.07) inset'}}>
          <div style={{position:'absolute',top:0,left:'25%',right:'25%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)'}}/>

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'28px 24px 30px'}}>

              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'20px',color:'#fff',textAlign:'center',margin:'0 0 20px'}}>
                {mode==='login' ? 'Ingresar' : 'Crear cuenta'}
              </h2>

              {/* Mode toggle */}
              <div style={{display:'flex',gap:'2px',padding:'3px',background:'rgba(0,0,0,0.4)',borderRadius:'10px',marginBottom:'20px'}}>
                {(['login','register'] as Mode[]).map(m=>(
                  <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'12px',fontFamily:'Syne,sans-serif',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,border:'none',cursor:'pointer',transition:'all 180ms',background:mode===m?'rgba(255,255,255,0.1)':'transparent',color:mode===m?'#fff':'rgba(255,255,255,0.3)'}}>
                    {m==='login'?'Ingresar':'Registrarse'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {mode==='register' && (
                  <Input type="text" placeholder="Tu nombre" value={form.name} onChange={set('name')} right={<User size={15}/>}/>
                )}

                <Input
                  type="text"
                  placeholder={mode==='login' ? 'Email o usuario (ej: Linea12)' : 'Email'}
                  value={form.email} onChange={set('email')}
                  right={<Mail size={15}/>}
                />

                <Input
                  type={showPass?'text':'password'} placeholder="Contraseña"
                  value={form.password} onChange={set('password')}
                  right={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',display:'flex',padding:0}}>{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
                />

                {mode==='register' && (<>
                  <Input type="number" placeholder="Edad" value={form.age} onChange={set('age')} right={<Calendar size={15}/>}/>
                  <Input type="number" placeholder="Veces por semana que tomás el colectivo" value={form.weeklyTrips} onChange={set('weeklyTrips')} right={<BarChart2 size={15}/>}/>
                </>)}

                <motion.button type="submit" disabled={loading} whileHover={{scale:loading?1:1.02}} whileTap={{scale:loading?1:0.98}}
                  style={{width:'100%',padding:'13px',marginTop:'4px',background:loading?'rgba(255,255,255,0.6)':'#ffffff',color:'#07090F',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'14px',letterSpacing:'0.03em',border:'none',borderRadius:'10px',cursor:loading?'not-allowed':'pointer',boxShadow:'0 4px 24px rgba(255,255,255,0.12)',transition:'all 250ms',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  {loading?'Cargando...':(mode==='login'?'Ingresar':'Crear cuenta')}
                  {!loading&&<ArrowRight size={15}/>}
                </motion.button>
              </form>

              <p style={{textAlign:'center',fontSize:'12px',color:'rgba(255,255,255,0.28)',marginTop:'15px',marginBottom:0}}>
                {mode==='login'?'¿No tenés cuenta? ':'¿Ya tenés cuenta? '}
                <button onClick={()=>setMode(mode==='login'?'register':'login')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.65)',fontWeight:600,fontSize:'12px',fontFamily:'DM Sans',padding:0,textDecoration:'underline',textUnderlineOffset:'2px'}}>
                  {mode==='login'?'Registrarse':'Ingresar'}
                </button>
              </p>

              {mode==='login' && (<>
                <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'15px 0 12px'}}>
                  <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/><span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',fontFamily:'DM Mono',letterSpacing:'0.08em'}}>O</span><div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>
                </div>
                <button onClick={loginWithGoogle} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'12px',color:'rgba(255,255,255,0.45)',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                  <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continuar con Google
                </button>
              </>)}

              <p style={{textAlign:'center',fontSize:'9px',color:'rgba(255,255,255,0.1)',fontFamily:'DM Mono',marginTop:'16px',letterSpacing:'0.04em'}}>
                Choferes: ingresan con email y contraseña
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}