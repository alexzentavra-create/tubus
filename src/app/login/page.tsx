'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, User, Mail, Lock, Eye, EyeOff, Calendar, BarChart2, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Role = 'user' | 'driver' | null
type Mode = 'login' | 'register'

// ─── Animated street grid canvas ─────────────────────────────────────────────
function BusGridBackground() {
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

    const CELL = 48        // grid cell size
    const BUS_W = 18       // bus rectangle width
    const BUS_H = 9        // bus rectangle height
    const SPEED_MIN = 0.4
    const SPEED_MAX = 1.4

    // Build street grid — horizontal and vertical lanes
    interface Bus {
      x: number; y: number
      vx: number; vy: number
      color: string; opacity: number
      w: number; h: number
    }

    const COLORS = [
      'rgba(184,200,224,',   // platinum
      'rgba(34,211,160,',    // teal
      'rgba(148,163,184,',   // slate
      'rgba(100,116,139,',   // muted
    ]

    const buses: Bus[] = []

    const spawnBus = () => {
      const isHoriz = Math.random() > 0.5
      const color   = COLORS[Math.floor(Math.random() * COLORS.length)]
      const speed   = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
      const op      = 0.25 + Math.random() * 0.45

      if (isHoriz) {
        const row = Math.floor(Math.random() * Math.floor(canvas.height / CELL)) * CELL + CELL / 2
        const dir = Math.random() > 0.5 ? 1 : -1
        buses.push({
          x: dir > 0 ? -BUS_W : canvas.width + BUS_W,
          y: row,
          vx: speed * dir, vy: 0,
          color, opacity: op,
          w: BUS_W, h: BUS_H,
        })
      } else {
        const col = Math.floor(Math.random() * Math.floor(canvas.width / CELL)) * CELL + CELL / 2
        const dir = Math.random() > 0.5 ? 1 : -1
        buses.push({
          x: col,
          y: dir > 0 ? -BUS_H : canvas.height + BUS_H,
          vx: 0, vy: speed * dir,
          color, opacity: op,
          w: BUS_H, h: BUS_W,
        })
      }
    }

    // Pre-spawn buses
    for (let i = 0; i < 28; i++) spawnBus()

    let spawnTimer = 0
    let animId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // ── Grid lines ──
      ctx.lineWidth = 0.5

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += CELL) {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
        grad.addColorStop(0,   'rgba(184,200,224,0)')
        grad.addColorStop(0.3, 'rgba(184,200,224,0.07)')
        grad.addColorStop(0.7, 'rgba(184,200,224,0.07)')
        grad.addColorStop(1,   'rgba(184,200,224,0)')
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Vertical lines
      for (let x = 0; x < canvas.width; x += CELL) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
        grad.addColorStop(0,   'rgba(184,200,224,0)')
        grad.addColorStop(0.3, 'rgba(184,200,224,0.07)')
        grad.addColorStop(0.7, 'rgba(184,200,224,0.07)')
        grad.addColorStop(1,   'rgba(184,200,224,0)')
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // ── Intersection dots ──
      for (let x = 0; x < canvas.width; x += CELL) {
        for (let y = 0; y < canvas.height; y += CELL) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(184,200,224,0.12)'
          ctx.fill()
        }
      }

      // ── Buses ──
      buses.forEach((b, i) => {
        b.x += b.vx
        b.y += b.vy

        // Remove off-screen
        if (
          b.x < -60 || b.x > canvas.width  + 60 ||
          b.y < -60 || b.y > canvas.height + 60
        ) {
          buses.splice(i, 1)
          return
        }

        ctx.save()
        ctx.translate(b.x, b.y)

        // Glow
        ctx.shadowColor  = b.color + '0.6)'
        ctx.shadowBlur   = 8

        // Body
        ctx.fillStyle    = b.color + b.opacity + ')'
        ctx.strokeStyle  = b.color + Math.min(b.opacity + 0.2, 0.9) + ')'
        ctx.lineWidth    = 0.5

        const r = 2
        const hw = b.w / 2, hh = b.h / 2
        ctx.beginPath()
        ctx.moveTo(-hw + r, -hh)
        ctx.lineTo( hw - r, -hh)
        ctx.quadraticCurveTo( hw, -hh,  hw, -hh + r)
        ctx.lineTo( hw,  hh - r)
        ctx.quadraticCurveTo( hw,  hh,  hw - r,  hh)
        ctx.lineTo(-hw + r,  hh)
        ctx.quadraticCurveTo(-hw,  hh, -hw,  hh - r)
        ctx.lineTo(-hw, -hh + r)
        ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Window stripe
        ctx.fillStyle = b.color + Math.min(b.opacity + 0.3, 0.95) + ')'
        if (b.vx !== 0) {
          // horizontal bus — windows on top
          ctx.fillRect(-hw + 3, -hh + 1.5, b.w - 6, 2)
        } else {
          // vertical bus — windows on side
          ctx.fillRect(-hw + 1.5, -hh + 3, 2, b.h - 6)
        }

        // Headlight dot
        ctx.shadowBlur  = 12
        ctx.fillStyle   = 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        if (b.vx > 0) ctx.arc( hw - 1.5, 0, 1.2, 0, Math.PI * 2)
        if (b.vx < 0) ctx.arc(-hw + 1.5, 0, 1.2, 0, Math.PI * 2)
        if (b.vy > 0) ctx.arc(0,  hh - 1.5, 1.2, 0, Math.PI * 2)
        if (b.vy < 0) ctx.arc(0, -hh + 1.5, 1.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      })

      // ── Spawn new buses periodically ──
      spawnTimer++
      if (spawnTimer > 40) {
        spawnBus()
        spawnTimer = 0
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  )
}

// ─── Main login page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const supabase = createClient()
  const [role, setRole]         = useState<Role>(null)
  const [mode, setMode]         = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [form, setForm] = useState({
    email:'', password:'', name:'',
    age:'', weeklyTrips:'', driverNumber:'', busUnit:'',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      })
      if (error) { toast.error('Email o contraseña incorrectos'); setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('email', form.email).single()
      window.location.href = p?.role === 'driver' ? '/driver' : p?.role === 'admin' ? '/admin' : '/'
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name, role } },
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user && role === 'user') {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          age: parseInt(form.age) || 0,
          weekly_trips: parseInt(form.weeklyTrips) || 0,
        })
      }
      if (data.user && role === 'driver') {
        await supabase.from('driver_profiles').insert({
          id: data.user.id,
          driver_number: form.driverNumber,
          bus_unit: form.busUnit,
        })
      }
      toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
      setMode('login')
    }
    setLoading(false)
  }

  const accentColor = role === 'user' ? '#22D3A0' : role === 'driver' ? '#C2C8D4' : '#B8C8E0'

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      background: '#060810',
      fontFamily: 'DM Sans, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Animated bus grid */}
      <BusGridBackground />

      {/* Deep vignette so card pops */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, transparent 20%, rgba(6,8,16,0.75) 100%)', zIndex: 1, pointerEvents: 'none' }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
        style={{
          width: '100%', maxWidth: '380px',
          position: 'relative', zIndex: 2,
        }}
      >
        {/* Logo above card */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <motion.div
            style={{ width: '52px', height: '52px', borderRadius: '15px', background: 'linear-gradient(145deg, rgba(34,211,160,0.18), rgba(184,200,224,0.08))', border: '1px solid rgba(34,211,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 0 32px rgba(34,211,160,0.15)' }}
            animate={{ boxShadow: ['0 0 16px rgba(34,211,160,0.1)', '0 0 40px rgba(34,211,160,0.25)', '0 0 16px rgba(34,211,160,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bus size={24} style={{ color: '#22D3A0' }} />
          </motion.div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: '#E8ECF2', letterSpacing: '-0.02em', margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            Bien Parada
          </h1>
          <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '3px' }}>
            Seguí tu colectivo en tiempo real
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: 'rgba(13,17,23,0.72)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(184,200,224,0.13)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 1px 0 rgba(184,200,224,0.1) inset, 0 -1px 0 rgba(0,0,0,0.5) inset',
          position: 'relative',
        }}>
          {/* Top shimmer */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)`, transition: 'background 400ms' }} />

          <AnimatePresence mode="wait">

            {/* STEP 1 — Role picker */}
            {!role && (
              <motion.div key="role" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }} style={{ padding:'28px 24px 30px' }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'19px', color:'#E8ECF2', textAlign:'center', margin:'0 0 4px' }}>
                  Bienvenido
                </h2>
                <p style={{ color:'#4A5568', fontSize:'12px', textAlign:'center', marginBottom:'24px' }}>
                  ¿Cómo querés ingresar?
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {/* Usuario */}
                  <motion.button
                    onClick={() => setRole('user')}
                    whileHover={{ scale:1.02, borderColor:'rgba(34,211,160,0.4)' }}
                    whileTap={{ scale:0.98 }}
                    style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px 18px', background:'linear-gradient(135deg, rgba(34,211,160,0.07), rgba(34,211,160,0.02))', border:'1px solid rgba(34,211,160,0.18)', borderRadius:'14px', cursor:'pointer', textAlign:'left' }}
                  >
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(34,211,160,0.1)', border:'1px solid rgba(34,211,160,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <User size={20} style={{ color:'#22D3A0' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'15px', color:'#E8ECF2' }}>Soy Usuario</div>
                      <div style={{ fontSize:'11px', color:'#4A5568', marginTop:'1px' }}>Ver colectivos en tiempo real</div>
                    </div>
                    <ArrowRight size={16} style={{ color:'#22D3A0', flexShrink:0 }} />
                  </motion.button>

                  {/* Chofer */}
                  <motion.button
                    onClick={() => setRole('driver')}
                    whileHover={{ scale:1.02, borderColor:'rgba(184,200,224,0.3)' }}
                    whileTap={{ scale:0.98 }}
                    style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px 18px', background:'linear-gradient(135deg, rgba(184,200,224,0.06), rgba(184,200,224,0.02))', border:'1px solid rgba(184,200,224,0.13)', borderRadius:'14px', cursor:'pointer', textAlign:'left' }}
                  >
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(184,200,224,0.07)', border:'1px solid rgba(184,200,224,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Bus size={20} style={{ color:'#C2C8D4' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'15px', color:'#E8ECF2' }}>Soy Chofer</div>
                      <div style={{ fontSize:'11px', color:'#4A5568', marginTop:'1px' }}>Transmitir mi ubicación GPS</div>
                    </div>
                    <ArrowRight size={16} style={{ color:'#C2C8D4', flexShrink:0 }} />
                  </motion.button>
                </div>

                <p style={{ textAlign:'center', fontSize:'10px', color:'#1E2638', marginTop:'20px', fontFamily:'DM Mono', letterSpacing:'0.04em' }}>
                  ADMIN: admin@admin.com / Admin123!
                </p>
              </motion.div>
            )}

            {/* STEP 2 — Auth form */}
            {role && (
              <motion.div key="form" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }} style={{ padding:'24px 24px 28px' }}>

                {/* Back + badge */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                  <button
                    onClick={() => { setRole(null); setMode('login') }}
                    style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(184,200,224,0.05)', border:'1px solid rgba(184,200,224,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                  >
                    <ChevronLeft size={15} style={{ color:'#8A95A8' }} />
                  </button>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 11px', borderRadius:'999px', background: role==='user' ? 'rgba(34,211,160,0.08)' : 'rgba(184,200,224,0.06)', border:`1px solid ${role==='user' ? 'rgba(34,211,160,0.2)' : 'rgba(184,200,224,0.14)'}` }}>
                    {role==='user' ? <User size={11} style={{ color:'#22D3A0' }}/> : <Bus size={11} style={{ color:'#C2C8D4' }}/>}
                    <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.08em', fontFamily:'DM Mono', color: role==='user' ? '#22D3A0' : '#C2C8D4' }}>
                      {role==='user' ? 'USUARIO' : 'CHOFER'}
                    </span>
                  </div>
                </div>

                {/* Mode toggle */}
                <div style={{ display:'flex', gap:'2px', padding:'3px', background:'rgba(6,8,16,0.7)', borderRadius:'10px', marginBottom:'18px' }}>
                  {(['login','register'] as Mode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'8px', borderRadius:'8px', fontSize:'11px', fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', border:'none', cursor:'pointer', transition:'all 200ms', background: mode===m ? 'rgba(184,200,224,0.09)' : 'transparent', color: mode===m ? '#C2C8D4' : '#2D3444', boxShadow: mode===m ? 'inset 0 1px 0 rgba(184,200,224,0.1), 0 0 0 1px rgba(184,200,224,0.07)' : 'none' }}>
                      {m==='login' ? 'Ingresar' : 'Registrarse'}
                    </button>
                  ))}
                </div>

                {/* Fields */}
                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'9px' }}>

                  {mode==='register' && (
                    <div style={{ position:'relative' }}>
                      <User size={13} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#2D3444' }} />
                      <input className="input-dark" style={{ paddingLeft:'38px' }} type="text" placeholder={role==='driver' ? 'Nombre completo' : 'Tu nombre'} value={form.name} onChange={set('name')} required />
                    </div>
                  )}

                  <div style={{ position:'relative' }}>
                    <Mail size={13} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#2D3444' }} />
                    <input className="input-dark" style={{ paddingLeft:'38px' }} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
                  </div>

                  <div style={{ position:'relative' }}>
                    <Lock size={13} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#2D3444' }} />
                    <input className="input-dark" style={{ paddingLeft:'38px', paddingRight:'40px' }} type={showPass?'text':'password'} placeholder="Contraseña" value={form.password} onChange={set('password')} required />
                    <button type="button" onClick={() => setShowPass(p=>!p)} style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#2D3444', display:'flex', padding:0 }}>
                      {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
                    </button>
                  </div>

                  {mode==='register' && role==='user' && (<>
                    <div style={{ position:'relative' }}>
                      <Calendar size={13} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#2D3444' }} />
                      <input className="input-dark" style={{ paddingLeft:'38px' }} type="number" placeholder="Edad" min={5} max={120} value={form.age} onChange={set('age')} required />
                    </div>
                    <div style={{ position:'relative' }}>
                      <BarChart2 size={13} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#2D3444' }} />
                      <input className="input-dark" style={{ paddingLeft:'38px' }} type="number" placeholder="Veces por semana en colectivo" min={0} value={form.weeklyTrips} onChange={set('weeklyTrips')} required />
                    </div>
                  </>)}

                  {mode==='register' && role==='driver' && (<>
                    <input className="input-dark" type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} required />
                    <input className="input-dark" type="text" placeholder="Número de unidad" value={form.busUnit} onChange={set('busUnit')} required />
                  </>)}

                  <div style={{ marginTop:'6px' }}>
                    <motion.button
                      type="submit" disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.01 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      style={{
                        width:'100%', padding:'13px', borderRadius:'12px',
                        background: role==='user'
                          ? 'linear-gradient(135deg, rgba(34,211,160,0.85), rgba(16,185,129,0.8))'
                          : 'linear-gradient(145deg, #C2C8D4, #9AA4B8, #B0B8C8)',
                        color: '#060810',
                        fontFamily:'Syne,sans-serif', fontWeight:700,
                        fontSize:'12px', letterSpacing:'0.07em', textTransform:'uppercase',
                        border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                        boxShadow: role==='user' ? '0 4px 20px rgba(34,211,160,0.3)' : '0 4px 20px rgba(184,200,224,0.2)',
                        opacity: loading ? 0.7 : 1,
                        transition:'all 250ms',
                      }}
                    >
                      {loading ? 'Cargando...' : mode==='login' ? 'Ingresar' : 'Crear cuenta'}
                      {!loading && <ArrowRight size={14}/>}
                    </motion.button>
                  </div>
                </form>

                {/* Google — users only */}
                {role==='user' && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'14px 0' }}>
                      <div style={{ flex:1, height:'1px', background:'rgba(184,200,224,0.08)' }} />
                      <span style={{ fontSize:'10px', color:'#2D3444', fontFamily:'DM Mono', letterSpacing:'0.06em' }}>O</span>
                      <div style={{ flex:1, height:'1px', background:'rgba(184,200,224,0.08)' }} />
                    </div>
                    <button onClick={loginWithGoogle} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(184,200,224,0.1)', borderRadius:'12px', padding:'12px', color:'#8A95A8', fontSize:'13px', fontWeight:500, cursor:'pointer', transition:'all 200ms' }}>
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