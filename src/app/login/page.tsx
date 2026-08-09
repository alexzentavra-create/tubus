'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Mail, Lock, Eye, EyeOff, ArrowRight, User, BarChart2, Calendar, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getStoredGeneralTerms } from '@/lib/termsData'
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
      
      // Ensure spawn position is clear to prevent immediate overlapping collisions
      const isClear = !vehs.some(o => Math.hypot(o.cx - sx, o.cy - sy) < 50)
      if(!isClear) return

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
      const fx=Math.cos(v.ang),fy=Math.sin(v.ang),px=-fy,py=fx
      // Reduce safe distance as the vehicle is stuck longer to resolve deadlocks
      let stuckFactor = 1.0
      if (v.stuck > 15) {
        stuckFactor = Math.max(0, 1 - (v.stuck - 15) / 35) // goes to 0 at stuck >= 50
      }
      if (stuckFactor === 0) return false // Creep/nudge forward to break deadlocks
      
      const safeDist = (v.len/2 + 18) * stuckFactor
      return vehs.some(o=>{
        if(o.id===v.id)return false
        const rx=o.cx-v.cx,ry=o.cy-v.cy,fwd=rx*fx+ry*fy
        if(fwd<=1||fwd>(safeDist+o.len/2))return false
        const side=rx*px+ry*py
        const laneWidth=(v.wid/2+o.wid/2+3)
        return Math.abs(side)<laneWidth
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
    for(let i=0;i<45;i++)spawn(true,(['T','B','L','R']as const)[i%4])
    for(let i=0;i<100;i++)spawn(false,(['T','B','L','R']as const)[i%4])
    let frame=0,spawnT=0,animId:number
    const leftOf:Record<Dir,Dir>={R:'U',L:'D',D:'R',U:'L'}
    const rightOf:Record<Dir,Dir>={R:'D',L:'U',D:'L',U:'R'}
    const update=()=>{
      cols=getCols();rows=getRows()
      for(let i=vehs.length-1;i>=0;i--){
        const v=vehs[i]
        if(v.cx<-120||v.cx>W+120||v.cy<-120||v.cy>H+120){vehs.splice(i,1);continue}
        if(v.waiting){
          v.wf--;
          v.stuck++;
          if(v.stuck > 240){
            vehs.splice(i,1)
            continue
          }
          if(v.wf<=0){
            v.waiting=false
          }
          continue
        }
        if(isBlocked(v)){v.waiting=true;v.wf=8;continue}
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
            v.stuck=0
          }
          if(v.isY&&v.rp.length<800)v.rp.push([v.cx,v.cy])
          continue
        }
        const seg=v.ph as Seg,inter=nearInter(v)
        if(inter&&inter.dist<22){
          const st=lState(inter.cx,inter.cy,frame)
          const isH=seg.dir==='R'||seg.dir==='L'
          const green=(isH&&st==='h')||(!isH&&st==='v')||st==='n'
          if(!green){v.waiting=true;v.wf=12;continue}
          const occ=vehs.some(o=>{if(o.id===v.id)return false;return Math.abs(o.cx-inter.cx)<ROAD*0.9&&Math.abs(o.cy-inter.cy)<ROAD*0.9})
          if(occ){v.waiting=true;v.wf=8;continue}
          
          // Check if there are any stuck vehicles on the street segment up to 200 pixels down
          const isStreetStuck = (d: Dir, maxDist = 200) => {
            return vehs.some(o => {
              if (o.id === v.id) return false
              const rx = o.cx - inter.cx, ry = o.cy - inter.cy
              const fwd = rx * DX[d] + ry * DY[d]
              if (fwd > 5 && fwd < maxDist && Math.abs(rx * DY[d] - ry * DX[d]) < LANE) {
                return o.waiting && o.stuck > 15
              }
              return false
            })
          }

          const dStraight = seg.dir
          const dLeft = leftOf[seg.dir]
          const dRight = rightOf[seg.dir]

          // Check if immediately blocked or has a stuck vehicle ahead
          const straightBlocked = vehs.some(o => {
            if(o.id===v.id)return false
            const rx=o.cx-inter.cx,ry=o.cy-inter.cy
            const fwd=rx*DX[dStraight]+ry*DY[dStraight]
            return fwd>5 && fwd<110 && Math.abs(rx*DY[dStraight]-ry*DX[dStraight])<LANE
          }) || isStreetStuck(dStraight)

          const leftBlocked = vehs.some(o => {
            if(o.id===v.id)return false
            const rx=o.cx-inter.cx,ry=o.cy-inter.cy
            const fwd=rx*DX[dLeft]+ry*DY[dLeft]
            return fwd>5 && fwd<80 && Math.abs(rx*DX[dLeft]-ry*DX[dLeft])<LANE
          }) || isStreetStuck(dLeft)

          const rightBlocked = vehs.some(o => {
            if(o.id===v.id)return false
            const rx=o.cx-inter.cx,ry=o.cy-inter.cy
            const fwd=rx*DX[dRight]+ry*DY[dRight]
            return fwd>5 && fwd<80 && Math.abs(rx*DX[dRight]-ry*DX[dRight])<LANE
          }) || isStreetStuck(dRight)

          let chosen = dStraight
          const options: Dir[] = []
          if (!straightBlocked) options.push(dStraight)
          if (!leftBlocked) options.push(dLeft)
          if (!rightBlocked) options.push(dRight)

          if (options.length > 0) {
            let preferred = dStraight
            if (v.tp > 0) {
              const rand = Math.random()
              if (rand < v.tp) preferred = dLeft
              else if (rand < v.tp * 2) preferred = dRight
            }

            if (options.includes(preferred)) {
              chosen = preferred
            } else {
              chosen = options[Math.floor(Math.random() * options.length)]
            }
          } else {
            chosen = Math.random() < 0.5 ? dStraight : (Math.random() < 0.5 ? dLeft : dRight)
          }

          if(chosen!==seg.dir){
            v.ph=buildTurn(v,inter,chosen)
            v.waiting=false
            v.wf=0
            v.stuck=0
            continue
          }
        }
        const dx=DX[seg.dir],dy=DY[seg.dir]
        v.cx+=dx*v.spd;v.cy+=dy*v.spd
        if(seg.dir==='R'||seg.dir==='L')v.cy=seg.sc+laneOff[seg.dir]
        else v.cx=seg.sc+laneOff[seg.dir]
        v.ang=dirAngle[seg.dir]
        v.stuck=0
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
      spawnT++;if(spawnT>25&&vehs.length<220){spawn(Math.random()<0.35,(['T','B','L','R']as const)[Math.floor(Math.random()*4)]);spawnT=0}
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
        style={{
          width:'100%',
          padding:'11px 40px 11px 14px',
          background:f?'rgba(10,14,20,0.9)':'rgba(6,8,16,0.7)',
          border:'1px solid rgba(184,200,224,0.12)',
          borderRadius:'var(--r-sm)',
          color:'var(--text-primary)',
          fontSize:'14px',
          fontFamily:'DM Sans,sans-serif',
          outline:'none',
          transition:'all var(--t-fast) var(--ease-in-out)',
          boxShadow:'0 2px 8px rgba(0,0,0,0.3) inset',
          boxSizing:'border-box' as const
        }}
      />
      <div style={{position:'absolute',right:'16px',top:'50%',transform:'translateY(-50%)',color:f?'var(--platinum)':'var(--text-secondary)',display:'flex',alignItems:'center',opacity:0.8}}>{right}</div>
    </div>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [generalTermsText, setGeneralTermsText] = useState(getStoredGeneralTerms())

  useEffect(() => {
    const syncTerms = () => setGeneralTermsText(getStoredGeneralTerms())
    window.addEventListener('storage', syncTerms)
    return () => window.removeEventListener('storage', syncTerms)
  }, [])
  const [city, setCity] = useState('buenos_aires')
  const [form, setForm] = useState({ email:'', password:'', name:'', phone:'', age:'', weeklyTrips:'' })
  const [bannedEmail, setBannedEmail] = useState<string | null>(null)
  const [showAppealForm, setShowAppealForm] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}))

  const loginWithGoogle = async () => supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/auth/callback`}})

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setLoading(true)

    if (!acceptTerms) {
      toast.error('Debe aceptar los términos y condiciones para continuar')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      let email = form.email
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'

      // Mock login bypass ONLY when running without database credentials (placeholder Supabase URL)
      if (url.includes('placeholder.supabase.co')) {
        const lowerEmail = email.trim().toLowerCase()
        const pass = form.password.trim()  // keep original casing for password comparison
        const passLower = pass.toLowerCase() // used only for legacy hardcoded accounts
        const bannedList = JSON.parse(localStorage.getItem('banned_users') || '[]')
        if (bannedList.includes(lowerEmail)) {
          setBannedEmail(lowerEmail)
          setLoading(false)
          return
        }

        localStorage.setItem('selected_city', city)

        // Check if email is in deleted super admins list
        const deletedSuperAdmins = JSON.parse(localStorage.getItem('deleted_super_admins') || '[]')
        if (deletedSuperAdmins.includes(lowerEmail)) {
          toast.error('Esta cuenta de Super Administrador ha sido eliminada permanentemente.')
          setLoading(false)
          return
        }

        // 1. Check Super Admin (`admin@admin.com` with password `Admin`)
        if (lowerEmail === 'admin@admin.com') {
          if (pass === 'Admin' || pass === 'admin') {
            localStorage.setItem('active_user', JSON.stringify({
              name: 'Super Admin',
              email: 'admin@admin.com',
              password: 'Admin',
              role: 'superadmin'
            }))
            window.location.href = '/admin/super'
            return
          } else {
            toast.error('Contraseña incorrecta para Super Administrador.')
            setLoading(false)
            return
          }
        }

        // 2. Check Line Admin Accounts (`linea{N}@bienparada.ar`, `amarillo@bienparada.ar`, `roja@bienparada.ar`)
        let lineAdminMatchNum: string | null = null
        if (lowerEmail === 'linea12@bienparada.ar' || lowerEmail === 'linea12@bienparada.com') lineAdminMatchNum = '12'
        else if (lowerEmail === 'linea0@bienparada.ar' || lowerEmail === 'linea0@bienparada.com') lineAdminMatchNum = '0'
        else if (lowerEmail === 'linea28@bienparada.ar') lineAdminMatchNum = '28'
        else if (lowerEmail === 'linea37@bienparada.ar') lineAdminMatchNum = '37'
        else if (lowerEmail === 'linea39@bienparada.ar') lineAdminMatchNum = '39'
        else if (lowerEmail === 'linea59@bienparada.ar') lineAdminMatchNum = '59'
        else if (lowerEmail === 'linea60@bienparada.ar') lineAdminMatchNum = '60'
        else if (lowerEmail === 'linea102@bienparada.ar') lineAdminMatchNum = '102'
        else if (lowerEmail === 'linea152@bienparada.ar') lineAdminMatchNum = '152'
        else if (lowerEmail === 'amarillo@bienparada.ar' || lowerEmail.includes('t-amarillo')) lineAdminMatchNum = 'T-Amarillo'
        else if (lowerEmail === 'roja@bienparada.ar' || lowerEmail.includes('t-rojo')) lineAdminMatchNum = 'T-Rojo'
        else if (lowerEmail.startsWith('linea') && lowerEmail.endsWith('@bienparada.ar')) {
          lineAdminMatchNum = lowerEmail.replace('linea', '').replace('@bienparada.ar', '')
        }

        if (lineAdminMatchNum !== null) {
          if (pass === 'Bienparada' || pass.toLowerCase() === 'bienparada' || pass === 'linea12pass') {
            localStorage.setItem('active_company_line', lineAdminMatchNum)
            localStorage.setItem('active_user', JSON.stringify({
              role: 'company_admin',
              lineNumber: lineAdminMatchNum,
              email: lowerEmail,
              password: 'Bienparada'
            }))
            window.location.href = '/admin/company'
            return
          } else {
            toast.error('Contraseña incorrecta para el Administrador de Línea.')
            setLoading(false)
            return
          }
        }

        // 3. Check Driver Accounts (Marcos, Carlos, Néstor, Roberto & registered choferes)
        let driverAccount: any = null
        if (lowerEmail === 'marcos@linea0.ar' || lowerEmail.includes('marcos.diaz') || lowerEmail === 'marcos@linea0.com') {
          driverAccount = { name: 'Marcos Díaz', email: lowerEmail, lineNumber: '0', defaultPass: 'Bienparada' }
        } else if (lowerEmail === 'carlos@linea0.ar' || lowerEmail.includes('carlos.martinez') || lowerEmail === 'carlos@linea0.com') {
          driverAccount = { name: 'Carlos Martínez', email: lowerEmail, lineNumber: '0', defaultPass: 'Bienparada' }
        } else if (lowerEmail === 'nestor@linea12.ar' || lowerEmail.includes('nestor.garcia') || lowerEmail === 'nestor@nestor.ar') {
          driverAccount = { name: 'Néstor García', email: lowerEmail, lineNumber: '12', defaultPass: 'Bienparada' }
        } else if (lowerEmail === 'roberto@linea12.ar' || lowerEmail.includes('roberto.sanchez')) {
          driverAccount = { name: 'Roberto Sánchez', email: lowerEmail, lineNumber: '12', defaultPass: 'Bienparada' }
        }

        if (driverAccount) {
          if (pass === 'Bienparada' || pass === driverAccount.defaultPass || pass.toLowerCase() === 'bienparada' || pass === 'Nestor123!') {
            const userObj = {
              name: driverAccount.name,
              email: lowerEmail,
              password: pass,
              role: 'driver',
              lineNumber: driverAccount.lineNumber
            }
            localStorage.setItem('active_user', JSON.stringify(userObj))
            localStorage.setItem('mock_driver_identity', JSON.stringify({
              name: driverAccount.name,
              email: lowerEmail,
              lineNumber: driverAccount.lineNumber,
              driverId: `driver-${lowerEmail}`
            }))
            window.location.href = '/driver'
            return
          } else {
            toast.error('Contraseña incorrecta para Chofer.')
            setLoading(false)
            return
          }
        }

        // 4. Check Registered Accounts in `mock_users` or `bu_registered_users` or baseline users
        let foundUser: any = null
        try {
          const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
          const registeredUsers = JSON.parse(localStorage.getItem('bu_registered_users') || '[]')
          const allUsers = [...mockUsers, ...registeredUsers]

          const emailMatch = allUsers.find((u: any) => u.email && u.email.toLowerCase() === lowerEmail)
          if (emailMatch) {
            const passwordOk = emailMatch.password === pass || emailMatch.password?.toLowerCase() === pass.toLowerCase()
            if (!passwordOk) {
              toast.error('Contraseña incorrecta. Verifique sus credenciales.')
              setLoading(false)
              return
            }
            foundUser = emailMatch
          }

          if (foundUser) {
            localStorage.setItem('active_user', JSON.stringify(foundUser))
            if (foundUser.role === 'driver') {
              localStorage.setItem('mock_driver_identity', JSON.stringify({
                name: foundUser.name,
                email: foundUser.email,
                lineNumber: foundUser.lineNumber || '0',
                driverId: `driver-${foundUser.email}`
              }))
              window.location.href = '/driver'
            } else if (foundUser.role === 'company_admin' || foundUser.role === 'admin') {
              window.location.href = '/admin/company'
            } else if (foundUser.role === 'superadmin') {
              window.location.href = '/admin/super'
            } else {
              window.location.href = `/?city=${city}`
            }
            setLoading(false)
            return
          }
        } catch (e) {
          console.error(e)
        }

        // Baseline passenger accounts: usuario@usuario.com & alejandro.finochietti@yahoo.com.ar
        if (lowerEmail === 'usuario@usuario.com' || lowerEmail === 'usuario@usuario') {
          if (pass === 'Usuario' || pass.toLowerCase() === 'usuario') {
            localStorage.setItem('active_user', JSON.stringify({
              name: 'Usuario Prueba',
              email: 'usuario@usuario.com',
              password: 'Usuario',
              role: 'user'
            }))
            window.location.href = `/?city=${city}`
            return
          } else {
            toast.error('Contraseña incorrecta.')
            setLoading(false)
            return
          }
        }

        if (lowerEmail === 'alejandro.finochietti@yahoo.com.ar' || lowerEmail.includes('alejandro.finochietti')) {
          if (pass === 'Afodes18' || pass.toLowerCase() === 'afodes18' || pass === 'password123') {
            localStorage.setItem('active_user', JSON.stringify({
              name: 'Alejandro Finochietti',
              email: 'alejandro.finochietti@yahoo.com.ar',
              password: 'Afodes18',
              role: 'user'
            }))
            window.location.href = `/?city=${city}`
            return
          } else {
            toast.error('Contraseña incorrecta.')
            setLoading(false)
            return
          }
        }

        // Unrecognized account — HALT with error message
        toast.error('Usuario o contraseña incorrectos. Si no tenés cuenta, podés Registrarte.')
        setLoading(false)
        return
        setLoading(false)
        return
      }

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

      const lowerEmail = email.trim().toLowerCase()
      const bannedList = JSON.parse(localStorage.getItem('banned_users') || '[]')
      if (bannedList.includes(lowerEmail)) {
        setBannedEmail(lowerEmail)
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (error) { toast.error('Credenciales incorrectas'); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      
      localStorage.setItem('selected_city', city)

      if (p?.role === 'superadmin') window.location.href = '/admin/super'
      else if (p?.role === 'company') window.location.href = '/admin/company'
      else if (p?.role === 'driver') window.location.href = '/driver'
      else window.location.href = `/?city=${city}`

    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
      if (url.includes('placeholder.supabase.co')) {
        try {
          const userId = 'usr_' + Date.now()
          const newUserData = {
            id: userId,
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password.trim(),
            phone: form.phone.trim() || '+54 11 5555-5555',
            age: parseInt(form.age) || 25,
            role: 'user',
            joinedDate: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
            status: 'Activo',
            searches: 0,
            trips: 0,
            rating: 5.0,
            favLines: [],
            behavior: 'Usuario registrado en la plataforma.',
            city: city || 'Buenos Aires',
            province: 'Buenos Aires'
          }

          // 1. Save to mock_users
          const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
          const filteredMock = mockUsers.filter((u: any) => u.email?.toLowerCase() !== newUserData.email)
          filteredMock.push(newUserData)
          localStorage.setItem('mock_users', JSON.stringify(filteredMock))

          // 2. Save to bu_registered_users
          const registeredUsers = JSON.parse(localStorage.getItem('bu_registered_users') || '[]')
          const filteredReg = registeredUsers.filter((u: any) => u.email?.toLowerCase() !== newUserData.email)
          filteredReg.push(newUserData)
          localStorage.setItem('bu_registered_users', JSON.stringify(filteredReg))

          // 3. Set active_user & explicit profile localStorage keys for this exact user
          localStorage.setItem('active_user', JSON.stringify(newUserData))
          localStorage.setItem('profile_name', newUserData.name)
          localStorage.setItem('tu_bus_profile_name', newUserData.name)
          localStorage.setItem('profile_email', newUserData.email)
          localStorage.setItem('tu_bus_profile_email', newUserData.email)
          localStorage.setItem('profile_phone', newUserData.phone)
          localStorage.setItem('tu_bus_profile_phone', newUserData.phone)

          // 4. Initialize clean 0 state for new user
          localStorage.setItem('bu_search_history_' + userId, JSON.stringify([]))
          localStorage.setItem('bu_user_ads_' + userId, JSON.stringify([]))
          localStorage.setItem('bu_user_points_' + userId, '0')
        } catch (e) {
          console.error(e)
        }
        toast.success('¡Cuenta registrada con éxito! Ya podés ingresar.')
        setMode('login')
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
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 12px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>
      <CityBackground/>
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse at center,rgba(6,8,16,0.1) 0%,rgba(6,8,16,0.65) 100%)',zIndex:1,pointerEvents:'none'}}/>

      <motion.div initial={{opacity:0,y:28,scale:0.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}} style={{width:'100%',maxWidth:'320px',position:'relative',zIndex:2}}>

        <div style={{textAlign:'center',marginBottom:'12px'}}>
          <motion.div style={{
            width:'44px',height:'44px',borderRadius:'12px',
            border:'1px solid rgba(184,200,224,0.15)',
            overflow: 'hidden',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 8px',
            background: 'var(--elevated)'
          }} animate={{boxShadow:['0 0 16px rgba(34,211,160,0.1)','0 0 32px rgba(34,211,160,0.24)','0 0 16px rgba(34,211,160,0.1)']}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}>
            <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'26px',color:'var(--text-primary)',letterSpacing:'0.04em',margin:0,textShadow:'0 2px 24px rgba(0,0,0,0.5)'}}>Bien Parada</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'11px',marginTop:'2px',fontFamily:'DM Sans,sans-serif'}}>Seguí tu colectivo en tiempo real</p>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, rgba(13,17,23,0.97) 0%, rgba(6,8,16,0.99) 100%)',
          backdropFilter: 'blur(32px) saturate(120%)',
          WebkitBackdropFilter: 'blur(32px) saturate(120%)',
          border: '1px solid rgba(184,200,224,0.07)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 12px 60px rgba(0,0,0,0.9), 0 1px 0 rgba(184,200,224,0.05) inset'
        }}>
          <div style={{position:'absolute',top:0,left:'20px',right:'20px',height:'1px',background:'linear-gradient(90deg,transparent,rgba(184,200,224,0.2),transparent)'}}/>

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'18px 16px 20px'}}>

              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'var(--text-primary)',textAlign:'center',margin:'0 0 12px'}}>
                {mode==='login' ? 'Ingresar' : 'Crear cuenta'}
              </h2>

              {/* Mode toggle */}
              <div style={{display:'flex',gap:'4px',padding:'4px',background:'rgba(6,8,16,0.8)',border:'1px solid rgba(184,200,224,0.08)',borderRadius:'12px',marginBottom:'12px'}}>
                {(['login','register'] as Mode[]).map(m=>(
                  <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'6px',borderRadius:'8px',fontSize:'11px',fontFamily:'Syne,sans-serif',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,border:'none',cursor:'pointer',transition:'all 180ms',background:mode===m?'rgba(255,255,255,0.07)':'transparent',color:mode===m?'var(--text-primary)':'var(--text-secondary)'}}>
                    {m==='login'?'Ingresar':'Registrarse'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'8px'}}>
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
                  <Input type="tel" placeholder="Teléfono de contacto (ej: +54 11 5555-5555)" value={form.phone} onChange={set('phone')} right={<Phone size={15}/>}/>
                  <Input type="number" placeholder="Edad" value={form.age} onChange={set('age')} right={<Calendar size={15}/>}/>
                </>)}

                <div style={{display:'flex',flexDirection:'column',gap:'4px',margin:'2px 0 4px'}}>
                  <label style={{fontSize:'11px',color:'var(--text-secondary)',fontFamily:'DM Sans,sans-serif',fontWeight:500}}>Seleccionar Ciudad</label>
                  <select
                    value="buenos_aires"
                    disabled
                    style={{
                      width:'100%',
                      padding:'11px 14px',
                      background:'rgba(6,8,16,0.7)',
                      border:'1px solid rgba(184,200,224,0.12)',
                      borderRadius:'var(--r-sm)',
                      color:'var(--text-primary)',
                      fontSize:'14px',
                      fontFamily:'DM Sans,sans-serif',
                      outline:'none',
                      boxShadow:'0 2px 8px rgba(0,0,0,0.3) inset',
                      cursor:'not-allowed',
                      boxSizing:'border-box' as const
                    }}
                  >
                    <option value="buenos_aires" style={{background:'#0a0e14',color:'#fff'}}>Buenos Aires, Argentina</option>
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '2px 0 6px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{
                      accentColor: 'var(--go)',
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>
                    Acepto los{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowTermsModal(true)
                      }}
                      style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                    >
                      términos y condiciones
                    </a>
                  </span>
                </label>

                <button type="submit" disabled={loading} className="action-btn"
                  style={{
                    width:'100%',
                    padding:'15px 28px',
                    marginTop:'8px',
                    background:loading?'linear-gradient(145deg, #2D3444, #1E2638)':'linear-gradient(145deg, rgba(194,200,212,1) 0%, rgba(154,164,184,1) 50%, rgba(176,184,200,1) 100%)',
                    color:'#0A0E14',
                    fontFamily:'Syne,sans-serif',
                    fontWeight:700,
                    fontSize:'12px',
                    letterSpacing:'0.06em',
                    textTransform:'skewX(0deg) uppercase' as any,
                    border:'none',
                    borderRadius:'var(--r-md)',
                    cursor:loading?'not-allowed':'pointer',
                    boxShadow:loading?'none':'0 2px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.3) inset, 0 -1px 0 rgba(0,0,0,0.2) inset',
                    transition:'all var(--t-base) var(--ease-out)',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:'10px'
                  }}>
                  {loading?'Cargando...':(mode==='login'?'Ingresar':'Crear cuenta')}
                  {!loading&&<ArrowRight size={15}/>}
                </button>
              </form>

              <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-secondary)',marginTop:'12px',marginBottom:0}}>
                {mode==='login'?'¿No tenés cuenta? ':'¿Ya tenés cuenta? '}
                <button onClick={()=>setMode(mode==='login'?'register':'login')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',fontWeight:600,fontSize:'12px',fontFamily:'DM Sans',padding:0,textDecoration:'underline',textUnderlineOffset:'2px'}}>
                  {mode==='login'?'Registrarse':'Ingresar'}
                </button>
              </p>



              <p style={{textAlign:'center',fontSize:'10px',color:'var(--text-muted)',fontFamily:'DM Mono',marginTop:'12px',letterSpacing:'0.04em'}}>
                Choferes: ingresan con email y contraseña
              </p>
            </motion.div>
          </AnimatePresence>

      {/* General Terms & Conditions Popup Modal */}
      {showTermsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '580px', background: '#121527',
            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
                Términos y Condiciones Generales
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#fff', cursor: 'pointer' }}
              >✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', color: '#a3a6b8', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {generalTermsText}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8f94a5', fontSize: '12px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
              <button
                onClick={() => { setAcceptTerms(true); setShowTermsModal(false); toast.success('Términos y condiciones aceptados'); }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Entendido y Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
      {bannedEmail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 16, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: '#121527',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderTop: '4px solid #ef4444',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🚫
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Acceso Restringido</h3>
            <p style={{ fontSize: '13px', color: '#a3a6b8', lineHeight: 1.5, margin: 0 }}>
              Tu cuenta (<strong style={{ color: '#fff' }}>{bannedEmail}</strong>) ha sido suspendida de forma permanente debido a infracciones graves a nuestros Términos y Condiciones de Servicio.
            </p>
            
            {!showAppealForm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowAppealForm(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 150ms'
                  }}
                >
                  Apelar Decisión / Mensajear Soporte
                </button>
                <button
                  type="button"
                  onClick={() => setBannedEmail(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8f94a5',
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Volver al inicio
                </button>
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!appealReason.trim()) return
                  
                  // Load existing chats
                  const currentChats = JSON.parse(localStorage.getItem('mock_super_chats') || '[]')
                  const uniqueId = `c-appeal-${Date.now()}`
                  const msgText = `Apelación de Ban: ${appealReason}`
                  const newChat = {
                    id: uniqueId,
                    name: `Apelación: ${bannedEmail.split('@')[0]}`,
                    role: 'support',
                    avatar: 'AP',
                    starred: false,
                    lastMsg: msgText,
                    history: [
                      { id: `m-${Date.now()}`, sender: 'user', text: `Email: ${bannedEmail}\n\nMotivo de Apelación:\n${appealReason}`, timestamp: 'Ahora' }
                    ]
                  }
                  
                  localStorage.setItem('mock_super_chats', JSON.stringify([...currentChats, newChat]))
                  toast.success('Tu apelación ha sido enviada al equipo de soporte.')
                  setAppealReason('')
                  setShowAppealForm(false)
                  setBannedEmail(null)
                }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}
              >
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', color: '#8f94a5', display: 'block', marginBottom: '6px' }}>Explicá por qué creés que tu cuenta debería ser reactivada:</label>
                  <textarea
                    required
                    value={appealReason}
                    onChange={e => setAppealReason(e.target.value)}
                    placeholder="Escribí tu apelación detalladamente aquí..."
                    style={{
                      width: '100%',
                      height: '100px',
                      background: '#1b1d2e',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  Enviar Formulario de Apelación
                </button>
                <button
                  type="button"
                  onClick={() => setShowAppealForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8f94a5',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
        </div>
      </motion.div>
    </div>
  )
}