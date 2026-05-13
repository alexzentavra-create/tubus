'use client'

import { useEffect } from 'react'

/**
 * Registers the Service Worker for PWA + background GPS sync.
 * Call this once in the root layout or a top-level component.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available — refresh to update')
              }
            })
          }
        })

        console.log('[SW] Registered successfully:', registration.scope)
      } catch (err) {
        console.error('[SW] Registration failed:', err)
      }
    }

    // Register after page load to not block LCP
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])
}

/**
 * Queues a driver location update in IndexedDB + triggers background sync.
 * Falls back to direct POST if Background Sync API is unavailable.
 */
export async function queueLocationUpdate(data: Record<string, unknown>) {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready

  // Try Background Sync API first
  if ('sync' in registration) {
    // Save to IndexedDB for SW to pick up
    await saveToQueue(data)
    await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('driver-location-sync')
  } else {
    // Fallback: direct POST
    await fetch('/api/drivers/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
  }
}

async function saveToQueue(data: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('bustrack-queue', 1)
    req.onupgradeneeded = e => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('locations', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => {
      const db = (e.target as IDBOpenDBRequest).result
      const tx = db.transaction('locations', 'readwrite')
      tx.objectStore('locations').add({ data, timestamp: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = reject
    }
    req.onerror = reject
  })
}