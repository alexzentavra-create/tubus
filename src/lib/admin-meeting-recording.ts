// Both participants record the same two media streams locally after explicit consent.
export function recordMeeting(local: MediaStream, remote: MediaStream, localFirst: boolean, onSaved: (blob: Blob) => void, onError: (message: string) => void) {
  if (!window.MediaRecorder) throw new Error('La grabación no está disponible en este navegador.')
  const context = new AudioContext()
  const output = context.createMediaStreamDestination()
  for (const stream of [local, remote]) {
    if (stream.getAudioTracks().length) context.createMediaStreamSource(stream).connect(output)
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1280; canvas.height = 720
  const paint = canvas.getContext('2d')!
  const videos = (localFirst ? [local, remote] : [remote, local]).map(stream => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = stream; void v.play().catch(() => {}); return v
  })
  const draw = () => {
    paint.fillStyle = '#0b1220'; paint.fillRect(0, 0, 1280, 720)
    videos.forEach((v, i) => {
      const x = i * 640
      if (v.readyState >= 2 && v.videoWidth > 0) {
        const ratio = Math.min(620 / v.videoWidth, 620 / v.videoHeight)
        const w = v.videoWidth * ratio, h = v.videoHeight * ratio
        paint.drawImage(v, x + (640-w)/2, (720-h)/2, w, h)
      } else { paint.fillStyle = '#94a3b8'; paint.font = '24px sans-serif'; paint.fillText('Participante ' + (i + 1), x + 200, 360) }
    })
    paint.fillStyle = '#cbd5e1'; paint.font = '18px sans-serif'; paint.fillText('Bien Parada · Reunión de equipo', 24, 690)
  }
  draw()
  const timer = window.setInterval(draw, 100)
  const video = canvas.captureStream(10)
  const mixed = new MediaStream([...video.getVideoTracks(), ...output.stream.getAudioTracks()])
  const mime = ['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t => MediaRecorder.isTypeSupported(t))
  const release = () => { clearInterval(timer); video.getTracks().forEach(t => t.stop()); output.stream.getTracks().forEach(t => t.stop()); videos.forEach(v => { v.pause(); v.srcObject = null }); void context.close() }
  let recorder: MediaRecorder
  try { recorder = new MediaRecorder(mixed, mime ? { mimeType: mime, videoBitsPerSecond: 1200000 } : undefined) }
  catch (error) { release(); throw error }
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data) }
  recorder.onstop = () => { release(); if(chunks.length) onSaved(new Blob(chunks, { type: recorder.mimeType })); else onError('La grabación no produjo datos descargables.') }
  recorder.onerror = () => onError('La grabación se interrumpió. Conservá la descarga disponible.')
  void context.resume()
  try { recorder.start(1000) } catch (error) { release(); throw error }
  return { stop: () => { if(recorder.state !== 'inactive') recorder.stop() } }
}
