'use client'
import { motion } from 'framer-motion'
import { MapPin, Clock } from 'lucide-react'
import type { BusStop } from '@/types'

export default function NearbyStops({ stops }: { stops: BusStop[] }) {
  return (
    <motion.div className="bottom-sheet safe-bottom" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:28,stiffness:200}}>
      <div style={{display:'flex',justifyContent:'center',paddingTop:'12px'}}>
        <div style={{width:'36px',height:'4px',borderRadius:'2px',background:'rgba(184,200,224,0.15)'}} />
      </div>
      <div style={{padding:'14px 20px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
          <MapPin size={14} style={{color:'var(--platinum)'}} />
          <span className="font-display" style={{color:'var(--text-primary)',fontWeight:600,fontSize:'14px',letterSpacing:'0.01em'}}>Paradas cercanas</span>
        </div>
        <div className="scroll-panel" style={{maxHeight:'44vh',display:'flex',flexDirection:'column',gap:'6px'}}>
          {stops.slice(0,8).map((stop: BusStop) => (
            <div key={stop.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'var(--r-sm)',background:'rgba(6,8,16,0.5)',border:'1px solid rgba(184,200,224,0.06)'}}>
              <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <MapPin size={13} style={{color:'var(--platinum-dim)'}} />
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'var(--text-primary)',fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{stop.street_name}</div>
                <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'1px'}}>{stop.name}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
                <Clock size={11} style={{color:'var(--text-muted)'}} />
                <span style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>~{stop.avg_wait_minutes}m</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}