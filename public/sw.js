// Bien Parada — Service Worker
// Handles background GPS broadcasting even when the app is minimized.
// This file is served from /public/sw.js

const CACHE_NAME = 'bustrack-v1'
const STATIC_ASSETS = ['/', '/login', '/driver', '/manifest.json']

// ─── Install & cache static assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ─── Activate & clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ─── Fetch: network-first for API, cache-first for static ──────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Don't intercept Supabase or Mapbox requests
  if (url.hostname.includes('supabase') || url.hostname.includes('mapbox')) return

  // Network-first for API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})

// ─── Background GPS sync ────────────────────────────────────────────────────
// Triggered by the app via Background Sync API
self.addEventListener('sync', (event) => {
  if (event.tag === 'driver-location-sync') {
    event.waitUntil(sendQueuedLocations())
  }
})

async function sendQueuedLocations() {
  // Retrieve queued positions from IndexedDB and POST them
  // This ensures location updates reach the server even if the network
  // was briefly unavailable
  const db = await openDB()
  const locations = await getAllPending(db)

  for (const loc of locations) {
    try {
      const res = await fetch('/api/drivers/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loc.data),
        credentials: 'include',
      })
      if (res.ok) await deleteRecord(db, loc.id)
    } catch (e) {
      // Will retry on next sync
      console.warn('[SW] Failed to send location, will retry:', e)
    }
  }
}

// Minimal IndexedDB helpers for location queue
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bustrack-queue', 1)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('locations', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = reject
  })
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('locations', 'readonly')
    const req = tx.objectStore('locations').getAll()
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = reject
  })
}

function deleteRecord(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('locations', 'readwrite')
    const req = tx.objectStore('locations').delete(id)
    req.onsuccess = resolve
    req.onerror = reject
  })
}

// ─── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, icon, url } = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title || 'Bien Parada', {
      body,
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(w => w.url.includes(url))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})