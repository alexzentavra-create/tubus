'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, User, Mail, Lock, Eye, EyeOff, Calendar, BarChart2, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Role = 'user' | 'driver' | null
type Mode = 'login' | 'register'

// ═══════════════════════════════════════════════════════════════════════════
//  CITY SIMULATION
// ═══════════════════════════════════════════════════════════════════════════
function CityBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const GAP     = 140   // street grid spacing
    const ROAD_W  = 28    // total road width (2 lanes)
    const LANE_W  = ROAD_W / 2
    const BUS_L   = 28    // bus length
    const BUS_W   = 10    // bus width
    const STOP_D  = 22    // how far before intersection to stop
    const LIGHT_CYCLE = 280 // frames per full cycle

    // ── Grid ──────────────────────────────────────────────────────────────
    const cols: number[] = []
    const rows: number[] = []
    const buildGrid = () => {
      cols.length = 0; rows.length = 0
      for (let x = GAP; x < canvas.width;  x += GAP) cols.push(x)
      for (let y = GAP; y < canvas.height; y += GAP) rows.push(y)
    }
    buildGrid()

    // ── Traffic lights — only on some intersections ───────────────────────
    interface TLight { cx: number; cy: number; phase: number }
    const lights: TLight[] = []
    const buildLights = () => {
      lights.length = 0
      cols.forEach((cx, ci) => {
        rows.forEach((cy, ri) => {
          if ((ci + ri) % 3 === 0) lights.push({ cx, cy, phase: (ci * 7 + ri * 13) % LIGHT_CYCLE })
        })
      })
    }
    buildLights()

    // Returns 'green-h' | 'green-v' | 'yellow' for a given intersection at current frame
    const getLightState = (cx: number, cy: number, frame: number): string => {
      const l = lights.find(l => l.cx === cx && l.cy === cy)
      if (!l) return 'none'
      const t = (frame + l.phase) % LIGHT_CYCLE
      if (t < LIGHT_CYCLE * 0.44) return 'green-h'
      if (t < LIGHT_CYCLE * 0.50) return 'yellow'
      if (t < LIGHT_CYCLE * 0.94) return 'green-v'
      return 'yellow'
    }

    // ── Bus type ───────────────────────────────────────────────────────────
    type Dir = 'R'|'L'|'D'|'U'
    interface BusObj {
      id: number
      x: number; y: number
      dir: Dir
      speed: number
      waiting: boolean
      waitTimer: number
      color: string
      glow: string
      opacity: number
      // for turns
      turning: boolean
      turnTarget: { x:number; y:number; newDir: Dir } | null
      turnProgress: number
    }

    let busId = 0
    const buses: BusObj[] = []

    const COLORS = [
      { b:'rgba(194,200,212,', g:'rgba(184,200,224,' },
      { b:'rgba(34,211,160,',  g:'rgba(34,211,160,' },
      { b:'rgba(148,163,184,', g:'rgba(148,163,184,' },
      { b:'rgba(250,160,60,',  g:'rgba(250,160,60,'  },
    ]

    const dirVec: Record<Dir,[number,number]> = { R:[1,0], L:[-1,0], D:[0,1], U:[0,-1] }
    const laneOffset: Record<Dir,number> = { R: -LANE_W/2+1, L: LANE_W/2-1, D: -LANE_W/2+1, U: LANE_W/2-1 }

    const spawnBus = (edge: 'top'|'bottom'|'left'|'right') => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)]
      const op = 0.6 + Math.random() * 0.35
      const sp = 0.55 + Math.random() * 0.7
      let x = 0, y = 0, dir: Dir = 'R'

      if (edge === 'left') {
        dir = 'R'
        const row = rows[Math.floor(Math.random() * rows.length)]
        x = -BUS_L; y = row + laneOffset['R']
      } else if (edge === 'right') {
        dir = 'L'
        const row = rows[Math.floor(Math.random() * rows.length)]
        x = canvas.width + BUS_L; y = row + laneOffset['L']
      } else if (edge === 'top') {
        dir = 'D'
        const col = cols[Math.floor(Math.random() * cols.length)]
        x = col + laneOffset['D']; y = -BUS_L
      } else {
        dir = 'U'
        const col = cols[Math.floor(Math.random() * cols.length)]
        x = col + laneOffset['U']; y = canvas.height + BUS_L
      }

      buses.push({ id: busId++, x, y, dir, speed: sp, waiting: false, waitTimer: 0, turning: false, turnTarget: null, turnProgress: 0, color: c.b, glow: c.g, opacity: op })
    }

    // Seed
    const edges: Array<'top'|'bottom'|'left'|'right'> = ['top','bottom','left','right']
    for (let i = 0; i < 22; i++) spawnBus(edges[i % 4])

    // ── Bus drawing ────────────────────────────────────────────────────────
    const drawBus = (b: BusObj) => {
      ctx.save()
      ctx.translate(b.x, b.y)
      const angle = b.dir==='R' ? 0 : b.dir==='L' ? Math.PI : b.dir==='D' ? Math.PI/2 : -Math.PI/2
      ctx.rotate(angle)

      const hl = BUS_L/2, hw = BUS_W/2, r = 2.5

      // Glow
      ctx.shadowColor = b.glow + '0.7)'; ctx.shadowBlur = 12

      // Body
      ctx.beginPath()
      ctx.moveTo(-hl+r,-hw); ctx.lineTo(hl-r,-hw); ctx.arcTo(hl,-hw,hl,-hw+r,r)
      ctx.lineTo(hl,hw-r); ctx.arcTo(hl,hw,hl-r,hw,r)
      ctx.lineTo(-hl+r,hw); ctx.arcTo(-hl,hw,-hl,hw-r,r)
      ctx.lineTo(-hl,-hw+r); ctx.arcTo(-hl,-hw,-hl+r,-hw,r)
      ctx.closePath()
      ctx.fillStyle = b.color + b.opacity + ')'
      ctx.strokeStyle = b.color + Math.min(b.opacity+0.2,1) + ')'
      ctx.lineWidth = 0.7; ctx.fill(); ctx.stroke()

      // Windows
      ctx.shadowBlur = 0
      ctx.fillStyle = b.color + Math.min(b.opacity+0.35,1) + ')'
      for (let i=0;i<3;i++) {
        ctx.beginPath()
        ctx.roundRect(-hl+5+i*8, -hw+1.5, 5.5, 3, 0.8)
        ctx.fill()
      }

      // Rear lights
      ctx.fillStyle='rgba(255,70,70,0.9)'; ctx.shadowColor='rgba(255,70,70,0.8)'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.roundRect(-hl+0.5,-hw+1,2.5,BUS_W-2,0.5); ctx.fill()

      // Headlights
      ctx.fillStyle='rgba(255,255,180,0.95)'; ctx.shadowColor='rgba(255,255,200,0.9)'; ctx.shadowBlur=12
      ctx.beginPath(); ctx.arc(hl-2,-hw+2,1.5,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(hl-2, hw-2,1.5,0,Math.PI*2); ctx.fill()

      // Beam
      ctx.shadowBlur=0
      const beam=ctx.createLinearGradient(hl,0,hl+28,0)
      beam.addColorStop(0,'rgba(255,255,200,0.15)'); beam.addColorStop(1,'rgba(255,255,200,0)')
      ctx.fillStyle=beam
      ctx.beginPath(); ctx.moveTo(hl,-hw); ctx.lineTo(hl+28,-hw-8); ctx.lineTo(hl+28,hw+8); ctx.lineTo(hl,hw); ctx.closePath(); ctx.fill()

      ctx.restore()
    }

    // ── Traffic light drawing ──────────────────────────────────────────────
    const drawLight = (cx: number, cy: number, state: string) => {
      // Place a small light post at each corner of the intersection
      const offsets = [[-ROAD_W/2-6,-ROAD_W/2-6],[ROAD_W/2+6,-ROAD_W/2-6]]
      offsets.forEach(([ox,oy]) => {
        const lx = cx+ox, ly = cy+oy
        // Pole
        ctx.strokeStyle='rgba(184,200,224,0.4)'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+10); ctx.stroke()
        // Housing
        ctx.fillStyle='rgba(20,26,38,0.95)'; ctx.strokeStyle='rgba(184,200,224,0.3)'; ctx.lineWidth=0.8
        ctx.beginPath(); ctx.roundRect(lx-4,ly-10,8,10,2); ctx.fill(); ctx.stroke()
        // Red
        const isRed = state==='green-v' || state==='yellow'
        ctx.fillStyle = isRed ? 'rgba(255,60,60,0.95)' : 'rgba(255,60,60,0.2)'
        ctx.shadowColor = isRed ? 'rgba(255,60,60,0.8)' : 'transparent'
        ctx.shadowBlur  = isRed ? 8 : 0
        ctx.beginPath(); ctx.arc(lx,-5+ly,1.8,0,Math.PI*2); ctx.fill()
        // Green
        const isGreen = state==='green-h'
        ctx.fillStyle = isGreen ? 'rgba(34,211,160,0.95)' : 'rgba(34,211,160,0.2)'
        ctx.shadowColor = isGreen ? 'rgba(34,211,160,0.8)' : 'transparent'
        ctx.shadowBlur  = isGreen ? 8 : 0
        ctx.beginPath(); ctx.arc(lx,-1+ly,1.8,0,Math.PI*2); ctx.fill()
        ctx.shadowBlur=0
      })
    }

    // ── Intersection/collision logic ───────────────────────────────────────
    const nearIntersection = (b: BusObj): {cx:number;cy:number} | null => {
      const [vx,vy] = dirVec[b.dir]
      for (const cx of cols) {
        for (const cy of rows) {
          // Distance from bus front to intersection center
          const frontX = b.x + vx * BUS_L/2
          const frontY = b.y + vy * BUS_L/2
          const dx = cx - frontX, dy = cy - frontY
          // Only intersections in front of bus
          const dot = dx*vx + dy*vy
          if (dot > 0 && dot < STOP_D + 10 && Math.abs(b.dir==='R'||b.dir==='L' ? dy : dx) < LANE_W) {
            return { cx, cy }
          }
        }
      }
      return null
    }

    const busBlocking = (b: BusObj): boolean => {
      const [vx,vy] = dirVec[b.dir]
      return buses.some(other => {
        if (other.id === b.id) return false
        const dx = other.x - b.x, dy = other.y - b.y
        const dot = dx*vx + dy*vy
        if (dot <= 0 || dot > BUS_L + 8) return false
        const perp = Math.abs(dx*vy - dy*vx)
        return perp < BUS_W + 2
      })
    }

    // Decide turn at intersection
    const decideTurn = (b: BusObj, cx: number, cy: number): { newDir: Dir; tx:number; ty:number } => {
      const straight: Dir = b.dir
      const lefts:  Record<Dir,Dir> = { R:'U', L:'D', D:'R', U:'L' }
      const left = lefts[b.dir]
      const options: Dir[] = Math.random() < 0.65 ? [straight, straight, left] : [straight, left]
      const chosen: Dir = options[Math.floor(Math.random()*options.length)]
      const [nvx,nvy] = dirVec[chosen]
      return { newDir: chosen, tx: cx + nvx*LANE_W/2, ty: cy + nvy*LANE_W/2 }
    }

    let frame = 0, spawnTimer = 0, animId: number

    const update = () => {
      for (let i = buses.length-1; i >= 0; i--) {
        const b = buses[i]

        // Remove off-screen
        if (b.x < -80 || b.x > canvas.width+80 || b.y < -80 || b.y > canvas.height+80) {
          buses.splice(i,1); continue
        }

        if (b.turning && b.turnTarget) {
          // Smooth turn animation
          b.turnProgress += 0.08
          if (b.turnProgress >= 1) {
            b.dir = b.turnTarget.newDir
            b.x   = b.turnTarget.x
            b.y   = b.turnTarget.y
            b.turning = false; b.turnTarget = null; b.turnProgress = 0
          } else {
            // Lerp to turn target
            const start = { x: b.x - (b.turnTarget.x-b.x)*(1-b.turnProgress)/b.turnProgress*0 , y: b.y }
            // simplified: just move toward target
            b.x += (b.turnTarget.x - b.x) * 0.12
            b.y += (b.turnTarget.y - b.y) * 0.12
          }
          continue
        }

        if (b.waiting) {
          b.waitTimer--
          if (b.waitTimer <= 0) b.waiting = false
          continue
        }

        // Check intersection ahead
        const inter = nearIntersection(b)
        if (inter) {
          const state = getLightState(inter.cx, inter.cy, frame)
          const isHoriz = b.dir==='R' || b.dir==='L'
          const greenForMe = (isHoriz && state==='green-h') || (!isHoriz && state==='green-v') || state==='none'

          if (!greenForMe) { b.waiting=true; b.waitTimer=8; continue }

          // Check if another bus is in the intersection
          const intersectionBlocked = buses.some(o => {
            if (o.id===b.id) return false
            return Math.abs(o.x-inter.cx)<ROAD_W && Math.abs(o.y-inter.cy)<ROAD_W
          })
          if (intersectionBlocked) { b.waiting=true; b.waitTimer=12; continue }

          // Decide to turn or go straight
          const t = decideTurn(b, inter.cx, inter.cy)
          if (t.newDir !== b.dir) {
            b.turning = true
            b.turnTarget = { x: inter.cx + dirVec[t.newDir][0]*LANE_W*1.5, y: inter.cy + dirVec[t.newDir][1]*LANE_W*1.5, newDir: t.newDir }
            b.turnProgress = 0
          }
        }

        // Check bus ahead
        if (busBlocking(b)) { b.waiting=true; b.waitTimer=6; continue }

        // Move
        const [vx,vy] = dirVec[b.dir]
        b.x += vx * b.speed
        b.y += vy * b.speed
      }
    }

    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)

      // ── Roads ──
      rows.forEach(sy => {
        ctx.fillStyle='rgba(18,24,36,0.9)'; ctx.fillRect(0,sy-ROAD_W/2,canvas.width,ROAD_W)
        ctx.strokeStyle='rgba(184,200,224,0.2)'; ctx.lineWidth=0.8
        ctx.beginPath(); ctx.moveTo(0,sy-ROAD_W/2); ctx.lineTo(canvas.width,sy-ROAD_W/2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0,sy+ROAD_W/2); ctx.lineTo(canvas.width,sy+ROAD_W/2); ctx.stroke()
        ctx.strokeStyle='rgba(240,180,41,0.4)'; ctx.lineWidth=1; ctx.setLineDash([8,12])
        ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(canvas.width,sy); ctx.stroke()
        ctx.setLineDash([])
      })
      cols.forEach(sx => {
        ctx.fillStyle='rgba(18,24,36,0.9)'; ctx.fillRect(sx-ROAD_W/2,0,ROAD_W,canvas.height)
        ctx.strokeStyle='rgba(184,200,224,0.2)'; ctx.lineWidth=0.8
        ctx.beginPath(); ctx.moveTo(sx-ROAD_W/2,0); ctx.lineTo(sx-ROAD_W/2,canvas.height); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(sx+ROAD_W/2,0); ctx.lineTo(sx+ROAD_W/2,canvas.height); ctx.stroke()
        ctx.strokeStyle='rgba(240,180,41,0.4)'; ctx.lineWidth=1; ctx.setLineDash([8,12])
        ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,canvas.height); ctx.stroke()
        ctx.setLineDash([])
      })

      // ── Intersections ──
      cols.forEach(sx => { rows.forEach(sy => {
        ctx.fillStyle='rgba(22,30,44,0.95)'
        ctx.fillRect(sx-ROAD_W/2,sy-ROAD_W/2,ROAD_W,ROAD_W)
        // Crosswalk stripes
        ctx.fillStyle='rgba(184,200,224,0.06)'
        for(let s=0;s<4;s++) {
          ctx.fillRect(sx-ROAD_W/2+s*4, sy-ROAD_W/2,   2, 5)
          ctx.fillRect(sx-ROAD_W/2+s*4, sy+ROAD_W/2-5, 2, 5)
        }
      })})

      // ── Traffic lights ──
      cols.forEach(sx => { rows.forEach(sy => {
        const state = getLightState(sx,sy,frame)
        if (state !== 'none') drawLight(sx,sy,state)
      })})

      // ── Buses ──
      buses.forEach(drawBus)

      // ── Spawn ──
      spawnTimer++
      if (spawnTimer > 90 && buses.length < 55) {
        spawnBus(edges[Math.floor(Math.random()*4)])
        spawnTimer = 0
      }

      frame++
      update()
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { window.removeEventListener('resize',resize); cancelAnimationFrame(animId) }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0 }} />
}

// ═══════════════════════════════════════════════════════════════════════════
//  INPUT — reference style: full width, icon right, glass
// ═══════════════════════════════════════════════════════════════════════════
function Input({ type='text', placeholder, value, onChange, right }: {
  type?: string; placeholder: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  right?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange} required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width:'100%', padding:'13px 44px 13px 16px',
          background: focused ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius:'10px', color:'#E8ECF2', fontSize:'14px',
          fontFamily:'DM Sans,sans-serif', outline:'none',
          backdropFilter:'blur(8px)', transition:'all 180ms',
          boxSizing:'border-box' as const,
        }}
      />
      <div style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', color: focused ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', pointerEvents: right ? 'auto' : 'none' }}>
        {right}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function LoginPage() {
  const supabase = createClient()
  const [role,setRole]       = useState<Role>(null)
  const [mode,setMode]       = useState<Mode>('login')
  const [showPass,setShowPass] = useState(false)
  const [loading,setLoading] = useState(false)
  const [form,setForm] = useState({ email:'',password:'',name:'',age:'',weeklyTrips:'',driverNumber:'',busUnit:'' })
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}))

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:`${location.origin}/auth/callback` }})
  }

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    if (mode==='login') {
      const {error} = await supabase.auth.signInWithPassword({ email:form.email, password:form.password })
      if (error) { toast.error('Email o contraseña incorrectos'); setLoading(false); return }
      const {data:p} = await supabase.from('profiles').select('role').eq('email',form.email).single()
      window.location.href = p?.role==='driver' ? '/driver' : p?.role==='admin' ? '/admin' : '/'
    } else {
      const {data,error} = await supabase.auth.signUp({ email:form.email, password:form.password, options:{data:{name:form.name,role}} })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user&&role==='user')   await supabase.from('user_profiles').insert({id:data.user.id,age:parseInt(form.age)||0,weekly_trips:parseInt(form.weeklyTrips)||0})
      if (data.user&&role==='driver') await supabase.from('driver_profiles').insert({id:data.user.id,driver_number:form.driverNumber,bus_unit:form.busUnit})
      toast.success('¡Cuenta creada! Revisá tu email.'); setMode('login')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'#07090F',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden' }}>
      <CityBackground />

      {/* Vignette */}
      <div style={{ position:'fixed',inset:0,background:'radial-gradient(ellipse at center, rgba(7,9,15,0.05) 0%, rgba(7,9,15,0.6) 100%)',zIndex:1,pointerEvents:'none' }} />

      <motion.div
        initial={{opacity:0,y:28,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
        transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
        style={{width:'100%',maxWidth:'360px',position:'relative',zIndex:2}}
      >
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <motion.div
            style={{width:'52px',height:'52px',borderRadius:'16px',background:'linear-gradient(145deg,rgba(34,211,160,0.18),rgba(34,211,160,0.06))',border:'1px solid rgba(34,211,160,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 11px',boxShadow:'0 0 30px rgba(34,211,160,0.2)'}}
            animate={{boxShadow:['0 0 16px rgba(34,211,160,0.15)','0 0 40px rgba(34,211,160,0.32)','0 0 16px rgba(34,211,160,0.15)']}}
            transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}
          >
            <Bus size={24} style={{color:'#22D3A0'}} />
          </motion.div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'28px',color:'#ffffff',letterSpacing:'-0.02em',margin:0,textShadow:'0 2px 24px rgba(0,0,0,0.9)'}}>
            Bien Parada
          </h1>
          <p style={{color:'rgba(255,255,255,0.28)',fontSize:'12px',marginTop:'4px'}}>Seguí tu colectivo en tiempo real</p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(12,16,26,0.8)',
          backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:'22px',overflow:'hidden',position:'relative',
          boxShadow:'0 32px 80px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.07) inset',
        }}>
          <div style={{position:'absolute',top:0,left:'25%',right:'25%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)'}} />

          <AnimatePresence mode="wait">

            {/* ROLE PICKER */}
            {!role && (
              <motion.div key="role" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'30px 24px 26px'}}>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'21px',color:'#fff',textAlign:'center',margin:'0 0 5px',letterSpacing:'-0.01em'}}>
                  Bienvenido
                </h2>
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>
                  ¿Cómo querés ingresar?
                </p>

                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'22px'}}>
                  {/* Usuario button */}
                  <motion.button
                    onClick={()=>setRole('user')} whileHover={{scale:1.015}} whileTap={{scale:0.985}}
                    style={{display:'flex',alignItems:'center',gap:'13px',padding:'14px 16px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',cursor:'pointer',textAlign:'left',transition:'all 200ms',width:'100%'}}
                  >
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(34,211,160,0.12)',border:'1px solid rgba(34,211,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <User size={18} style={{color:'#22D3A0'}} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',color:'#fff'}}>Soy Usuario</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'1px'}}>Ver colectivos en tiempo real</div>
                    </div>
                    <ArrowRight size={15} style={{color:'rgba(255,255,255,0.3)',flexShrink:0}} />
                  </motion.button>

                  {/* Chofer button */}
                  <motion.button
                    onClick={()=>setRole('driver')} whileHover={{scale:1.015}} whileTap={{scale:0.985}}
                    style={{display:'flex',alignItems:'center',gap:'13px',padding:'14px 16px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',cursor:'pointer',textAlign:'left',transition:'all 200ms',width:'100%'}}
                  >
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(194,200,212,0.1)',border:'1px solid rgba(194,200,212,0.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Bus size={18} style={{color:'rgba(194,200,212,0.9)'}} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'15px',color:'#fff'}}>Soy Chofer</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'1px'}}>Transmitir mi ubicación GPS</div>
                    </div>
                    <ArrowRight size={15} style={{color:'rgba(255,255,255,0.3)',flexShrink:0}} />
                  </motion.button>
                </div>

                <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'0 0 14px'}} />
                <p style={{textAlign:'center',fontSize:'10px',color:'rgba(255,255,255,0.12)',fontFamily:'DM Mono',letterSpacing:'0.05em'}}>
                  ADMIN: admin@admin.com / Admin123!
                </p>
              </motion.div>
            )}

            {/* AUTH FORM */}
            {role && (
              <motion.div key="form" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} style={{padding:'26px 24px 28px'}}>

                {/* Header */}
                <div style={{display:'flex',alignItems:'center',marginBottom:'20px'}}>
                  <button onClick={()=>{setRole(null);setMode('login')}} style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,marginRight:'10px'}}>
                    <ChevronLeft size={14} style={{color:'rgba(255,255,255,0.4)'}} />
                  </button>
                  <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'19px',color:'#fff',margin:0,flex:1,textAlign:'center',paddingRight:'38px'}}>
                    {mode==='login' ? 'Ingresar' : 'Registro'}
                  </h2>
                </div>

                {/* Mode toggle */}
                <div style={{display:'flex',gap:'2px',padding:'3px',background:'rgba(0,0,0,0.4)',borderRadius:'10px',marginBottom:'18px'}}>
                  {(['login','register'] as Mode[]).map(m=>(
                    <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'12px',fontFamily:'Syne,sans-serif',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,border:'none',cursor:'pointer',transition:'all 180ms',background:mode===m?'rgba(255,255,255,0.1)':'transparent',color:mode===m?'#fff':'rgba(255,255,255,0.3)'}}>
                      {m==='login'?'Ingresar':'Registrarse'}
                    </button>
                  ))}
                </div>

                {/* Fields */}
                <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {mode==='register' && (
                    <Input type="text" placeholder={role==='driver'?'Nombre completo':'Tu nombre'} value={form.name} onChange={set('name')}
                      right={<User size={15}/>} />
                  )}
                  <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} right={<Mail size={15}/>} />
                  <Input type={showPass?'text':'password'} placeholder="Contraseña" value={form.password} onChange={set('password')}
                    right={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',display:'flex',padding:0}}>{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
                  />
                  {mode==='register'&&role==='user'&&(<>
                    <Input type="number" placeholder="Edad" value={form.age} onChange={set('age')} right={<Calendar size={15}/>}/>
                    <Input type="number" placeholder="Veces por semana en colectivo" value={form.weeklyTrips} onChange={set('weeklyTrips')} right={<BarChart2 size={15}/>}/>
                  </>)}
                  {mode==='register'&&role==='driver'&&(<>
                    <Input type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} right={<Bus size={15}/>}/>
                    <Input type="text" placeholder="Número de unidad" value={form.busUnit} onChange={set('busUnit')} right={<Bus size={15}/>}/>
                  </>)}

                  {/* White submit button — reference style */}
                  <motion.button type="submit" disabled={loading}
                    whileHover={{scale:loading?1:1.02}} whileTap={{scale:loading?1:0.98}}
                    style={{width:'100%',padding:'13px',marginTop:'4px',background:loading?'rgba(255,255,255,0.6)':'#ffffff',color:'#07090F',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'14px',letterSpacing:'0.03em',border:'none',borderRadius:'10px',cursor:loading?'not-allowed':'pointer',boxShadow:'0 4px 24px rgba(255,255,255,0.12)',transition:'all 250ms',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                    {loading?'Cargando...':(mode==='login'?'Ingresar':'Crear cuenta')}
                    {!loading&&<ArrowRight size={15}/>}
                  </motion.button>
                </form>

                {/* Link toggle */}
                <p style={{textAlign:'center',fontSize:'12px',color:'rgba(255,255,255,0.28)',marginTop:'15px',marginBottom:0}}>
                  {mode==='login'?'¿No tenés cuenta? ':'¿Ya tenés cuenta? '}
                  <button onClick={()=>setMode(mode==='login'?'register':'login')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.65)',fontWeight:600,fontSize:'12px',fontFamily:'DM Sans',padding:0,textDecoration:'underline',textUnderlineOffset:'2px'}}>
                    {mode==='login'?'Registrarse':'Ingresar'}
                  </button>
                </p>

                {/* Google — users only */}
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