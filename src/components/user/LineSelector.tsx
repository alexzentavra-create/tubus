'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Bus, Check } from 'lucide-react'
import type { BusLine } from '@/types'

interface Props { lines: BusLine[]; selectedLine: BusLine|null; onSelect:(l:BusLine)=>void; onClose:()=>void }

export default function LineSelector({ lines, selectedLine, onSelect, onClose }: Props) {
  const [q, setQ] = useState('')
  const filtered = lines.filter(l => l.line_number.includes(q) || l.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <motion.div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center'}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}} onClick={onClose} />
      <motion.div
        className="glass-dark"
        style={{position:'relative',width:'100%',maxWidth:'420px',margin:'0 16px 16px',overflow:'hidden',borderRadius:'var(--r-xl)'}}
        initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:80,opacity:0}}
        transition={{type:'spring',damping:28}}
      >
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 20px 14px'}}>
          <h3 className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'17px',letterSpacing:'-0.01em'}}>Elegí una línea</h3>
          <button onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <X size={14} style={{color:'var(--text-secondary)'}} />
          </button>
        </div>

        {/* Search */}
        <div style={{padding:'0 16px 12px'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
            <input autoFocus className="input-dark" style={{paddingLeft:'38px',fontSize:'13px'}} placeholder="Buscar por número o recorrido..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>

        {/* List */}
        <div className="scroll-panel" style={{maxHeight:'55vh',padding:'4px 12px 16px'}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <Bus size={28} style={{color:'var(--text-muted)',margin:'0 auto 8px'}} />
              <p style={{color:'var(--text-muted)',fontSize:'13px'}}>Sin resultados</p>
            </div>
          ) : filtered.map(line => (
            <button key={line.id} onClick={()=>onSelect(line)} style={{width:'100%',display:'flex',alignItems:'center',gap:'14px',padding:'12px 14px',borderRadius:'var(--r-md)',border:`1px solid ${selectedLine?.id===line.id ? 'rgba(184,200,224,0.2)' : 'rgba(184,200,224,0.05)'}`,background: selectedLine?.id===line.id ? 'rgba(184,200,224,0.06)' : 'rgba(6,8,16,0.4)',marginBottom:'6px',cursor:'pointer',transition:'all 200ms',textAlign:'left'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'10px',background:line.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 4px 12px ${line.color}40`}}>
                <span className="font-display" style={{color:'#fff',fontWeight:800,fontSize:'13px'}}>{line.line_number}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'var(--text-primary)',fontWeight:500,fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{line.name.split(' - ')[1] || line.name}</div>
                <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>{line.company}</div>
              </div>
              {selectedLine?.id === line.id && (
                <div style={{width:'22px',height:'22px',borderRadius:'50%',background:'rgba(184,200,224,0.15)',border:'1px solid rgba(184,200,224,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Check size={12} style={{color:'var(--platinum)'}} />
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}