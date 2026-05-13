'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Mail, Lock, User, Calendar, BarChart2, Eye, EyeOff, Chrome } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register' | 'driver-register'

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    weeklyTrips: '',
    // driver fields
    driverNumber: '',
    busUnit: '',
    lineId: '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) toast.error(error.message)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Admin shortcut
    if (form.email === 'admin@admin.com' && form.password === 'Admin') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (!error) { window.location.href = '/admin'; return }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    setLoading(false)
    if (error) { toast.error('Email o contraseña incorrectos'); return }

    // Redirect based on role
    const { data: profile } = await supabase.from('profiles').select('role').eq('email', form.email).single()
    if (profile?.role === 'driver') window.location.href = '/driver'
    else if (profile?.role === 'admin') window.location.href = '/admin'
    else window.location.href = '/'
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: mode === 'driver-register' ? 'driver' : 'user',
        },
      },
    })

    if (error) { toast.error(error.message); setLoading(false); return }

    if (data.user) {
      if (mode === 'register') {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          age: parseInt(form.age),
          weekly_trips: parseInt(form.weeklyTrips),
        })
      } else {
        await supabase.from('driver_profiles').insert({
          id: data.user.id,
          driver_number: form.driverNumber,
          bus_unit: form.busUnit,
          line_id: form.lineId || null,
        })
      }
    }

    setLoading(false)
    toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
    setMode('login')
  }

  return (
    <div className="min-h-screen bg-night-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-bus-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-sm relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-bus-500/20 border border-bus-500/30 flex items-center justify-center mx-auto mb-4">
            <Bus size={32} className="text-bus-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">BusTrack AR</h1>
          <p className="text-night-400 text-sm mt-1">Seguí tu colectivo en tiempo real</p>
        </div>

        <div className="glass-panel p-6">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-night-900 rounded-lg mb-6">
            {(['login', 'register', 'driver-register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-bus-500 text-white' : 'text-night-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Entrar' : m === 'register' ? 'Registrarse' : 'Soy chofer'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              className="space-y-3"
            >
              {/* Name — register only */}
              {mode !== 'login' && (
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
                  <input
                    type="text" required className="bus-input pl-10"
                    placeholder={mode === 'driver-register' ? 'Nombre completo' : 'Tu nombre'}
                    value={form.name} onChange={set('name')}
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
                <input
                  type="email" required className="bus-input pl-10"
                  placeholder="Email"
                  value={form.email} onChange={set('email')}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
                <input
                  type={showPass ? 'text' : 'password'} required className="bus-input pl-10 pr-10"
                  placeholder="Contraseña"
                  value={form.password} onChange={set('password')}
                />
                <button
                  type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-night-400 hover:text-white"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* User-specific fields */}
              {mode === 'register' && (
                <>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
                    <input
                      type="number" required className="bus-input pl-10"
                      placeholder="Edad" min={5} max={120}
                      value={form.age} onChange={set('age')}
                    />
                  </div>
                  <div className="relative">
                    <BarChart2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
                    <input
                      type="number" required className="bus-input pl-10"
                      placeholder="¿Cuántas veces por semana tomás el colectivo?"
                      min={0} max={100}
                      value={form.weeklyTrips} onChange={set('weeklyTrips')}
                    />
                  </div>
                </>
              )}

              {/* Driver-specific fields */}
              {mode === 'driver-register' && (
                <>
                  <input
                    type="text" required className="bus-input"
                    placeholder="Número de legajo / identificación"
                    value={form.driverNumber} onChange={set('driverNumber')}
                  />
                  <input
                    type="text" required className="bus-input"
                    placeholder="Número de unidad (pintado en el colectivo)"
                    value={form.busUnit} onChange={set('busUnit')}
                  />
                </>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Cargando...' :
                 mode === 'login' ? 'Ingresar' :
                 mode === 'register' ? 'Crear cuenta' : 'Registrarme como chofer'}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Google OAuth */}
          {mode !== 'driver-register' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-night-700" />
                <span className="text-night-500 text-xs">o continuá con</span>
                <div className="flex-1 h-px bg-night-700" />
              </div>
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg py-3 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google
              </button>
            </>
          )}
        </div>

        <p className="text-center text-night-600 text-xs mt-4">
          ¿Sos administrador?{' '}
          <button onClick={() => setMode('login')} className="text-bus-400 hover:underline">
            Ingresá con admin@admin.com
          </button>
        </p>
      </motion.div>
    </div>
  )
}