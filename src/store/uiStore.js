import { create } from 'zustand'

const useUIStore = create((set) => ({
  // Cortana sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),

  // Active modal (generic)
  modal: null, // 'checkin' | 'addJob' | 'addFeature' | 'addProject' | 'eventPopup' | null
  modalData: null, // data passed to the modal (e.g., event ID)
  openModal: (name, data = null) => set({ modal: name, modalData: data }),
  closeModal: () => set({ modal: null, modalData: null }),

  // Calendar view
  selectedDate: null, // ISO date string for focused date
  calendarView: null, // 'timeGridWeek' | 'timeGridDay' | 'listWeek' | 'listDay' | null (auto)
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),

  // Stores hydration status
  storesReady: false,
  setStoresReady: (ready) => set({ storesReady: ready }),
}))

export default useUIStore
