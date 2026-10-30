'use client'

import React, { useState, useEffect } from 'react'
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff, Mail, CheckCircle2, RefreshCw, KeyRound, Sparkles, AlertTriangle, Clock } from 'lucide-react'
import { formatRemainingTime } from '@/lib/rateLimitLockout'

export default function AccessPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Exponential Lockout states
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [lockoutMinutes, setLockoutMinutes] = useState(10)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)

  // Query initial lockout state from backend on mount
  useEffect(() => {
    fetch('/api/verify-access')
      .then((res) => res.json())
      .then((data) => {
        if (data.isLocked && data.remainingSeconds > 0) {
          setIsLocked(true)
          setLockoutSeconds(data.remainingSeconds)
          setLockoutMinutes(data.lockoutMinutes || Math.ceil(data.remainingSeconds / 60))
        } else if (typeof data.remainingAttempts === 'number') {
          setRemainingAttempts(data.remainingAttempts)
        }
      })
      .catch(() => {})
  }, [])

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked || lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false)
          setError('')
          setRemainingAttempts(3)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isLocked, lockoutSeconds])

  // Countdown timer for send code button cooldown
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
        const dest = data.targetEmail || 'alex.finochietti@gmail.com'
        setRequestMessage(data.message || `¡Código enviado con éxito a ${dest}! Revisá tu correo (o carpeta Spam) e ingresalo abajo.`)
        setCooldown(30) // 30 seconds cooldown
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
    if (!password.trim() || isLocked) return

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
        if (data.isLocked) {
          setIsLocked(true)
          setLockoutSeconds(data.remainingSeconds || 600)
          setLockoutMinutes(data.lockoutMinutes || 10)
          setRemainingAttempts(0)
        } else if (typeof data.remainingAttempts === 'number') {
          setRemainingAttempts(data.remainingAttempts)
        }
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

        {/* Lockout Banner with Live Countdown Timer */}
        {isLocked && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-center shadow-lg animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 animate-spin text-rose-400" />
              <span>Acceso Bloqueado por Seguridad</span>
            </div>
            <p className="text-slate-300 text-xs mt-1">
              Has alcanzado el límite de 3 intentos incorrectos. Debés esperar para intentar nuevamente:
            </p>
            <div className="text-3xl font-black text-rose-400 font-mono tracking-widest my-2 drop-shadow">
              {formatRemainingTime(lockoutSeconds)}
            </div>
            <p className="text-[11px] text-rose-300/80">
              Penalización: <strong>{lockoutMinutes} min</strong> (se duplicará a {lockoutMinutes * 2} min si vuelve a ser incorrecto).
            </p>
          </div>
        )}

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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                Código de Acceso
              </label>
              {!isLocked && remainingAttempts !== null && remainingAttempts < 3 && (
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {remainingAttempts} intento{remainingAttempts === 1 ? '' : 's'} restante{remainingAttempts === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus={!isLocked}
                disabled={isLocked || isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLocked ? 'Acceso bloqueado temporalmente' : 'Pegá o escribí el código aquí...'}
                className={`w-full pl-4 pr-12 py-3 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition text-sm font-mono tracking-wide ${
                  isLocked
                    ? 'border-rose-900/50 bg-slate-950/50 text-slate-500 cursor-not-allowed'
                    : 'border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={showPassword ? 'Ocultar código' : 'Ver código'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && !isLocked && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isLocked || !password.trim()}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Verificando...</span>
            ) : isLocked ? (
              <span>Bloqueado ({formatRemainingTime(lockoutSeconds)})</span>
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
            <span>Protección activa con bloqueo exponencial (3 intentos)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
