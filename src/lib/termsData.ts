export const DEFAULT_GENERAL_TERMS = `# Términos y Condiciones Generales de la Aplicación TuBus

**Última actualización:** 23 de Julio, 2026 | **Versión:** 2.4

Bienvenido a **TuBus**. Al acceder y utilizar nuestra plataforma de movilidad y seguimiento de transporte público en tiempo real, aceptas cumplir con los siguientes términos y condiciones de servicio.

---

### 1. Naturaleza del Servicio
TuBus proporciona información de transporte público, ubicaciones de colectivos en tiempo real mediante GPS de flota y cálculo de proximidad, mapas de recorridos, paradas cercanas y facilidades para pasajeros y empresas operadoras en la República Argentina y la región.

---

### 2. Uso Aceptable y Registro de Cuenta
- Los usuarios deben proporcionar datos de registro veraces (nombre, email y contraseña encriptada).
- Se prohíbe el uso automatizado, extracción masiva no autorizada (scraping) o interferencia con el servicio de geolocalización.
- TuBus se reserva el derecho de suspender o revocar cuentas en caso de uso inadecuado o sospecha de fraude.

---

### 3. Precisión de la Información GPS
Los tiempos de arribo, demoras y frecuencias mostrados en tiempo real son estimaciones calculadas mediante el monitoreo de unidades activas, tráfico urbano e informes de la comunidad. TuBus no garantiza la exactitud milimétrica de los tiempos debido a imponderables de tránsito o cortes de arterias viales.

---

### 4. Privacidad y Protección de Datos
Los datos personales registrados se procesan bajo normas de cifrado y privacidad. No vendemos ni cedemos datos personales de los usuarios a terceros.

---

### 5. Modificaciones de los Términos
El equipo de Administración de TuBus se reserva la facultad de actualizar estos términos. Las modificaciones surtirán efecto inmediatamente después de su publicación.
`

export const DEFAULT_ADS_TERMS = `# Términos y Reglas de Publicación de Anuncios y Contenido Comercial en TuBus

**Última actualización:** 23 de Julio, 2026 | **Versión:** 2.1

Al enviar una campaña publicitaria, cupón de descuento o anuncio patrocinado en TuBus, el anunciante acepta los siguientes términos de publicación y políticas comerciales:

---

### 1. Proceso de Revisión y Aprobación
Todas las campañas enviadas a la plataforma TuBus quedan sujetas a revisión previa por parte del equipo de Super Administración. TuBus se reserva el derecho de aprobar, solicitar modificaciones o rechazar cualquier anuncio que incumpla las políticas del servicio.

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

export function getStoredGeneralTerms(): string {
  if (typeof window === 'undefined') return DEFAULT_GENERAL_TERMS
  return localStorage.getItem('tu_bus_terms_general') || DEFAULT_GENERAL_TERMS
}

export function getStoredAdsTerms(): string {
  if (typeof window === 'undefined') return DEFAULT_ADS_TERMS
  return localStorage.getItem('tu_bus_terms_ads') || DEFAULT_ADS_TERMS
}

export function saveStoredGeneralTerms(text: string, version?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('tu_bus_terms_general', text)
  if (version) localStorage.setItem('tu_bus_terms_general_version', version)
  window.dispatchEvent(new Event('storage'))
}

export function saveStoredAdsTerms(text: string, version?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('tu_bus_terms_ads', text)
  if (version) localStorage.setItem('tu_bus_terms_ads_version', version)
  window.dispatchEvent(new Event('storage'))
}
