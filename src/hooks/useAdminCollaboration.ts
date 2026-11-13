'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { collaborationRequest, CollaborationState } from '@/lib/admin-collaboration'
import { createClient } from '@/lib/supabase'
import { getValidActiveUser } from '@/lib/sync'

export function useAdminCollaboration() {
  const [data, setData] = useState<CollaborationState | null>(null)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(false)
  const session = useRef('')
  const heartbeatAt = useRef(0)
  const generation = useRef(0)
  const authRepairAt = useRef(0)
  const supabase = useRef<ReturnType<typeof createClient> | null>(null)
  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const load = async () => {
      if (Date.now() - heartbeatAt.current > 20000) {
        await collaborationRequest({ action: 'heartbeat', sessionId: session.current })
        heartbeatAt.current = Date.now()
      }
      const next = await collaborationRequest<CollaborationState>()
      if (mounted.current) { setData(next); setError('') }
    }
    try {
      await load()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sin conexión.'
      const authFailure = message.toLowerCase().includes('iniciá sesión') || message.toLowerCase().includes('sesión de colaboración')
      if (authFailure && Date.now() - authRepairAt.current > 60000) {
        authRepairAt.current = Date.now()
        try {
          if (!supabase.current) supabase.current = createClient()
          let refreshed = false
          try {
            const { data: repaired } = await supabase.current.auth.refreshSession()
            refreshed = !!repaired.session
          } catch { /* Legacy sessions may not have a refresh token yet. */ }
          if (refreshed) {
            heartbeatAt.current = 0
            await load()
            return
          }
          // One-time bridge for sessions created by the older local Super Admin login.
          // The password is only used if it is already present in that browser's
          // existing account registry, and is removed from active-session storage
          // immediately after Supabase verifies it.
          const active = getValidActiveUser()
          if (active && (active.role === 'superadmin' || active.role === 'Super Admin Principal')) {
            const email = String(active.email || '').trim().toLowerCase()
            const storedAdmin = JSON.parse(localStorage.getItem('active_super_admin') || 'null')
            const registry = JSON.parse(localStorage.getItem('bu_super_admins') || '[]')
            const registered = Array.isArray(registry)
              ? registry.find((admin: any) => String(admin?.email || '').trim().toLowerCase() === email)
              : null
            const candidates = [...new Set([active.password, storedAdmin?.password, registered?.password]
              .filter((password): password is string => typeof password === 'string' && password.length > 0 && !/[•*]/.test(password)))]
            const authEmail = email === 'alejandro.finochietti@yahoo.com.ar' ? 'admin@admin.com' : email
            for (const password of candidates) {
              const { data: signedIn } = await supabase.current.auth.signInWithPassword({ email: authEmail, password })
              if (!signedIn.session) continue
              for (const key of ['active_user', 'active_super_admin']) {
                try {
                  const stored = JSON.parse(localStorage.getItem(key) || 'null')
                  if (stored && typeof stored === 'object') {
                    delete stored.password
                    localStorage.setItem(key, JSON.stringify(stored))
                  }
                } catch { /* Ignore malformed legacy storage. */ }
              }
              heartbeatAt.current = 0
              await load()
              return
            }
          }
        } catch { /* The reconnect control handles a missing refresh session. */ }
      }
      if (mounted.current) setError(message)
    } finally { busy.current = false }
  }, [])
  const leave = useCallback(async () => {
    if (session.current) await collaborationRequest({ action: 'leave', sessionId: session.current })
  }, [])
  useEffect(() => {
    const currentGeneration = ++generation.current
    mounted.current = true
    if (!session.current) session.current = crypto.randomUUID()
    void refresh()
    const timer = setInterval(() => void refresh(), 3000)
    const resume = () => { heartbeatAt.current = 0; void refresh() }
    const unload = () => {
      navigator.sendBeacon('/api/admin/collaboration', new Blob([JSON.stringify({ action: 'leave', sessionId: session.current })], { type: 'application/json' }))
    }
    window.addEventListener('online', resume)
    window.addEventListener('pagehide', unload)
    document.addEventListener('visibilitychange', resume)
    return () => {
      mounted.current = false
      clearInterval(timer)
      window.removeEventListener('online', resume)
      window.removeEventListener('pagehide', unload)
      document.removeEventListener('visibilitychange', resume)
      setTimeout(() => { if (generation.current === currentGeneration) unload() }, 0)
    }
  }, [refresh])
  return { data, error, refresh, leave }
}
