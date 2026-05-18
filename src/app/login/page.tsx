'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, User, Mail, Lock, Eye, EyeOff, Calendar, BarChart2, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Role = 'user' | 'driver' | null
type Mode = 'login' | 'register'

function CityBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W; canvas.height = H

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W; canvas.height = H
    }
    window.addEventListener('resize', onResize)

    // ── Grid ─────────────────────────────────────────────────────────────
    const GAP    = 160   // distance between street centers
    const ROAD   = 32    // full road width
    const LANE   = ROAD / 2   // one lane = 16px

    // Lane center offsets from street center
    // Right-hand traffic: vehicles moving in +x or +y use the "near" lane (negative offset)
    const NEAR = -LANE / 2   // e.g. rightward traffic offset from street center
    const FAR  =  LANE / 2   // e.g. leftward traffic offset from street center

    const getCols = () => { const a=[]; for(let x=GAP;x<W;x+=GAP) a.push(x); return a }
    const getRows = () => { const a=[]; for(let y=GAP;y<H;y+=GAP) a.push(y); return a }
    let cols = getCols()
    let rows = getRows()

    // ── Traffic lights ────────────────────────────────────────────────────
    const CYCLE = 360
    interface TLight { cx:number; cy:number; offset:number }
    const buildLights = (): TLight[] => {
      const out: TLight[] = []
      cols.forEach((cx,ci) => rows.forEach((cy,ri) => {
        if ((ci+ri)%2===0) out.push({cx,cy,offset:(ci*13+ri*19)%CYCLE})
      }))
      return out
    }
    let lights = buildLights()

    // 'h' = horizontal green, 'v' = vertical green, 'y' = yellow
    const lightState = (cx:number,cy:number,f:number): 'h'|'v'|'y'|'n' => {
      const l = lights.find(l=>l.cx===cx&&l.cy===cy)
      if (!l) return 'n'
      const t = (f+l.offset)%CYCLE
      if (t < CYCLE*0.43) return 'h'
      if (t < CYCLE*0.50) return 'y'
      if (t < CYCLE*0.93) return 'v'
      return 'y'
    }

    // ── Vehicle types ─────────────────────────────────────────────────────
    type Dir = 'R'|'L'|'D'|'U'
    const DX: Record<Dir,number> = {R:1,L:-1,D:0,U:0}
    const DY: Record<Dir,number> = {R:0,L:0, D:1,U:-1}
    // Perpendicular right of direction (for lane offset)
    const PX: Record<Dir,number> = {R:0,L:0, D:1,U:-1}
    const PY: Record<Dir,number> = {R:1,L:-1,D:0,U:0}

    // For a given direction, the lane center Y (for horiz) or X (for vert)
    // relative to street center:
    // R → top lane  → NEAR in Y  (y = streetY + NEAR)
    // L → bottom lane → FAR in Y (y = streetY + FAR)
    // D → left lane → NEAR in X  (x = streetX + NEAR)
    // U → right lane → FAR in X  (x = streetX + FAR)
    const laneOff: Record<Dir,number> = {R:NEAR, L:FAR, D:NEAR, U:FAR}

    interface Seg { // a straight segment on a street
      type: 'straight'
      x: number; y: number   // start position
      dir: Dir
      streetCenter: number   // the street's center coordinate
    }
    interface TurnSeg {
      type: 'turn'
      // Cubic bezier: p0→p1→p2→p3
      p0x:number;p0y:number
      p1x:number;p1y:number
      p2x:number;p2y:number
      p3x:number;p3y:number
      t: number   // 0..1 progress
      speed: number
      fromDir: Dir; toDir: Dir
    }

    type Phase = Seg | TurnSeg

    interface Vehicle {
      id: number
      type: 'bus'|'car'
      phase: Phase
      speed: number
      waiting: boolean
      waitFrames: number
      stuckMax: number
      stuckCount: number
      len: number; wid: number
      bodyColor: string
      glowColor: string
      opacity: number
      // current draw position & heading angle
      cx: number; cy: number
      angle: number   // radians, 0=right
      // yellow bus route line
      isYellow: boolean
      routePoints: Array<[number,number]>
      // 0 = never turns, 0.15 = sometimes, 0.35 = often
      turnProb: number
    }

    let vid = 0
    const vehicles: Vehicle[] = []

    const BUS_COLORS = [
      {b:'rgba(34,211,160,',  g:'rgba(34,211,160,',  yellow:false},
      {b:'rgba(56,189,248,',  g:'rgba(56,189,248,',  yellow:false},
      {b:'rgba(250,190,40,',  g:'rgba(250,190,40,',  yellow:true },
    ]
    const CAR_COLORS = [
      'rgba(148,163,184,', 'rgba(100,116,139,',
      'rgba(80,96,115,',   'rgba(170,182,196,',
    ]

    // Angle for direction
    const dirAngle: Record<Dir,number> = {R:0,L:Math.PI,D:Math.PI/2,U:-Math.PI/2}

    const makeStraight = (x:number,y:number,dir:Dir,sc:number): Seg => ({type:'straight',x,y,dir,streetCenter:sc})

    const spawnVehicle = (isBus:boolean, edge:'T'|'B'|'L'|'R') => {
      if (!cols.length||!rows.length) return
      let dir:Dir, sx:number, sy:number, sc:number

      if (edge==='L')      { dir='R'; const r=rows[Math.floor(Math.random()*rows.length)]; sx=-50; sy=r+laneOff['R']; sc=r }
      else if (edge==='R') { dir='L'; const r=rows[Math.floor(Math.random()*rows.length)]; sx=W+50; sy=r+laneOff['L']; sc=r }
      else if (edge==='T') { dir='D'; const c=cols[Math.floor(Math.random()*cols.length)]; sx=c+laneOff['D']; sy=-50; sc=c }
      else                 { dir='U'; const c=cols[Math.floor(Math.random()*cols.length)]; sx=c+laneOff['U']; sy=H+50; sc=c }

      const spd = isBus ? 0.55+Math.random()*0.5 : 0.7+Math.random()*0.9
      const len = isBus ? 28 : 13
      const wid = isBus ? 10 : 6

      const ci = isBus ? Math.floor(Math.random()*BUS_COLORS.length) : -1
      const bc = isBus ? BUS_COLORS[ci] : null
      const cc = !isBus ? CAR_COLORS[Math.floor(Math.random()*CAR_COLORS.length)] : null

      vehicles.push({
        id:vid++, type:isBus?'bus':'car',
        phase: makeStraight(sx,sy,dir,sc),
        speed:spd, waiting:false, waitFrames:0, stuckMax:200, stuckCount:0,
        len, wid,
        bodyColor: isBus?bc!.b:cc!,
        glowColor: isBus?bc!.g:cc!,
        opacity: isBus?0.8+Math.random()*0.15:0.55+Math.random()*0.3,
        cx:sx, cy:sy, angle:dirAngle[dir],
        isYellow: isBus&&bc!.yellow,
        routePoints:[],
        // Buses turn more often; ~40% of cars never turn, rest turn occasionally
        turnProb: isBus
          ? 0.25 + Math.random()*0.2
          : Math.random() < 0.4 ? 0 : Math.random()*0.18,
      })
    }

    // Seed
    for(let i=0;i<18;i++) spawnVehicle(true, (['T','B','L','R'] as const)[i%4])
    for(let i=0;i<38;i++) spawnVehicle(false,(['T','B','L','R'] as const)[i%4])

    // ── Bezier cubic helpers ──────────────────────────────────────────────
    const bezier = (p0:number,p1:number,p2:number,p3:number,t:number) => {
      const u=1-t
      return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3
    }
    const bezierD = (p0:number,p1:number,p2:number,p3:number,t:number) => {
      const u=1-t
      return 3*(u*u*(p1-p0)+2*u*t*(p2-p1)+t*t*(p3-p2))
    }

    // Build a turn from current pos → intersection → new lane
    const buildTurn = (v:Vehicle, inter:{cx:number,cy:number}, newDir:Dir): TurnSeg => {
      const seg = v.phase as Seg
      const od = seg.dir
      const p0x = v.cx, p0y = v.cy
      // Control point 1: continue in current dir toward intersection
      const cp1dist = LANE * 1.4
      const p1x = p0x + DX[od]*cp1dist
      const p1y = p0y + DY[od]*cp1dist
      // End point: start of new lane after intersection
      const exitDist = LANE * 1.4
      const newOff = laneOff[newDir]
      let p3x:number, p3y:number
      if (newDir==='R'||newDir==='L') {
        p3x = inter.cx + DX[newDir]*exitDist
        p3y = inter.cy + newOff
      } else {
        p3x = inter.cx + newOff
        p3y = inter.cy + DY[newDir]*exitDist
      }
      // Control point 2: pull from end point opposite new direction
      const p2x = p3x - DX[newDir]*cp1dist
      const p2y = p3y - DY[newDir]*cp1dist

      return {type:'turn',p0x,p0y,p1x,p1y,p2x,p2y,p3x,p3y,t:0,speed:v.speed,fromDir:od,toDir:newDir}
    }

    // Find nearest intersection ahead of vehicle
    const nearestInter = (v:Vehicle): {cx:number,cy:number,dist:number}|null => {
      if (v.phase.type!=='straight') return null
      const seg = v.phase as Seg
      let best: {cx:number,cy:number,dist:number}|null = null
      const dx=DX[seg.dir],dy=DY[seg.dir]
      for(const cx of cols) for(const cy of rows) {
        const proj = (cx-v.cx)*dx+(cy-v.cy)*dy
        if(proj<0||proj>60) continue
        const perp = Math.abs((cx-v.cx)*dy-(cy-v.cy)*dx)
        if(perp>LANE) continue
        if(!best||proj<best.dist) best={cx,cy,dist:proj}
      }
      return best
    }

    // Check if another vehicle is blocking the path ahead
    const blocked = (v:Vehicle): boolean => {
      if(v.phase.type!=='straight') return false
      const dx=DX[(v.phase as Seg).dir], dy=DY[(v.phase as Seg).dir]
      const gap = v.len+5
      return vehicles.some(o=>{
        if(o.id===v.id) return false
        const rx=o.cx-v.cx, ry=o.cy-v.cy
        const fwd=rx*dx+ry*dy
        if(fwd<=2||fwd>gap) return false
        return Math.abs(rx*dy-ry*dx)<v.wid+3
      })
    }

    // ── Update ────────────────────────────────────────────────────────────
    const update = (frame:number) => {
      cols = getCols(); rows = getRows()

      for(let i=vehicles.length-1;i>=0;i--) {
        const v=vehicles[i]

        // Remove far off-screen
        if(v.cx<-120||v.cx>W+120||v.cy<-120||v.cy>H+120){ vehicles.splice(i,1); continue }

        // ── Turn phase ──
        if(v.phase.type==='turn') {
          const ts = v.phase as TurnSeg
          ts.t += ts.speed * 0.022
          if(ts.t>=1) {
            ts.t=1
            v.cx=ts.p3x; v.cy=ts.p3y
            // Snap to correct lane on new street
            const nd=ts.toDir
            if(nd==='R'||nd==='L') {
              // Find nearest row
              const nr=rows.reduce((a,b)=>Math.abs(b-(ts.p3y-laneOff[nd]))<Math.abs(a-(ts.p3y-laneOff[nd]))?b:a,rows[0]||0)
              v.phase=makeStraight(ts.p3x,ts.p3y,nd,nr)
              v.cy=nr+laneOff[nd]; v.cx=ts.p3x
            } else {
              const nc=cols.reduce((a,b)=>Math.abs(b-(ts.p3x-laneOff[nd]))<Math.abs(a-(ts.p3x-laneOff[nd]))?b:a,cols[0]||0)
              v.phase=makeStraight(ts.p3x,ts.p3y,nd,nc)
              v.cx=nc+laneOff[nd]; v.cy=ts.p3y
            }
            v.angle=dirAngle[nd]
            v.stuckCount=0; v.waiting=false
          } else {
            v.cx=bezier(ts.p0x,ts.p1x,ts.p2x,ts.p3x,ts.t)
            v.cy=bezier(ts.p0y,ts.p1y,ts.p2y,ts.p3y,ts.t)
            const bdx=bezierD(ts.p0x,ts.p1x,ts.p2x,ts.p3x,ts.t)
            const bdy=bezierD(ts.p0y,ts.p1y,ts.p2y,ts.p3y,ts.t)
            if(Math.abs(bdx)+Math.abs(bdy)>0.01) v.angle=Math.atan2(bdy,bdx)
          }
          // Track yellow route
          if(v.isYellow&&v.routePoints.length<800) v.routePoints.push([v.cx,v.cy])
          continue
        }

        // ── Straight phase ──
        if(v.waiting) {
          v.waitFrames--; v.stuckCount++
          if(v.waitFrames<=0||v.stuckCount>v.stuckMax){ v.waiting=false; v.stuckCount=0 }
          continue
        }

        const seg = v.phase as Seg
        const inter = nearestInter(v)

        if(inter && inter.dist<22) {
          const st=lightState(inter.cx,inter.cy,frame)
          const isH=seg.dir==='R'||seg.dir==='L'
          const green=(isH&&st==='h')||(!isH&&st==='v')||st==='n'

          if(!green){ v.waiting=true; v.waitFrames=12; continue }

          // Check intersection occupied
          const occ=vehicles.some(o=>{
            if(o.id===v.id) return false
            return Math.abs(o.cx-inter.cx)<ROAD*0.9&&Math.abs(o.cy-inter.cy)<ROAD*0.9
          })
          if(occ){ v.waiting=true; v.waitFrames=8; continue }

          // Decide direction using per-vehicle turn probability
          // turnProb=0 → always straight; higher = more likely to turn
          const rand=Math.random()
          const leftOf: Record<Dir,Dir>  = {R:'U',L:'D',D:'R',U:'L'}
          const rightOf: Record<Dir,Dir> = {R:'D',L:'U',D:'L',U:'R'}
          let chosen=seg.dir
          if(v.turnProb > 0) {
            if(rand < v.turnProb)               chosen=leftOf[seg.dir]
            else if(rand < v.turnProb * 2)      chosen=rightOf[seg.dir]
          }

          if(chosen!==seg.dir) {
            v.phase=buildTurn(v,inter,chosen)
            continue
          }
        }

        if(blocked(v)){ v.waiting=true; v.waitFrames=6; continue }

        // Move straight — enforce lane
        const dx=DX[seg.dir],dy=DY[seg.dir]
        v.cx+=dx*v.speed; v.cy+=dy*v.speed
        // Clamp to lane
        if(seg.dir==='R'||seg.dir==='L') v.cy=seg.streetCenter+laneOff[seg.dir]
        else                              v.cx=seg.streetCenter+laneOff[seg.dir]
        v.angle=dirAngle[seg.dir]

        if(v.isYellow&&v.routePoints.length<800) v.routePoints.push([v.cx,v.cy])
      }
    }

    // ── Draw vehicle ─────────────────────────────────────────────────────
    const drawVeh = (v:Vehicle) => {
      ctx.save()
      ctx.translate(v.cx,v.cy)
      ctx.rotate(v.angle)
      const hl=v.len/2,hw=v.wid/2,r=v.type==='bus'?2.5:1.6
      ctx.shadowColor=v.glowColor+'0.7)'; ctx.shadowBlur=v.type==='bus'?10:5
      // body
      ctx.beginPath()
      ctx.moveTo(-hl+r,-hw); ctx.lineTo(hl-r,-hw); ctx.arcTo(hl,-hw,hl,-hw+r,r)
      ctx.lineTo(hl,hw-r);   ctx.arcTo(hl,hw,hl-r,hw,r)
      ctx.lineTo(-hl+r,hw);  ctx.arcTo(-hl,hw,-hl,hw-r,r)
      ctx.lineTo(-hl,-hw+r); ctx.arcTo(-hl,-hw,-hl+r,-hw,r)
      ctx.closePath()
      ctx.fillStyle=v.bodyColor+v.opacity+')'
      ctx.strokeStyle=v.bodyColor+Math.min(v.opacity+0.2,1)+')'
      ctx.lineWidth=0.6; ctx.fill(); ctx.stroke()
      ctx.shadowBlur=0
      if(v.type==='bus') {
        ctx.fillStyle=v.bodyColor+Math.min(v.opacity+0.3,1)+')'
        for(let i=0;i<3;i++){ctx.beginPath();ctx.roundRect(-hl+5+i*8,-hw+1.5,5.5,3,0.8);ctx.fill()}
        ctx.fillStyle='rgba(255,55,55,0.9)'; ctx.shadowColor='rgba(255,55,55,0.8)'; ctx.shadowBlur=6
        ctx.beginPath(); ctx.roundRect(-hl+0.5,-hw+1,2,v.wid-2,0.5); ctx.fill()
        ctx.fillStyle='rgba(255,255,170,0.95)'; ctx.shadowColor='rgba(255,255,200,0.9)'; ctx.shadowBlur=10
        ctx.beginPath(); ctx.arc(hl-2,-hw+2,1.4,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(hl-2, hw-2,1.4,0,Math.PI*2); ctx.fill()
      } else {
        ctx.fillStyle=v.bodyColor+Math.min(v.opacity+0.2,1)+')'
        ctx.beginPath(); ctx.roundRect(-hl+2,-hw+1.2,v.len*0.5,v.wid-2.4,1); ctx.fill()
        ctx.fillStyle='rgba(255,55,55,0.85)'; ctx.shadowColor='rgba(255,55,55,0.6)'; ctx.shadowBlur=4
        ctx.beginPath(); ctx.roundRect(-hl+0.5,-hw+1,1.5,v.wid-2,0.5); ctx.fill()
        ctx.fillStyle='rgba(255,255,170,0.9)'; ctx.shadowColor='rgba(255,255,200,0.8)'; ctx.shadowBlur=7
        ctx.beginPath(); ctx.arc(hl-1.5,-hw+1.6,1.1,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(hl-1.5, hw-1.6,1.1,0,Math.PI*2); ctx.fill()
      }
      // beam
      ctx.shadowBlur=0
      const bLen=v.type==='bus'?22:14
      const beam=ctx.createLinearGradient(hl,0,hl+bLen,0)
      beam.addColorStop(0,'rgba(255,255,200,0.12)'); beam.addColorStop(1,'rgba(255,255,200,0)')
      ctx.fillStyle=beam
      ctx.beginPath(); ctx.moveTo(hl,-hw); ctx.lineTo(hl+bLen,-hw-6); ctx.lineTo(hl+bLen,hw+6); ctx.lineTo(hl,hw); ctx.closePath(); ctx.fill()
      ctx.restore()
    }

    // ── Draw traffic light ───────────────────────────────────────────────
    const drawLight = (cx:number,cy:number,state:'h'|'v'|'y'|'n') => {
      if(state==='n') return
      ;[[-ROAD/2-8,-ROAD/2-8],[ROAD/2+8,-ROAD/2-8]].forEach(([ox,oy])=>{
        const lx=cx+ox,ly=cy+oy
        ctx.strokeStyle='rgba(184,200,224,0.3)'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+10); ctx.stroke()
        ctx.fillStyle='rgba(16,22,34,0.95)'; ctx.strokeStyle='rgba(184,200,224,0.2)'; ctx.lineWidth=0.7
        ctx.beginPath(); ctx.roundRect(lx-4,ly-13,8,13,2); ctx.fill(); ctx.stroke()
        const red=state==='v'||state==='y'
        const grn=state==='h'
        ctx.fillStyle=red?'rgba(255,50,50,0.95)':'rgba(255,50,50,0.15)'
        ctx.shadowColor=red?'rgba(255,50,50,0.8)':'transparent'; ctx.shadowBlur=red?8:0
        ctx.beginPath(); ctx.arc(lx,ly-10,1.8,0,Math.PI*2); ctx.fill()
        ctx.fillStyle=grn?'rgba(34,211,160,0.95)':'rgba(34,211,160,0.15)'
        ctx.shadowColor=grn?'rgba(34,211,160,0.8)':'transparent'; ctx.shadowBlur=grn?8:0
        ctx.beginPath(); ctx.arc(lx,ly-4,1.8,0,Math.PI*2); ctx.fill()
        ctx.shadowBlur=0
      })
    }

    let frame=0, spawnT=0, animId:number

    const render = () => {
      ctx.clearRect(0,0,W,H)

      // ── Roads ──
      rows.forEach(sy=>{
        ctx.fillStyle='rgba(15,21,33,0.93)'; ctx.fillRect(0,sy-ROAD/2,W,ROAD)
        ctx.strokeStyle='rgba(184,200,224,0.16)'; ctx.lineWidth=0.8
        ctx.beginPath();ctx.moveTo(0,sy-ROAD/2);ctx.lineTo(W,sy-ROAD/2);ctx.stroke()
        ctx.beginPath();ctx.moveTo(0,sy+ROAD/2);ctx.lineTo(W,sy+ROAD/2);ctx.stroke()
        ctx.strokeStyle='rgba(240,180,40,0.3)'; ctx.lineWidth=0.9; ctx.setLineDash([9,13])
        ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(W,sy);ctx.stroke()
        ctx.setLineDash([])
      })
      cols.forEach(sx=>{
        ctx.fillStyle='rgba(15,21,33,0.93)'; ctx.fillRect(sx-ROAD/2,0,ROAD,H)
        ctx.strokeStyle='rgba(184,200,224,0.16)'; ctx.lineWidth=0.8
        ctx.beginPath();ctx.moveTo(sx-ROAD/2,0);ctx.lineTo(sx-ROAD/2,H);ctx.stroke()
        ctx.beginPath();ctx.moveTo(sx+ROAD/2,0);ctx.lineTo(sx+ROAD/2,H);ctx.stroke()
        ctx.strokeStyle='rgba(240,180,40,0.3)'; ctx.lineWidth=0.9; ctx.setLineDash([9,13])
        ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,H);ctx.stroke()
        ctx.setLineDash([])
      })

      // ── Intersections ──
      cols.forEach(sx=>rows.forEach(sy=>{
        ctx.fillStyle='rgba(18,26,40,0.97)'
        ctx.fillRect(sx-ROAD/2,sy-ROAD/2,ROAD,ROAD)
      }))

      // ── Traffic lights ──
      cols.forEach(sx=>rows.forEach(sy=>drawLight(sx,sy,lightState(sx,sy,frame))))

      // ── Yellow route lines ──
      vehicles.filter(v=>v.isYellow&&v.routePoints.length>1).forEach(v=>{
        ctx.save()
        ctx.strokeStyle='rgba(250,200,40,0.18)'
        ctx.lineWidth=1.5
        ctx.setLineDash([6,10])
        ctx.lineCap='round'
        ctx.beginPath()
        v.routePoints.forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // ── Vehicles ──
      vehicles.filter(v=>v.type==='car').forEach(drawVeh)
      vehicles.filter(v=>v.type==='bus').forEach(drawVeh)

      // ── Spawn ──
      spawnT++
      if(spawnT>90&&vehicles.length<70){
        const e=(['T','B','L','R'] as const)[Math.floor(Math.random()*4)]
        spawnVehicle(Math.random()<0.38,e)
        spawnT=0
      }

      frame++
      update(frame)
      animId=requestAnimationFrame(render)
    }

    render()
    return ()=>{ window.removeEventListener('resize',onResize); cancelAnimationFrame(animId) }
  },[])

  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0}}/>
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({type='text',placeholder,value,onChange,right}:{type?:string;placeholder:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;right?:React.ReactNode}) {
  const [f,setF]=useState(false)
  return (
    <div style={{position:'relative'}}>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} required
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:'100%',padding:'13px 44px 13px 16px',background:f?'rgba(255,255,255,0.09)':'rgba(255,255,255,0.05)',border:`1px solid ${f?'rgba(255,255,255,0.28)':'rgba(255,255,255,0.1)'}`,borderRadius:'10px',color:'#E8ECF2',fontSize:'14px',fontFamily:'DM Sans,sans-serif',outline:'none',transition:'all 180ms',boxSizing:'border-box' as const}}
      />
      <div style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',color:f?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.25)',display:'flex',alignItems:'center'}}>
        {right}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const supabase = createClient()
  const [role,setRole]=useState<Role>(null)
  const [mode,setMode]=useState<Mode>('login')
  const [showPass,setShowPass]=useState(false)
  const [loading,setLoading]=useState(false)
  const [form,setForm]=useState({email:'',password:'',name:'',age:'',weeklyTrips:'',driverNumber:'',busUnit:''})
  const set=(k:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,[k]:e.target.value}))

  const loginWithGoogle=async()=>supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/auth/callback`}})

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();setLoading(true)
    if(mode==='login'){
      const{error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password})
      if(error){toast.error('Email o contraseña incorrectos');setLoading(false);return}
      const{data:p}=await supabase.from('profiles').select('role').eq('email',form.email).single()
      window.location.href=p?.role==='driver'?'/driver':p?.role==='admin'?'/admin':'/'
    } else {
      const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{name:form.name,role}}})
      if(error){toast.error(error.message);setLoading(false);return}
      if(data.user&&role==='user')   await supabase.from('user_profiles').insert({id:data.user.id,age:parseInt(form.age)||0,weekly_trips:parseInt(form.weeklyTrips)||0})
      if(data.user&&role==='driver') await supabase.from('driver_profiles').insert({id:data.user.id,driver_number:form.driverNumber,bus_unit:form.busUnit})
      toast.success('¡Cuenta creada! Revisá tu email.');setMode('login')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'#07090F',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>
      <CityBackground/>
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse at center,rgba(7,9,15,0.05) 0%,rgba(7,9,15,0.58) 100%)',zIndex:1,pointerEvents:'none'}}/>

      <motion.div initial={{opacity:0,y:28,scale:0.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}} style={{width:'100%',maxWidth:'360px',position:'relative',zIndex:2}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <motion.div style={{width:'52px',height:'52px',borderRadius:'16px',background:'linear-gradient(145deg,rgba(34,211,160,0.18),rgba(34,211,160,0.06))',border:'1px solid rgba(34,211,160,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 11px'}} animate={{boxShadow:['0 0 16px rgba(34,211,160,0.15)','0 0 40px rgba(34,211,160,0.32)','0 0 16px rgba(34,211,160,0.15)']}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}>
            <Bus size={24} style={{color:'#22D3A0'}}/>
          </motion.div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'28px',color:'#fff',letterSpacing:'-0.02em',margin:0,textShadow:'0 2px 24px rgba(0,0,0,0.9)'}}>Bien Parada</h1>
          <p style={{color:'rgba(255,255,255,0.28)',fontSize:'12px',marginTop:'4px'}}>Seguí tu colectivo en tiempo real</p>
        </div>

        {/* Card */}
        <div style={{background:'rgba(12,16,26,0.82)',backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',overflow:'hidden',position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,0.8),0 1px 0 rgba(255,255,255,0.07) inset'}}>
          <div style={{position:'absolute',top:0,left:'25%',right:'25%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)'}}/>

          <AnimatePresence mode="wait">

            {/* ROLE */}
            {!role&&(
              <motion.div key="role" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'30px 24px 26px'}}>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'21px',color:'#fff',textAlign:'center',margin:'0 0 5px'}}>Bienvenido</h2>
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>¿Cómo querés ingresar?</p>
                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'22px'}}>
                  {[
                    {r:'user' as Role,icon:<User size={18} style={{color:'#22D3A0'}}/>,label:'Soy Usuario',sub:'Ver colectivos en tiempo real',bg:'rgba(34,211,160,0.08)',brd:'rgba(34,211,160,0.2)',ic:'rgba(34,211,160,0.12)',ib:'rgba(34,211,160,0.22)'},
                    {r:'driver' as Role,icon:<Bus size={18} style={{color:'rgba(194,200,212,0.9)'}}/>,label:'Soy Chofer',sub:'Transmitir mi ubicación GPS',bg:'rgba(255,255,255,0.04)',brd:'rgba(255,255,255,0.1)',ic:'rgba(255,255,255,0.06)',ib:'rgba(255,255,255,0.14)'},
                  ].map(item=>(
                    <motion.button key={String(item.r)} onClick={()=>setRole(item.r)} whileHover={{scale:1.015}} whileTap={{scale:0.985}} style={{display:'flex',alignItems:'center',gap:'13px',padding:'14px 16px',background:item.bg,border:`1px solid ${item.brd}`,borderRadius:'12px',cursor:'pointer',textAlign:'left',width:'100%',transition:'all 200ms'}}>
                      <div style={{width:'40px',height:'40px',borderRadius:'10px',background:item.ic,border:`1px solid ${item.ib}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{item.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',color:'#fff'}}>{item.label}</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'1px'}}>{item.sub}</div>
                      </div>
                      <ArrowRight size={15} style={{color:'rgba(255,255,255,0.25)',flexShrink:0}}/>
                    </motion.button>
                  ))}
                </div>
                <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'0 0 14px'}}/>
                <p style={{textAlign:'center',fontSize:'10px',color:'rgba(255,255,255,0.12)',fontFamily:'DM Mono',letterSpacing:'0.05em'}}>ADMIN: admin@admin.com / Admin123!</p>
              </motion.div>
            )}

            {/* FORM */}
            {role&&(
              <motion.div key="form" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'26px 24px 28px'}}>
                <div style={{display:'flex',alignItems:'center',marginBottom:'20px'}}>
                  <button onClick={()=>{setRole(null);setMode('login')}} style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,marginRight:'10px'}}>
                    <ChevronLeft size={14} style={{color:'rgba(255,255,255,0.4)'}}/>
                  </button>
                  <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'19px',color:'#fff',margin:0,flex:1,textAlign:'center',paddingRight:'38px'}}>{mode==='login'?'Ingresar':'Registro'}</h2>
                </div>
                <div style={{display:'flex',gap:'2px',padding:'3px',background:'rgba(0,0,0,0.4)',borderRadius:'10px',marginBottom:'18px'}}>
                  {(['login','register'] as Mode[]).map(m=>(
                    <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'12px',fontFamily:'Syne,sans-serif',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,border:'none',cursor:'pointer',transition:'all 180ms',background:mode===m?'rgba(255,255,255,0.1)':'transparent',color:mode===m?'#fff':'rgba(255,255,255,0.3)'}}>
                      {m==='login'?'Ingresar':'Registrarse'}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {mode==='register'&&<Input type="text" placeholder={role==='driver'?'Nombre completo':'Tu nombre'} value={form.name} onChange={set('name')} right={<User size={15}/>}/>}
                  <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} right={<Mail size={15}/>}/>
                  <Input type={showPass?'text':'password'} placeholder="Contraseña" value={form.password} onChange={set('password')} right={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',display:'flex',padding:0}}>{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button>}/>
                  {mode==='register'&&role==='user'&&(<><Input type="number" placeholder="Edad" value={form.age} onChange={set('age')} right={<Calendar size={15}/>}/><Input type="number" placeholder="Veces por semana en colectivo" value={form.weeklyTrips} onChange={set('weeklyTrips')} right={<BarChart2 size={15}/>}/></>)}
                  {mode==='register'&&role==='driver'&&(<><Input type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} right={<Bus size={15}/>}/><Input type="text" placeholder="Número de unidad" value={form.busUnit} onChange={set('busUnit')} right={<Bus size={15}/>}/></>)}
                  <motion.button type="submit" disabled={loading} whileHover={{scale:loading?1:1.02}} whileTap={{scale:loading?1:0.98}} style={{width:'100%',padding:'13px',marginTop:'4px',background:loading?'rgba(255,255,255,0.6)':'#ffffff',color:'#07090F',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'14px',letterSpacing:'0.03em',border:'none',borderRadius:'10px',cursor:loading?'not-allowed':'pointer',boxShadow:'0 4px 24px rgba(255,255,255,0.12)',transition:'all 250ms',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
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
                {role==='user'&&(<>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'15px 0 12px'}}>
                    <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/><span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',fontFamily:'DM Mono',letterSpacing:'0.08em'}}>O</span><div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>
                  </div>
                  <button onClick={loginWithGoogle} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'12px',color:'rgba(255,255,255,0.45)',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                    <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continuar con Google
                  </button>
                </>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}