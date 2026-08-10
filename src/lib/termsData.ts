export const DEFAULT_GENERAL_TERMS = `# Términos y Condiciones Generales de la Aplicación BienParada

**Última actualización:** 23 de Julio, 2026 | **Versión:** 2.4

Bienvenido a **BienParada**. Al acceder y utilizar nuestra plataforma de movilidad y seguimiento de transporte público en tiempo real, aceptas cumplir con los siguientes términos y condiciones de servicio.

---

### 1. Naturaleza del Servicio
BienParada proporciona información de transporte público, ubicaciones de colectivos en tiempo real mediante GPS de flota y cálculo de proximidad, mapas de recorridos, paradas cercanas y facilidades para pasajeros y empresas operadoras en la República Argentina y la región.

---

### 2. Uso Aceptable y Registro de Cuenta
- Los usuarios deben proporcionar datos de registro veraces (nombre, email y contraseña encriptada).
- Se prohíbe el uso automatizado, extracción masiva no autorizada (scraping) o interferencia con el servicio de geolocalización.
- BienParada se reserva el derecho de suspender o revocar cuentas en caso de uso inadecuado o sospecha de fraude.

---

### 3. Precisión de la Información GPS
Los tiempos de arribo, demoras y frecuencias mostrados en tiempo real son estimaciones calculadas mediante el monitoreo de unidades activas, tráfico urbano e informes de la comunidad. BienParada no garantiza la exactitud milimétrica de los tiempos debido a imponderables de tránsito o cortes de arterias viales.

---

### 4. Privacidad y Protección de Datos
Los datos personales registrados se procesan bajo normas de cifrado y privacidad. No vendemos ni cedemos datos personales de los usuarios a terceros.

---

### 5. Modificaciones de los Términos
El equipo de Administración de BienParada se reserva la facultad de actualizar estos términos. Las modificaciones surtirán efecto inmediatamente después de su publicación.
`

export const DEFAULT_ADS_TERMS = `# Términos y Reglas de Publicación de Anuncios y Contenido Comercial en BienParada

**Última actualización:** 23 de Julio, 2026 | **Versión:** 2.1

Al enviar una campaña publicitaria, cupón de descuento o anuncio patrocinado en BienParada, el anunciante acepta los siguientes términos de publicación y políticas comerciales:

---

### 1. Proceso de Revisión y Aprobación
Todas las campañas enviadas a la plataforma BienParada quedan sujetas a revisión previa por parte del equipo de Super Administración. BienParada se reserva el derecho de aprobar, solicitar modificaciones o rechazar cualquier anuncio que incumpla las políticas del servicio.

---

### 2. Contenido Prohibido
No se admitirán anuncios que contengan o promuevan:
- Mensajes ofensivos, discriminatorios o de odio.
- Productos o actividades ilegales.
- Información engañosa o promociones falsas de descuentos.
- Material explícito o sin derechos de autor verificados.

---

### 3. Presupuesto, Cobros y Vigencia
- El costo de la pauta publicitaria se calcula según el plan seleccionado (Plaza Estándar, Parada Premium o Metrobús).
- Los días de exhibición comienzan a contabilizarse una vez que el anuncio ha sido **Aprobado** y activado por la administración.
- Los pagos procesados no son reembolsables salvo cancelación directa por causa imputable a la plataforma.

---

### 4. Ubicación y Visibilidad en la App
Los anuncios aprobados se mostrarán a los pasajeros en los canales seleccionados (Tarjetas de Noticias, Búsqueda de Recorridos, Banner de Paradas) según la segmentación de la campaña.
`

export interface TermsHistoryEntry {
  id: string
  version: string
  content: string
  savedAt: string
  category: 'general' | 'ads'
}

export function getStoredGeneralTerms(): string {
  if (typeof window === 'undefined') return DEFAULT_GENERAL_TERMS
  return localStorage.getItem('tu_bus_terms_general') || DEFAULT_GENERAL_TERMS
}

export function getStoredAdsTerms(): string {
  if (typeof window === 'undefined') return DEFAULT_ADS_TERMS
  return localStorage.getItem('tu_bus_terms_ads') || DEFAULT_ADS_TERMS
}

export function getStoredGeneralVersion(): string {
  if (typeof window === 'undefined') return 'v2.4'
  return localStorage.getItem('tu_bus_terms_general_version') || 'v2.4'
}

export function getStoredAdsVersion(): string {
  if (typeof window === 'undefined') return 'v2.1'
  return localStorage.getItem('tu_bus_terms_ads_version') || 'v2.1'
}

export function getStoredTermsHistory(category: 'general' | 'ads'): TermsHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const key = category === 'general' ? 'bu_terms_history_general' : 'bu_terms_history_ads'
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

export function saveStoredGeneralTerms(text: string, version?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('tu_bus_terms_general', text)
  const v = version || 'v2.4'
  localStorage.setItem('tu_bus_terms_general_version', v)

  // Append entry to history
  const history = getStoredTermsHistory('general')
  const newEntry: TermsHistoryEntry = {
    id: `ver-gen-${Date.now()}`,
    version: v,
    content: text,
    savedAt: new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category: 'general'
  }
  // Keep unique version entries or prepend
  const updatedHistory = [newEntry, ...history.filter(h => h.version !== v || h.content !== text)]
  localStorage.setItem('bu_terms_history_general', JSON.stringify(updatedHistory))

  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new Event('general_terms_updated'))
}

export function saveStoredAdsTerms(text: string, version?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('tu_bus_terms_ads', text)
  const v = version || 'v2.1'
  localStorage.setItem('tu_bus_terms_ads_version', v)

  // Append entry to history
  const history = getStoredTermsHistory('ads')
  const newEntry: TermsHistoryEntry = {
    id: `ver-ads-${Date.now()}`,
    version: v,
    content: text,
    savedAt: new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category: 'ads'
  }
  const updatedHistory = [newEntry, ...history.filter(h => h.version !== v || h.content !== text)]
  localStorage.setItem('bu_terms_history_ads', JSON.stringify(updatedHistory))

  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new Event('ads_terms_updated'))
}

export function deleteTermsHistoryEntry(id: string, category: 'general' | 'ads'): TermsHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const key = category === 'general' ? 'bu_terms_history_general' : 'bu_terms_history_ads'
  const history = getStoredTermsHistory(category)
  const filtered = history.filter(h => h.id !== id)
  localStorage.setItem(key, JSON.stringify(filtered))
  return filtered
}
