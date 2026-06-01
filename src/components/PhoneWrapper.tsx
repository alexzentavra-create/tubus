'use client'
import React, { useState, useEffect } from 'react'
import { Monitor, Smartphone, Wifi, Battery, RefreshCw, Layers } from 'lucide-react'

interface PhoneWrapperProps {
  children: React.ReactNode
  defaultMode?: 'phone' | 'computer'
  title?: string
}

export default function PhoneWrapper({
  children,
  defaultMode = 'computer',
  title = 'App'
}: PhoneWrapperProps) {
  const [isPhoneMode, setIsPhoneMode] = useState(defaultMode === 'phone')
  const [time, setTime] = useState('09:41')

  useEffect(() => {
    // Keep local clock updated in the mock status bar
    const updateClock = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
    updateClock()
    const timer = setInterval(updateClock, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#07090e] text-[#b8c8e0] relative flex flex-col font-sans transition-all duration-500 overflow-x-hidden">
      {/* Top Floating Glassmorphic Viewport Controls */}
      <header className="sticky top-0 w-full z-[100] bg-black/40 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] p-[1px] flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-[#0d1117] rounded-[7px] flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#3b82f6]" />
            </div>
          </div>
          <div>
            <span className="text-xs text-[#5f7595] font-mono tracking-wider block">BIENPARADA SYSTEM</span>
            <h2 className="text-sm font-semibold text-white/95 leading-none">{title}</h2>
          </div>
        </div>

        {/* Dynamic Segmented Control Toggle Switch */}
        <div className="bg-[#0b0e14]/90 border border-white/10 rounded-full p-[3px] flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setIsPhoneMode(true)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 ${
              isPhoneMode
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-105'
                : 'text-[#8598b0] hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 Celular</span>
          </button>
          <button
            onClick={() => setIsPhoneMode(false)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 ${
              !isPhoneMode
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-105'
                : 'text-[#8598b0] hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>💻 Computadora</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {isPhoneMode ? (
        /* 📱 Phone Format Container */
        <div className="flex-1 w-full py-12 px-4 flex items-center justify-center relative bg-gradient-to-b from-[#080b11] via-[#0b0f19] to-[#07090e]">
          {/* Ambient Glowing Background Blobs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />

          {/* Premium Smartphone Frame Mockup */}
          <div className="relative mx-auto transition-all duration-500 hover:scale-[1.01]">
            {/* Phone Buttons Details */}
            {/* Volume Up */}
            <div className="absolute top-[130px] -left-[14px] w-[3px] h-[40px] bg-neutral-800 rounded-l-md border-r border-black" />
            {/* Volume Down */}
            <div className="absolute top-[185px] -left-[14px] w-[3px] h-[40px] bg-neutral-800 rounded-l-md border-r border-black" />
            {/* Power Button */}
            <div className="absolute top-[150px] -right-[14px] w-[3px] h-[65px] bg-neutral-800 rounded-r-md border-l border-black" />

            {/* Main Phone Shell */}
            <div className="w-[375px] h-[812px] rounded-[48px] border-[10px] border-neutral-900 bg-[#07090e] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col outline outline-1 outline-white/5">
              
              {/* Dynamic Island / Notch */}
              <div className="w-[105px] h-[28px] bg-black rounded-full absolute top-[10px] left-1/2 -translate-x-1/2 z-50 flex items-center justify-center shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)]">
                <div className="w-3 h-3 bg-neutral-900 rounded-full absolute right-3 border border-neutral-850 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#0d1624] rounded-full" />
                </div>
              </div>

              {/* Status Bar */}
              <div className="h-[40px] px-6 pt-3 flex items-center justify-between text-xs text-white bg-black/40 backdrop-blur-sm z-40 relative flex-shrink-0 select-none">
                <span className="font-semibold text-white/95 text-[11px]">{time}</span>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-white/90" />
                  <span className="text-[10px] font-mono text-white/90">5G</span>
                  <Battery className="w-4.5 h-3 text-white/90" />
                </div>
              </div>

              {/* Viewport Content */}
              <div className="flex-1 w-full overflow-y-auto overflow-x-hidden relative bg-[#07090e] rounded-b-[38px] scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                <div className="w-full h-full">
                  {children}
                </div>
              </div>

              {/* Virtual Home Bar Indicator */}
              <div className="w-[125px] h-[4px] bg-white/25 hover:bg-white/45 transition-colors rounded-full absolute bottom-[8px] left-1/2 -translate-x-1/2 z-50" />
            </div>
          </div>
        </div>
      ) : (
        /* 💻 Computer/Desktop Format Container */
        <div className="flex-1 w-full bg-[#07090e] overflow-auto">
          {children}
        </div>
      )}
    </div>
  )
}
