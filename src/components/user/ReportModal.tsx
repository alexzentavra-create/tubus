'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, ReportType } from '@/types'
import toast from 'react-hot-toast'

const TYPES: {value:ReportType;label:string;emoji:string}[] = [
  {value:'no_paro',label:'No paró en la parada',emoji:'🚌'},
  {value:'conduccion_peligrosa',label:'Conducción peligrosa',emoji:'⚠️'},
  {value:'mal_trato',label:'Mal trato',emoji:'😤'},
  {value:'vehiculo_defectuoso',label:'Vehículo defectuoso',emoji:'🔧'},
  {value:'no_llego',label:'No llegó',emoji:'❓'},
  {value:'otro',label:'Otro',emoji:'📋'},
]

export default function ReportModal({ bus, onClose, darkMap }: { bus: BusPosition; onClose: () => void; darkMap: boolean }) {
  const supabase = createClient()
  const [type, setType] = useState<ReportType|null>(null)
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!type) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Tenés que estar logueado'); setLoading(false); return }
    const { error } = await supabase.from('reports').insert({ reporter_id:user.id, driver_id:bus.driver_id, line_id:bus.line_id, bus_unit:bus.bus_unit, type, description:desc||TYPES.find(r=>r.value===type)!.label })
    setLoading(false)
    if (error) { toast.error('No se pudo enviar'); return }
    setDone(true)
  }

  return (
    <motion.div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center'}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)'}} onClick={onClose} />
      <motion.div className="glass-dark" style={{position:'relative',width:'100%',maxWidth:'420px',margin:'0 16px 16px',borderRadius:'var(--r-xl)',overflow:'hidden'}} initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}} transition={{type:'spring',damping:28}}>
        {done ? (
          <div style={{padding:'40px 24px',textAlign:'center'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'rgba(34,211,160,0.1)',border:'1px solid rgba(34,211,160,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <CheckCircle size={28} style={{color:'var(--go)'}} />
            </div>
            <h3 className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'20px',marginBottom:'8px'}}>Denuncia enviada</h3>
            <p style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'24px'}}>El equipo de administración va a revisar tu reporte.</p>
            <button className="btn-platinum" onClick={onClose}>Cerrar</button>
          </div>
        ) : (<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',borderBottom:'1px solid rgba(184,200,224,0.07)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,77,106,0.1)',border:'1px solid rgba(255,77,106,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <AlertTriangle size={16} style={{color:'#FF4D6A'}} />
              </div>
              <div>
                <div className="font-display" style={{color:'var(--text-primary)',fontWeight:600,fontSize:'15px'}}>Denunciar</div>
                <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>Unidad {bus.bus_unit}</div>
              </div>
            </div>
            <button onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',background:darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)',border:darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <X size={14} style={{color:'var(--text-secondary)'}} />
            </button>
          </div>
          <div style={{padding:'16px 20px 20px',display:'flex',flexDirection:'column',gap:'14px'}}>
            <div>
              <div style={{fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.1em',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'10px'}}>Tipo de problema</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                {TYPES.map(rt => (
                  <button key={rt.value} onClick={()=>setType(rt.value)} style={{padding:'12px',borderRadius:'var(--r-sm)',border:`1px solid ${type===rt.value ? (darkMap ? 'rgba(184,200,224,0.25)' : 'rgba(59,130,246,0.3)') : (darkMap ? 'rgba(184,200,224,0.07)' : 'rgba(0,0,0,0.08)')}`,background: type===rt.value ? (darkMap ? 'rgba(184,200,224,0.08)' : 'rgba(59,130,246,0.05)') : (darkMap ? 'rgba(6,8,16,0.5)' : 'rgba(255,255,255,0.85)'),textAlign:'left',cursor:'pointer',transition:'all 200ms'}}>
                    <div style={{fontSize:'18px',marginBottom:'4px'}}>{rt.emoji}</div>
                    <div style={{color: type===rt.value ? 'var(--platinum)' : 'var(--text-secondary)',fontSize:'11px',fontWeight:500,lineHeight:1.3}}>{rt.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.1em',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'8px'}}>Descripción (opcional)</div>
              <textarea className="input-dark" rows={3} style={{resize:'none'}} placeholder="Contanos más sobre lo que pasó..." value={desc} onChange={e=>setDesc(e.target.value)} />
            </div>
            <button className="btn-platinum" onClick={submit} disabled={!type||loading}>{loading ? 'Enviando...' : 'Enviar denuncia'}</button>
          </div>
        </>)}
      </motion.div>
    </motion.div>
  )
}