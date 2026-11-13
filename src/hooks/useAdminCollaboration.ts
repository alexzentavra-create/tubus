'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { collaborationRequest, CollaborationState } from '@/lib/admin-collaboration'
import { createClient } from '@/lib/supabase'

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
          const { data: repaired } = await supabase.current.auth.refreshSession()
          if (repaired.session) {
            heartbeatAt.current = 0
            await load()
            return
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
