'use client'
import { motion } from 'framer-motion'
import { Bus, AlertTriangle, Users, Clock, MapPin, X, Star, Gauge } from 'lucide-react'
import type { BusPosition } from '@/types'

interface Props { bus: BusPosition; onClose: () => void; onReport: () => void }

export default function BusInfoSheet({ bus, onClose, onReport }: Props) {
  const statusMap = {
    moving:  { label:'En movimiento', cls:'status-moving',  dot:'#22D3A0' },
    stopped: { label:'Detenido',      cls:'status-stopped', dot:'#FF4D6A' },
    at_stop: { label:'En parada',     cls:'status-at_stop', dot:'#F0B429' },
    offline: { label:'Sin señal',     cls:'status-offline', dot:'#4A5568' },
  }
  const s = statusMap[bus.status] || statusMap.offline

  return (
    <motion.div className="bottom-sheet safe-bottom" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:28,stiffness:200}}>
      {/* Handle */}
      <div style={{display:'flex',justifyContent:'center',paddingTop:'12px',paddingBottom:'4px'}}>
        <div style={{width:'36px',height:'4px',borderRadius:'2px',background:'rgba(184,200,224,0.15)'}} />
      </div>

      <div style={{padding:'16px 20px 24px'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'52px',height:'52px',borderRadius:'14px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.15)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(184,200,224,0.08)'}}>
              <Bus size={22} style={{color:'var(--platinum)'}} />
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                <h2 className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'18px'}}>Unidad {bus.bus_unit}</h2>
              </div>
              <span className={`status-pill ${s.cls}`}>
                <span style={{width:'6px',height:'6px',borderRadius:'50%',background:s.dot,display:'inline-block'}} />
                {s.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <X size={15} style={{color:'var(--text-secondary)'}} />
          </button>
        </div>

        {/* Driver info */}
        <div className="platinum-card" style={{borderRadius:'var(--r-md)',padding:'14px 16px',marginBottom:'14px'}}>
          <div style={{fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.1em',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'10px'}}>Chofer</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{color:'var(--text-primary)',fontWeight:600,fontSize:'15px'}}>{bus.driver_name}</div>
              <div style={{color:'var(--text-muted)',fontSize:'12px',marginTop:'2px'}}>Verificado ✓</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'5px',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.12)',borderRadius:'10px',padding:'6px 12px'}}>
              <Star size={13} style={{color:'var(--near)',fill:'var(--near)'}} />
              <span style={{color:'var(--text-primary)',fontWeight:700,fontSize:'14px',fontFamily:'DM Mono'}}>4.8</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}}>
          {[
            { icon: Gauge, label: 'km/h', value: bus.speed_kmh ?? 0 },
            { icon: Clock, label: 'min prox.', value: bus.eta_minutes ?? '—' },
            { icon: Users, label: 'a bordo', value: bus.passenger_count },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{background:'rgba(6,8,16,0.6)',border:'1px solid rgba(184,200,224,0.07)',borderRadius:'var(--r-md)',padding:'12px',textAlign:'center'}}>
              <div className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'22px',lineHeight:1}}>{value}</div>
              <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'4px',letterSpacing:'0.06em'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Next stop */}
        {bus.next_stop_name && (
          <div style={{display:'flex',alignItems:'center',gap:'12px',background:'rgba(34,211,160,0.06)',border:'1px solid rgba(34,211,160,0.15)',borderRadius:'var(--r-md)',padding:'12px 14px',marginBottom:'16px'}}>
            <MapPin size={16} style={{color:'var(--go)',flexShrink:0}} />
            <div style={{flex:1}}>
              <div style={{fontSize:'10px',color:'var(--go)',fontFamily:'DM Mono',letterSpacing:'0.06em',marginBottom:'2px'}}>PRÓXIMA PARADA</div>
              <div style={{color:'var(--text-primary)',fontWeight:500,fontSize:'14px'}}>{bus.next_stop_name}</div>
            </div>
            {bus.eta_minutes != null && <div className="font-display" style={{color:'var(--go)',fontWeight:700,fontSize:'16px',flexShrink:0}}>{bus.eta_minutes}m</div>}
          </div>
        )}

        {/* Actions */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          <button className="btn-danger" onClick={onReport}>
            <AlertTriangle size={15} /> Denunciar
          </button>
          <button className="btn-glass">
            <Users size={15} /> Estoy a bordo
          </button>
        </div>
      </div>
    </motion.div>
  )
}