'use client'

import React, { useState, useEffect } from 'react'
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff, Mail, CheckCircle2, RefreshCw, KeyRound, Sparkles } from 'lucide-react'

export default function AccessPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleRequestCode = async () => {
    if (cooldown > 0 || isRequestingCode) return

    setIsRequestingCode(true)
    setError('')
    setRequestMessage('')

    try {
      const res = await fetch('/api/access/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setRequestMessage('¡Código enviado con éxito! Pedile a Alejandro el código que acaba de recibir en su correo y escribilo abajo.')
        setCooldown(30) // 30 seconds cooldown to protect against spam
      } else {
        setError(data.error || 'No se pudo despachar el código. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión al solicitar el código. Verificá tu red.')
    } finally {
      setIsRequestingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        window.location.href = '/'
      } else {
        setError(data.error || 'Código incorrecto. Intenta nuevamente.')
      }
    } catch {
      setError('Error al comunicarse con el servidor. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BienParada</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Acceso Privado
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Plataforma reservada para desarrollo y administración. Generá o ingresá tu código para entrar.
          </p>
        </div>

        {/* On-Demand Code Generation Card (Send Code Button) */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 mb-6 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>¿No tenés el código actual?</span>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Presioná el botón para generar un nuevo código de acceso y enviarlo al instante al correo de la administración (Alejandro).
          </p>

          <button
            type="button"
            onClick={handleRequestCode}
            disabled={isRequestingCode || cooldown > 0}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              cooldown > 0
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
            }`}
          >
            {isRequestingCode ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generando y enviando código...</span>
              </>
            ) : cooldown > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Código enviado. Podrás solicitar otro en {cooldown}s</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Enviar Código a la Administración</span>
              </>
            )}
          </button>

          {requestMessage && (
            <div className="mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-start gap-2 leading-relaxed animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{requestMessage}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="relative flex items-center justify-center my-5">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            Ingreso con Código
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Access Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Código de Acceso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pegá o escribí el código aquí..."
                className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm font-mono tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                title={showPassword ? 'Ocultar código' : 'Ver código'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {isLoading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <span>Entrar a BienParada</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>La contraseña maestra de respaldo siempre permanece válida.</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px] mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Protección activa contra bots y accesos no autorizados</span>
          </div>
        </div>
      </div>
    </div>
  )
}
