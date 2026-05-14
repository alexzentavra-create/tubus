'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, User, Mail, Lock, Eye, EyeOff, Calendar, BarChart2, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Role = 'user' | 'driver' | null
type Mode = 'login' | 'register'

export default function LoginPage() {
  const supabase = createClient()
  const [role, setRole] = useState<Role>(null)
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', name: '',
    age: '', weeklyTrips: '', driverNumber: '', busUnit: '',
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(34,211,160,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(184,200,224,0.05) 0%, transparent 50%), #060810',
      fontFamily: 'DM Sans, sans-serif',
      overflow: 'auto',
    }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(34,211,160,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(184,200,224,0.04) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <motion.div
        style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(34,211,160,0.15), rgba(184,200,224,0.08))', border: '1px solid rgba(34,211,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 40px rgba(34,211,160,0.1)' }}
            animate={{ boxShadow: ['0 0 20px rgba(34,211,160,0.08)', '0 0 40px rgba(34,211,160,0.18)', '0 0 20px rgba(34,211,160,0.08)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Bus size={26} style={{ color: '#22D3A0' }} />
          </motion.div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: '#E8ECF2', letterSpacing: '-0.02em', margin: 0 }}>BusTrack AR</h1>
          <p style={{ color: '#4A5568', fontSize: '13px', marginTop: '4px' }}>Plataforma de seguimiento en tiempo real</p>
        </div>

        {/* Main card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(26,32,48,0.9), rgba(13,17,23,0.95))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(184,200,224,0.1)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 1px 0 rgba(184,200,224,0.08) inset',
          position: 'relative',
        }}>
          {/* Top shimmer line */}
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,200,224,0.3), transparent)' }} />

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Role selector ── */}
            {!role && (
              <motion.div
                key="role-select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ padding: '32px 28px 36px' }}
              >
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#E8ECF2', marginBottom: '6px', textAlign: 'center' }}>
                  ¿Cómo querés ingresar?
                </h2>
                <p style={{ color: '#4A5568', fontSize: '13px', textAlign: 'center', marginBottom: '28px' }}>
                  Seleccioná tu rol para continuar
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Usuario card */}
                  <motion.button
                    onClick={() => setRole('user')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '20px 20px',
                      background: 'linear-gradient(135deg, rgba(34,211,160,0.06), rgba(34,211,160,0.02))',
                      border: '1px solid rgba(34,211,160,0.2)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 250ms',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={22} style={{ color: '#22D3A0' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#E8ECF2' }}>Soy Usuario</div>
                      <div style={{ fontSize: '12px', color: '#4A5568', marginTop: '2px' }}>Ver colectivos en tiempo real</div>
                    </div>
                    <ArrowRight size={18} style={{ color: '#22D3A0', flexShrink: 0 }} />
                  </motion.button>

                  {/* Chofer card */}
                  <motion.button
                    onClick={() => setRole('driver')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '20px 20px',
                      background: 'linear-gradient(135deg, rgba(184,200,224,0.06), rgba(184,200,224,0.02))',
                      border: '1px solid rgba(184,200,224,0.15)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 250ms',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(184,200,224,0.08)', border: '1px solid rgba(184,200,224,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bus size={22} style={{ color: '#C2C8D4' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#E8ECF2' }}>Soy Chofer</div>
                      <div style={{ fontSize: '12px', color: '#4A5568', marginTop: '2px' }}>Transmitir mi ubicación GPS</div>
                    </div>
                    <ArrowRight size={18} style={{ color: '#C2C8D4', flexShrink: 0 }} />
                  </motion.button>
                </div>

                <p style={{ textAlign: 'center', fontSize: '11px', color: '#2D3444', marginTop: '24px', fontFamily: 'DM Mono' }}>
                  Admin: admin@admin.com / Admin123!
                </p>
              </motion.div>
            )}

            {/* ── STEP 2: Login / Register ── */}
            {role && (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ padding: '28px 28px 32px' }}
              >
                {/* Back + role badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <button
                    onClick={() => { setRole(null); setMode('login') }}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <ChevronLeft size={16} style={{ color: '#8A95A8' }} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: role === 'user' ? 'rgba(34,211,160,0.08)' : 'rgba(184,200,224,0.06)', border: `1px solid ${role === 'user' ? 'rgba(34,211,160,0.2)' : 'rgba(184,200,224,0.15)'}` }}>
                    {role === 'user' ? <User size={13} style={{ color: '#22D3A0' }} /> : <Bus size={13} style={{ color: '#C2C8D4' }} />}
                    <span style={{ fontSize: '12px', fontWeight: 600, color: role === 'user' ? '#22D3A0' : '#C2C8D4', fontFamily: 'DM Mono' }}>
                      {role === 'user' ? 'USUARIO' : 'CHOFER'}
                    </span>
                  </div>
                </div>

                {/* Login / Register toggle */}
                <div style={{ display: 'flex', gap: '2px', padding: '4px', background: 'rgba(6,8,16,0.6)', borderRadius: '12px', marginBottom: '24px' }}>
                  {(['login', 'register'] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '9px',
                        fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 600,
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                        border: 'none', cursor: 'pointer', transition: 'all 200ms',
                        background: mode === m ? 'rgba(184,200,224,0.1)' : 'transparent',
                        color: mode === m ? '#C2C8D4' : '#4A5568',
                        boxShadow: mode === m ? 'inset 0 1px 0 rgba(184,200,224,0.1), 0 0 0 1px rgba(184,200,224,0.08)' : 'none',
                      }}
                    >
                      {m === 'login' ? 'Ingresar' : 'Registrarse'}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Name — register only */}
                  {mode === 'register' && (
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
                      <input
                        className="input-dark" style={{ paddingLeft: '40px' }}
                        type="text" placeholder={role === 'driver' ? 'Nombre completo' : 'Tu nombre'}
                        value={form.name} onChange={set('name')} required
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
                    <input
                      className="input-dark" style={{ paddingLeft: '40px' }}
                      type="email" placeholder="Email"
                      value={form.email} onChange={set('email')} required
                    />
                  </div>

                  {/* Password */}
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
                    <input
                      className="input-dark" style={{ paddingLeft: '40px', paddingRight: '42px' }}
                      type={showPass ? 'text' : 'password'} placeholder="Contraseña"
                      value={form.password} onChange={set('password')} required
                    />
                    <button
                      type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', display: 'flex', padding: 0 }}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* User extra fields */}
                  {mode === 'register' && role === 'user' && (
                    <>
                      <div style={{ position: 'relative' }}>
                        <Calendar size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
                        <input className="input-dark" style={{ paddingLeft: '40px' }} type="number" placeholder="Edad" min={5} max={120} value={form.age} onChange={set('age')} required />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <BarChart2 size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
                        <input className="input-dark" style={{ paddingLeft: '40px' }} type="number" placeholder="Veces por semana que tomás el colectivo" min={0} value={form.weeklyTrips} onChange={set('weeklyTrips')} required />
                      </div>
                    </>
                  )}

                  {/* Driver extra fields */}
                  {mode === 'register' && role === 'driver' && (
                    <>
                      <input className="input-dark" type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} required />
                      <input className="input-dark" type="text" placeholder="Número de unidad (pintado en el colectivo)" value={form.busUnit} onChange={set('busUnit')} required />
                    </>
                  )}

                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '12px',
                        background: role === 'user'
                          ? 'linear-gradient(135deg, rgba(34,211,160,0.9), rgba(34,211,160,0.7))'
                          : 'linear-gradient(145deg, rgba(194,200,212,1) 0%, rgba(154,164,184,1) 50%, rgba(176,184,200,1) 100%)',
                        color: role === 'user' ? '#060810' : '#0A0E14',
                        fontFamily: 'Syne, sans-serif', fontWeight: 700,
                        fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: role === 'user' ? '0 4px 24px rgba(34,211,160,0.25)' : '0 4px 24px rgba(184,200,224,0.15)',
                        transition: 'all 250ms', opacity: loading ? 0.7 : 1,
                      }}
                    >
                      {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                      {!loading && <ArrowRight size={16} />}
                    </button>
                  </div>
                </form>

                {/* Google OAuth — users only */}
                {role === 'user' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,200,224,0.1), transparent)' }} />
                      <span style={{ fontSize: '11px', color: '#2D3444', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>O</span>
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,200,224,0.1), transparent)' }} />
                    </div>
                    <button
                      onClick={loginWithGoogle}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        background: 'rgba(184,200,224,0.04)', border: '1px solid rgba(184,200,224,0.1)',
                        borderRadius: '12px', padding: '13px', color: '#8A95A8',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 200ms',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 48 48">
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