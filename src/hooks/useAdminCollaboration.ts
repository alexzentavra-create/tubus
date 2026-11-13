'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { collaborationRequest, CollaborationState } from '@/lib/admin-collaboration'

export function useAdminCollaboration() {
  const [data, setData] = useState<CollaborationState | null>(null)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(false)
  const session = useRef('')
  const heartbeatAt = useRef(0)
  const generation = useRef(0)
  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      if (Date.now() - heartbeatAt.current > 20000) {
        await collaborationRequest({ action: 'heartbeat', sessionId: session.current })
        heartbeatAt.current = Date.now()
      }
      const next = await collaborationRequest<CollaborationState>()
      if (mounted.current) { setData(next); setError('') }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Sin conexión.')
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
