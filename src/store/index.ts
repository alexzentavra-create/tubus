import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusLine, BusPosition, Profile } from '@/types'

interface AppStore {
  // Auth
  user: Profile | null
  setUser: (user: Profile | null) => void

  // Map state
  selectedLine: BusLine | null
  setSelectedLine: (line: BusLine | null) => void

  activeBuses: BusPosition[]
  setActiveBuses: (buses: BusPosition[]) => void
  updateBusPosition: (bus: BusPosition) => void

  selectedBus: BusPosition | null
  setSelectedBus: (bus: BusPosition | null) => void

  userLocation: { lat: number; lng: number } | null
  setUserLocation: (loc: { lat: number; lng: number }) => void

  // UI state
  showLineSelector: boolean
  setShowLineSelector: (v: boolean) => void

  showReport: boolean
  setShowReport: (v: boolean) => void

  // Driver state (persisted for background tracking)
  isDriverOnline: boolean
  setDriverOnline: (v: boolean) => void

  passengerCount: number
  setPassengerCount: (n: number) => void
  incrementPassengers: () => void
  decrementPassengers: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: user => set({ user }),

      selectedLine: null,
      setSelectedLine: line => set({ selectedLine: line, activeBuses: [] }),

      activeBuses: [],
      setActiveBuses: buses => set({ activeBuses: buses }),
      updateBusPosition: bus => set(state => {
        const existing = state.activeBuses.findIndex(b => b.driver_id === bus.driver_id)
        if (existing >= 0) {
          const updated = [...state.activeBuses]
          updated[existing] = bus
          return { activeBuses: updated }
        }
        return { activeBuses: [...state.activeBuses, bus] }
      }),

      selectedBus: null,
      setSelectedBus: bus => set({ selectedBus: bus }),

      userLocation: null,
      setUserLocation: loc => set({ userLocation: loc }),

      showLineSelector: false,
      setShowLineSelector: v => set({ showLineSelector: v }),

      showReport: false,
      setShowReport: v => set({ showReport: v }),

      isDriverOnline: false,
      setDriverOnline: v => set({ isDriverOnline: v }),

      passengerCount: 0,
      setPassengerCount: n => set({ passengerCount: n }),
      incrementPassengers: () => set(s => ({ passengerCount: s.passengerCount + 1 })),
      decrementPassengers: () => set(s => ({ passengerCount: Math.max(0, s.passengerCount - 1) })),
    }),
    {
      name: 'bustrack-store',
      // Only persist driver-critical state so the driver stays "online" on refresh
      partialize: state => ({
        isDriverOnline: state.isDriverOnline,
        selectedLine: state.selectedLine,
      }),
    }
  )
)