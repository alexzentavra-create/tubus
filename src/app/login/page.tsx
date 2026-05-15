'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, User, Mail, Lock, Eye, EyeOff, Calendar, BarChart2, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Role = 'user' | 'driver' | null
type Mode = 'login' | 'register'

// ─── Street grid + bus animation ─────────────────────────────────────────────
function StreetBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Street grid — every 120px a two-way street
    const STREET_GAP = 130
    const LANE_W     = 12   // each lane width
    const ROAD_W     = LANE_W * 2 + 6  // total road = 2 lanes + divider

    // Bus dimensions
    const BUS_LEN = 32
    const BUS_WID = 10

    interface BusObj {
      x: number; y: number
      vx: number; vy: number
      lane: number   // pixel center of lane
      color: string
      opacity: number
      glowColor: string
    }

    const BUS_COLORS = [
      { body: 'rgba(194,200,212,', glow: 'rgba(184,200,224,' },
      { body: 'rgba(34,211,160,',  glow: 'rgba(34,211,160,' },
      { body: 'rgba(148,163,184,', glow: 'rgba(148,163,184,' },
      { body: 'rgba(100,116,139,', glow: 'rgba(100,116,139,' },
    ]

    // Compute street center positions
    const hStreets: number[] = []
    const vStreets: number[] = []

    const buildStreets = () => {
      hStreets.length = 0
      vStreets.length = 0
      for (let y = STREET_GAP; y < canvas.height; y += STREET_GAP) hStreets.push(y)
      for (let x = STREET_GAP; x < canvas.width;  x += STREET_GAP) vStreets.push(x)
    }
    buildStreets()

    const buses: BusObj[] = []

    const spawnHBus = (streetY: number, dir: 1 | -1) => {
      const c = BUS_COLORS[Math.floor(Math.random() * BUS_COLORS.length)]
      const lane = streetY + (dir > 0 ? -LANE_W / 2 - 1 : LANE_W / 2 + 1)
      buses.push({
        x: dir > 0 ? -BUS_LEN : canvas.width + BUS_LEN,
        y: lane,
        vx: dir * (0.5 + Math.random() * 0.8),
        vy: 0,
        lane,
        color: c.body,
        glowColor: c.glow,
        opacity: 0.55 + Math.random() * 0.35,
      })
    }

    const spawnVBus = (streetX: number, dir: 1 | -1) => {
      const c = BUS_COLORS[Math.floor(Math.random() * BUS_COLORS.length)]
      const lane = streetX + (dir > 0 ? -LANE_W / 2 - 1 : LANE_W / 2 + 1)
      buses.push({
        x: lane,
        y: dir > 0 ? -BUS_LEN : canvas.height + BUS_LEN,
        vx: 0,
        vy: dir * (0.5 + Math.random() * 0.8),
        lane,
        color: c.body,
        glowColor: c.glow,
        opacity: 0.55 + Math.random() * 0.35,
      })
    }

    // Seed initial buses
    hStreets.forEach(sy => {
      if (Math.random() > 0.3) spawnHBus(sy,  1)
      if (Math.random() > 0.3) spawnHBus(sy, -1)
    })
    vStreets.forEach(sx => {
      if (Math.random() > 0.3) spawnVBus(sx,  1)
      if (Math.random() > 0.3) spawnVBus(sx, -1)
    })

    let frame = 0
    let animId: number

    // Draw a bus rectangle with proper detail
    const drawBus = (b: BusObj) => {
      ctx.save()
      ctx.translate(b.x, b.y)

      const isH = b.vx !== 0
      const dir = isH ? Math.sign(b.vx) : Math.sign(b.vy)
      if (isH && dir < 0) ctx.rotate(Math.PI)
      if (!isH && dir > 0) ctx.rotate(Math.PI / 2)
      if (!isH && dir < 0) ctx.rotate(-Math.PI / 2)

      const L = BUS_LEN / 2
      const W = BUS_WID / 2
      const r = 2.5

      // Glow
      ctx.shadowColor = b.glowColor + '0.8)'
      ctx.shadowBlur  = 14

      // Body
      ctx.beginPath()
      ctx.moveTo(-L + r, -W)
      ctx.lineTo( L - r, -W)
      ctx.arcTo(  L, -W,  L,  -W + r, r)
      ctx.lineTo( L,  W - r)
      ctx.arcTo(  L,  W,  L - r, W, r)
      ctx.lineTo(-L + r,  W)
      ctx.arcTo( -L,  W, -L,  W - r, r)
      ctx.lineTo(-L, -W + r)
      ctx.arcTo( -L, -W, -L + r, -W, r)
      ctx.closePath()
      ctx.fillStyle   = b.color + b.opacity + ')'
      ctx.strokeStyle = b.color + Math.min(b.opacity + 0.25, 1) + ')'
      ctx.lineWidth   = 0.8
      ctx.fill()
      ctx.stroke()

      // Windows row — top strip
      ctx.shadowBlur = 0
      ctx.fillStyle  = b.color + Math.min(b.opacity + 0.3, 0.95) + ')'
      // 3 windows
      const winW = 5, winH = 3, winY = -W + 1.5
      for (let i = 0; i < 3; i++) {
        const wx = -L + 5 + i * (winW + 3)
        ctx.beginPath()
        ctx.roundRect(wx, winY, winW, winH, 0.8)
        ctx.fill()
      }

      // Rear lights (left side = back)
      ctx.fillStyle = 'rgba(255,80,80,0.85)'
      ctx.shadowColor = 'rgba(255,80,80,0.8)'
      ctx.shadowBlur  = 6
      ctx.beginPath()
      ctx.roundRect(-L + 0.5, -W + 1, 2.5, W * 2 - 2, 0.5)
      ctx.fill()

      // Headlights (right side = front)
      ctx.fillStyle   = 'rgba(255,255,200,0.95)'
      ctx.shadowColor = 'rgba(255,255,200,0.9)'
      ctx.shadowBlur  = 10
      ctx.beginPath()
      ctx.arc(L - 2, -W + 2,   1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(L - 2,  W - 2,   1.4, 0, Math.PI * 2)
      ctx.fill()

      // Headlight beam
      const beam = ctx.createLinearGradient(L, 0, L + 30, 0)
      beam.addColorStop(0,   'rgba(255,255,200,0.18)')
      beam.addColorStop(1,   'rgba(255,255,200,0)')
      ctx.fillStyle   = beam
      ctx.shadowBlur  = 0
      ctx.beginPath()
      ctx.moveTo(L, -W)
      ctx.lineTo(L + 30, -W - 10)
      ctx.lineTo(L + 30,  W + 10)
      ctx.lineTo(L,  W)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // ── Draw streets ──
      hStreets.forEach(sy => {
        // Road fill
        ctx.fillStyle = 'rgba(20,28,40,0.85)'
        ctx.fillRect(0, sy - ROAD_W/2, canvas.width, ROAD_W)

        // Road edges
        ctx.strokeStyle = 'rgba(184,200,224,0.18)'
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.moveTo(0, sy - ROAD_W/2); ctx.lineTo(canvas.width, sy - ROAD_W/2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, sy + ROAD_W/2); ctx.lineTo(canvas.width, sy + ROAD_W/2); ctx.stroke()

        // Center dashed divider
        ctx.strokeStyle = 'rgba(240,180,41,0.35)'
        ctx.lineWidth   = 1
        ctx.setLineDash([8, 10])
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke()
        ctx.setLineDash([])

        // Lane markings (dashed white)
        ctx.strokeStyle = 'rgba(184,200,224,0.08)'
        ctx.lineWidth   = 0.5
        ctx.setLineDash([12, 16])
        ctx.beginPath(); ctx.moveTo(0, sy - LANE_W/2); ctx.lineTo(canvas.width, sy - LANE_W/2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, sy + LANE_W/2); ctx.lineTo(canvas.width, sy + LANE_W/2); ctx.stroke()
        ctx.setLineDash([])
      })

      vStreets.forEach(sx => {
        ctx.fillStyle = 'rgba(20,28,40,0.85)'
        ctx.fillRect(sx - ROAD_W/2, 0, ROAD_W, canvas.height)

        ctx.strokeStyle = 'rgba(184,200,224,0.18)'
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.moveTo(sx - ROAD_W/2, 0); ctx.lineTo(sx - ROAD_W/2, canvas.height); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(sx + ROAD_W/2, 0); ctx.lineTo(sx + ROAD_W/2, canvas.height); ctx.stroke()

        ctx.strokeStyle = 'rgba(240,180,41,0.35)'
        ctx.lineWidth   = 1
        ctx.setLineDash([8, 10])
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height); ctx.stroke()
        ctx.setLineDash([])

        ctx.strokeStyle = 'rgba(184,200,224,0.08)'
        ctx.lineWidth   = 0.5
        ctx.setLineDash([12, 16])
        ctx.beginPath(); ctx.moveTo(sx - LANE_W/2, 0); ctx.lineTo(sx - LANE_W/2, canvas.height); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(sx + LANE_W/2, 0); ctx.lineTo(sx + LANE_W/2, canvas.height); ctx.stroke()
        ctx.setLineDash([])
      })

      // ── Intersections ──
      hStreets.forEach(sy => {
        vStreets.forEach(sx => {
          ctx.fillStyle = 'rgba(30,38,56,0.9)'
          ctx.fillRect(sx - ROAD_W/2, sy - ROAD_W/2, ROAD_W, ROAD_W)
          // Corner dots
          ctx.fillStyle = 'rgba(184,200,224,0.12)'
          ;[[sx-ROAD_W/2, sy-ROAD_W/2],[sx+ROAD_W/2, sy-ROAD_W/2],[sx-ROAD_W/2, sy+ROAD_W/2],[sx+ROAD_W/2, sy+ROAD_W/2]].forEach(([cx,cy]) => {
            ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI*2); ctx.fill()
          })
        })
      })

      // ── Sidewalk dots (city feel) ──
      for (let x = 0; x < canvas.width; x += STREET_GAP) {
        for (let y = 0; y < canvas.height; y += STREET_GAP) {
          ctx.fillStyle = 'rgba(184,200,224,0.04)'
          ctx.beginPath()
          ctx.arc(x + STREET_GAP/2, y + STREET_GAP/2, 1, 0, Math.PI*2)
          ctx.fill()
        }
      }

      // ── Move + draw buses ──
      for (let i = buses.length - 1; i >= 0; i--) {
        const b = buses[i]
        b.x += b.vx
        b.y += b.vy

        // Remove off-screen
        if (b.x < -80 || b.x > canvas.width+80 || b.y < -80 || b.y > canvas.height+80) {
          buses.splice(i, 1)
          continue
        }
        drawBus(b)
      }

      // ── Respawn buses ──
      frame++
      if (frame % 80 === 0 && buses.length < 60) {
        const isH = Math.random() > 0.5
        if (isH && hStreets.length) {
          const sy  = hStreets[Math.floor(Math.random() * hStreets.length)]
          spawnHBus(sy, Math.random() > 0.5 ? 1 : -1)
        } else if (vStreets.length) {
          const sx = vStreets[Math.floor(Math.random() * vStreets.length)]
          spawnVBus(sx, Math.random() > 0.5 ? 1 : -1)
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0 }} />
}

// ─── Input component ──────────────────────────────────────────────────────────
function GlassInput({ type='text', placeholder, value, onChange, icon: Icon, rightEl }: {
  type?: string; placeholder: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon: React.ElementType; rightEl?: React.ReactNode
}) {
  return (
    <div style={{ position:'relative', width:'100%' }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        style={{
          width:'100%', padding:'13px 44px 13px 16px',
          background:'rgba(255,255,255,0.05)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:'10px',
          color:'#E8ECF2', fontSize:'14px',
          fontFamily:'DM Sans, sans-serif',
          outline:'none',
          backdropFilter:'blur(8px)',
          transition:'border-color 200ms, background 200ms',
          boxSizing:'border-box',
        }}
        onFocus={e => { e.target.style.borderColor='rgba(255,255,255,0.25)'; e.target.style.background='rgba(255,255,255,0.08)' }}
        onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.1)';  e.target.style.background='rgba(255,255,255,0.05)' }}
      />
      <div style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center' }}>
        {rightEl || <Icon size={16} />}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const supabase = createClient()
  const [role, setRole]         = useState<Role>(null)
  const [mode, setMode]         = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [form, setForm] = useState({
    email:'', password:'', name:'', age:'',
    weeklyTrips:'', driverNumber:'', busUnit:'',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider:'google', options:{ redirectTo:`${location.origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password })
      if (error) { toast.error('Email o contraseña incorrectos'); setLoading(false); return }
      const { data:p } = await supabase.from('profiles').select('role').eq('email', form.email).single()
      window.location.href = p?.role==='driver' ? '/driver' : p?.role==='admin' ? '/admin' : '/'
    } else {
      const { data, error } = await supabase.auth.signUp({
        email:form.email, password:form.password,
        options:{ data:{ name:form.name, role } },
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user && role==='user')   await supabase.from('user_profiles').insert({ id:data.user.id, age:parseInt(form.age)||0, weekly_trips:parseInt(form.weeklyTrips)||0 })
      if (data.user && role==='driver') await supabase.from('driver_profiles').insert({ id:data.user.id, driver_number:form.driverNumber, bus_unit:form.busUnit })
      toast.success('¡Cuenta creada! Revisá tu email.'); setMode('login')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', background:'#07090F', fontFamily:'DM Sans, sans-serif', position:'relative', overflow:'hidden' }}>

      <StreetBackground />

      {/* Vignette */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at center, rgba(7,9,15,0.1) 0%, rgba(7,9,15,0.65) 100%)', zIndex:1, pointerEvents:'none' }} />

      <motion.div
        initial={{ opacity:0, y:24, scale:0.97 }}
        animate={{ opacity:1, y:0, scale:1 }}
        transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
        style={{ width:'100%', maxWidth:'360px', position:'relative', zIndex:2 }}
      >
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'22px' }}>
          <motion.div
            style={{ width:'54px', height:'54px', borderRadius:'16px', background:'linear-gradient(145deg,rgba(34,211,160,0.2),rgba(34,211,160,0.05))', border:'1px solid rgba(34,211,160,0.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 0 32px rgba(34,211,160,0.2)' }}
            animate={{ boxShadow:['0 0 16px rgba(34,211,160,0.15)','0 0 40px rgba(34,211,160,0.3)','0 0 16px rgba(34,211,160,0.15)'] }}
            transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
          >
            <Bus size={26} style={{ color:'#22D3A0' }} />
          </motion.div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'28px', color:'#ffffff', letterSpacing:'-0.02em', margin:0, textShadow:'0 2px 24px rgba(0,0,0,0.9)' }}>
            Bien Parada
          </h1>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px', marginTop:'4px' }}>
            Seguí tu colectivo en tiempo real
          </p>
        </div>

        {/* Glass card — matches reference style */}
        <div style={{
          background:'rgba(15,18,28,0.75)',
          backdropFilter:'blur(48px)',
          WebkitBackdropFilter:'blur(48px)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:'20px',
          boxShadow:'0 32px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.08) inset',
          overflow:'hidden', position:'relative',
        }}>
          {/* Subtle top line */}
          <div style={{ position:'absolute', top:0, left:'25%', right:'25%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />

          <AnimatePresence mode="wait">

            {/* ── Role picker ── */}
            {!role && (
              <motion.div key="role" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.18 }} style={{ padding:'30px 26px 28px' }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'22px', color:'#ffffff', textAlign:'center', margin:'0 0 6px', letterSpacing:'-0.01em' }}>
                  Bienvenido
                </h2>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'13px', textAlign:'center', marginBottom:'26px' }}>
                  ¿Cómo querés ingresar?
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
                  {/* Usuario */}
                  <motion.button
                    onClick={() => setRole('user')}
                    whileHover={{ scale:1.015 }} whileTap={{ scale:0.985 }}
                    style={{ display:'flex', alignItems:'center', gap:'14px', padding:'15px 18px', background:'rgba(34,211,160,0.08)', border:'1px solid rgba(34,211,160,0.22)', borderRadius:'12px', cursor:'pointer', textAlign:'left', transition:'all 220ms' }}
                  >
                    <div style={{ width:'42px', height:'42px', borderRadius:'11px', background:'rgba(34,211,160,0.12)', border:'1px solid rgba(34,211,160,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <User size={19} style={{ color:'#22D3A0' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'15px', color:'#ffffff' }}>Soy Usuario</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'1px' }}>Ver colectivos en tiempo real</div>
                    </div>
                    <ArrowRight size={16} style={{ color:'#22D3A0', flexShrink:0 }} />
                  </motion.button>

                  {/* Chofer */}
                  <motion.button
                    onClick={() => setRole('driver')}
                    whileHover={{ scale:1.015 }} whileTap={{ scale:0.985 }}
                    style={{ display:'flex', alignItems:'center', gap:'14px', padding:'15px 18px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', cursor:'pointer', textAlign:'left', transition:'all 220ms' }}
                  >
                    <div style={{ width:'42px', height:'42px', borderRadius:'11px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Bus size={19} style={{ color:'rgba(194,200,212,0.9)' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'15px', color:'#ffffff' }}>Soy Chofer</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'1px' }}>Transmitir mi ubicación GPS</div>
                    </div>
                    <ArrowRight size={16} style={{ color:'rgba(194,200,212,0.7)', flexShrink:0 }} />
                  </motion.button>
                </div>

                <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'0 0 16px' }} />
                <p style={{ textAlign:'center', fontSize:'10px', color:'rgba(255,255,255,0.15)', fontFamily:'DM Mono', letterSpacing:'0.05em' }}>
                  ADMIN: admin@admin.com / Admin123!
                </p>
              </motion.div>
            )}

            {/* ── Auth form — matches reference design ── */}
            {role && (
              <motion.div key="form" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.18 }} style={{ padding:'28px 26px 30px' }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', marginBottom:'6px' }}>
                  <button onClick={() => { setRole(null); setMode('login') }} style={{ width:'28px', height:'28px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginRight:'10px' }}>
                    <ChevronLeft size={14} style={{ color:'rgba(255,255,255,0.5)' }} />
                  </button>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'20px', color:'#ffffff', margin:0, flex:1, textAlign:'center', paddingRight:'38px' }}>
                    {mode==='login' ? 'Ingresar' : 'Registro'}
                  </h2>
                </div>

                {/* Role badge */}
                <div style={{ display:'flex', justifyContent:'center', marginBottom:'22px' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'999px', background: role==='user' ? 'rgba(34,211,160,0.1)' : 'rgba(255,255,255,0.06)', border:`1px solid ${role==='user' ? 'rgba(34,211,160,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                    {role==='user' ? <User size={10} style={{ color:'#22D3A0' }}/> : <Bus size={10} style={{ color:'rgba(194,200,212,0.8)' }}/>}
                    <span style={{ fontSize:'10px', fontWeight:700, fontFamily:'DM Mono', letterSpacing:'0.08em', color: role==='user' ? '#22D3A0' : 'rgba(194,200,212,0.8)' }}>
                      {role==='user' ? 'USUARIO' : 'CHOFER'}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

                  {mode==='register' && (
                    <GlassInput type="text" placeholder={role==='driver' ? 'Nombre completo' : 'Tu nombre'} value={form.name} onChange={set('name')} icon={User} />
                  )}

                  <GlassInput type="email" placeholder="Email" value={form.email} onChange={set('email')} icon={Mail} />

                  <GlassInput
                    type={showPass ? 'text' : 'password'}
                    placeholder="Contraseña"
                    value={form.password} onChange={set('password')} icon={Lock}
                    rightEl={
                      <button type="button" onClick={() => setShowPass(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex', padding:0 }}>
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    }
                  />

                  {mode==='register' && role==='user' && (<>
                    <GlassInput type="number" placeholder="Edad" value={form.age} onChange={set('age')} icon={Calendar} />
                    <GlassInput type="number" placeholder="Veces por semana en colectivo" value={form.weeklyTrips} onChange={set('weeklyTrips')} icon={BarChart2} />
                  </>)}

                  {mode==='register' && role==='driver' && (<>
                    <GlassInput type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} icon={Bus} />
                    <GlassInput type="text" placeholder="Número de unidad" value={form.busUnit} onChange={set('busUnit')} icon={Bus} />
                  </>)}

                  {/* Submit — white button like reference */}
                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{  scale: loading ? 1 : 0.98 }}
                    style={{
                      width:'100%', padding:'13px',
                      marginTop:'4px',
                      background: loading ? 'rgba(255,255,255,0.5)' : '#ffffff',
                      color:'#07090F',
                      fontFamily:'Syne,sans-serif', fontWeight:700,
                      fontSize:'14px', letterSpacing:'0.04em',
                      border:'none', borderRadius:'10px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow:'0 4px 24px rgba(255,255,255,0.15)',
                      transition:'all 250ms',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    }}
                  >
                    {loading ? 'Cargando...' : mode==='login' ? 'Ingresar' : 'Crear cuenta'}
                    {!loading && <ArrowRight size={15}/>}
                  </motion.button>
                </form>

                {/* Toggle mode link — like reference */}
                <p style={{ textAlign:'center', fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'16px', marginBottom:0 }}>
                  {mode==='login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
                  <button onClick={() => setMode(mode==='login' ? 'register' : 'login')} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:'12px', fontFamily:'DM Sans', padding:0, textDecoration:'underline', textUnderlineOffset:'2px' }}>
                    {mode==='login' ? 'Registrarse' : 'Ingresar'}
                  </button>
                </p>

                {/* Google */}
                {role==='user' && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'16px 0 12px' }}>
                      <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }} />
                      <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', fontFamily:'DM Mono', letterSpacing:'0.08em' }}>O</span>
                      <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }} />
                    </div>
                    <button onClick={loginWithGoogle} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'12px', color:'rgba(255,255,255,0.5)', fontSize:'13px', fontWeight:500, cursor:'pointer', transition:'all 200ms' }}>
                      <svg width="15" height="15" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Continuar con Google
                    </button>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}