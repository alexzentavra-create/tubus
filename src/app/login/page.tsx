'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Mail, Lock, User, Calendar, BarChart2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register' | 'driver'

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email:'', password:'', name:'', age:'', weeklyTrips:'', driverNumber:'', busUnit:'' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({...f,[k]:e.target.value}))

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:`${location.origin}/auth/callback` }})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) { toast.error('Credenciales incorrectas'); setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('email', form.email).single()
      window.location.href = p?.role === 'driver' ? '/driver' : p?.role === 'admin' ? '/admin' : '/'
    } else {
      const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options:{ data:{ name: form.name, role: mode === 'driver' ? 'driver' : 'user' }}})
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user && mode === 'register') await supabase.from('user_profiles').insert({ id: data.user.id, age: parseInt(form.age), weekly_trips: parseInt(form.weeklyTrips) })
      if (data.user && mode === 'driver') await supabase.from('driver_profiles').insert({ id: data.user.id, driver_number: form.driverNumber, bus_unit: form.busUnit })
      toast.success('Cuenta creada — revisá tu email')
      setMode('login')
    }
    setLoading(false)
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'login', label: 'Ingresar' },
    { id: 'register', label: 'Registro' },
    { id: 'driver', label: 'Soy Chofer' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{background:'var(--void)'}}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{position:'absolute',top:'-20%',left:'50%',transform:'translateX(-50%)',width:'600px',height:'400px',background:'radial-gradient(ellipse, rgba(184,200,224,0.04) 0%, transparent 70%)',borderRadius:'50%'}} />
        <div style={{position:'absolute',bottom:'-10%',left:'20%',width:'300px',height:'300px',background:'radial-gradient(circle, rgba(34,211,160,0.03) 0%, transparent 70%)',borderRadius:'50%'}} />
      </div>

      <motion.div className="w-full max-w-sm relative z-10" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}>

        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center relative"
            style={{background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.15)',boxShadow:'0 8px 32px rgba(0,0,0,0.8), 0 0 40px rgba(184,200,224,0.06)'}}
            animate={{boxShadow:['0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(184,200,224,0.04)','0 8px 32px rgba(0,0,0,0.8), 0 0 40px rgba(184,200,224,0.1)','0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(184,200,224,0.04)']}}
            transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}
          >
            <Bus size={32} style={{color:'var(--platinum)'}} />
            <div style={{position:'absolute',top:0,left:'15%',right:'15%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(184,200,224,0.5),transparent)'}} />
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{color:'var(--text-primary)'}}>BusTrack AR</h1>
          <p className="mt-2 text-sm" style={{color:'var(--text-muted)'}}>Plataforma premium de seguimiento</p>
        </div>

        {/* Card */}
        <div className="glass-dark" style={{padding:'6px 6px 24px',borderRadius:'var(--r-xl)'}}>

          {/* Tabs */}
          <div style={{display:'flex',gap:'2px',padding:'6px',background:'rgba(6,8,16,0.6)',borderRadius:'16px',marginBottom:'24px'}}>
            {tabs.map(t => (
              <button key={t.id} onClick={()=>setMode(t.id)} style={{flex:1,padding:'10px 8px',borderRadius:'12px',fontSize:'12px',fontFamily:'Syne,sans-serif',fontWeight:600,letterSpacing:'0.03em',textTransform:'uppercase',border:'none',cursor:'pointer',transition:'all 200ms',background: mode===t.id ? 'linear-gradient(145deg,rgba(194,200,212,0.15),rgba(154,164,184,0.1))' : 'transparent',color: mode===t.id ? 'var(--platinum)' : 'var(--text-muted)',boxShadow: mode===t.id ? 'inset 0 1px 0 rgba(184,200,224,0.1), 0 0 0 1px rgba(184,200,224,0.1)' : 'none'}}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{padding:'0 18px'}}>
            <AnimatePresence mode="wait">
              <motion.form key={mode} onSubmit={handleSubmit} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.15}} style={{display:'flex',flexDirection:'column',gap:'12px'}}>

                {mode !== 'login' && (
                  <div style={{position:'relative'}}>
                    <User size={15} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
                    <input className="input-dark" style={{paddingLeft:'42px'}} type="text" placeholder={mode==='driver'?'Nombre completo':'Tu nombre'} value={form.name} onChange={set('name')} required />
                  </div>
                )}

                <div style={{position:'relative'}}>
                  <Mail size={15} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
                  <input className="input-dark" style={{paddingLeft:'42px'}} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
                </div>

                <div style={{position:'relative'}}>
                  <Lock size={15} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
                  <input className="input-dark" style={{paddingLeft:'42px',paddingRight:'42px'}} type={showPass?'text':'password'} placeholder="Contraseña" value={form.password} onChange={set('password')} required />
                  <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'0',display:'flex'}}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>

                {mode === 'register' && (<>
                  <div style={{position:'relative'}}>
                    <Calendar size={15} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
                    <input className="input-dark" style={{paddingLeft:'42px'}} type="number" placeholder="Edad" min={5} max={120} value={form.age} onChange={set('age')} required />
                  </div>
                  <div style={{position:'relative'}}>
                    <BarChart2 size={15} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
                    <input className="input-dark" style={{paddingLeft:'42px'}} type="number" placeholder="Veces por semana que tomás el colectivo" min={0} value={form.weeklyTrips} onChange={set('weeklyTrips')} required />
                  </div>
                </>)}

                {mode === 'driver' && (<>
                  <input className="input-dark" type="text" placeholder="Número de legajo" value={form.driverNumber} onChange={set('driverNumber')} required />
                  <input className="input-dark" type="text" placeholder="Número de unidad (pintado en el colectivo)" value={form.busUnit} onChange={set('busUnit')} required />
                </>)}

                <div style={{marginTop:'4px'}}>
                  <button className="btn-platinum" type="submit" disabled={loading}>
                    {loading ? 'Cargando...' : mode==='login' ? 'Ingresar' : mode==='register' ? 'Crear cuenta' : 'Registrarme como chofer'}
                  </button>
                </div>
              </motion.form>
            </AnimatePresence>

            {mode !== 'driver' && (<>
              <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'20px 0'}}>
                <div className="divider-platinum" style={{flex:1}} />
                <span style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'DM Mono',letterSpacing:'0.06em'}}>O</span>
                <div className="divider-platinum" style={{flex:1}} />
              </div>
              <button onClick={loginWithGoogle} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',background:'rgba(184,200,224,0.04)',border:'1px solid rgba(184,200,224,0.1)',borderRadius:'var(--r-md)',padding:'13px 20px',color:'var(--text-secondary)',fontSize:'14px',fontWeight:500,cursor:'pointer',transition:'all 200ms',fontFamily:'DM Sans'}}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Continuar con Google
              </button>
            </>)}

            <p style={{textAlign:'center',fontSize:'11px',color:'var(--text-muted)',marginTop:'20px',fontFamily:'DM Mono'}}>
              Admin: admin@admin.com / Admin
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}