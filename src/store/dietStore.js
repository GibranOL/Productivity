import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── ROTATION CONFIG ─────────────────────────────────────────────────────────
// 0=Lun … 6=Dom (scheduler convention)
// Domingo = descanso
export const ROTATION_MAP = { 0: 'A', 1: 'B', 2: 'C', 3: 'A', 4: 'B', 5: 'C', 6: null }

export const MEAL_TYPES = [
  { key: 'al_despertar', label: 'Al despertar',  icon: '🌅', order: 0 },
  { key: 'desayuno',     label: 'Desayuno',       icon: '🍳', order: 1 },
  { key: 'medio_dia',    label: 'Media mañana',   icon: '🥜', order: 2 },
  { key: 'comida',       label: 'Comida',         icon: '🍽️', order: 3 },
  { key: 'media_tarde',  label: 'Media tarde',    icon: '🍎', order: 4 },
  { key: 'cena',         label: 'Cena',           icon: '🌙', order: 5 },
]

export const CATEGORIES = [
  'proteinas', 'verduras', 'frutas', 'lacteos', 'granos', 'bebidas', 'otros'
]

export const CATEGORY_ICONS = {
  proteinas: '🥩', verduras: '🥦', frutas: '🍎',
  lacteos: '🥛', granos: '🌾', bebidas: '💧', otros: '📦',
}

// ─── PURE HELPER — no side effects, safe to call from render/selectors ───────
function computeExpiryStatus(item) {
  if (!item.expiryDate) return 'ok'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(item.expiryDate + 'T00:00:00')
  const diffDays = Math.floor((exp - today) / 86400000)
  return diffDays < 0 ? 'expired'
    : diffDays <= 1 ? 'expiring_soon'
    : diffDays <= 3 ? 'use_next'
    : 'ok'
}

const useDietStore = create(
  persist(
    (set, get) => ({
      // ─── DATA ────────────────────────────────────────────────────
      templates: [],   // MealTemplate[]
      inventory: [],   // InventoryItem[]
      shoppingList: [], // { id, name, category, quantity, unit, checked, fromTemplate }[]
      cookingSteps: [], // active cooking steps for today
      rotationOverrides: {}, // { 'YYYY-MM-DD': 'A'|'B'|'C'|null }

      // ─── TEMPLATE CRUD ───────────────────────────────────────────
      addTemplate: (template) =>
        set((s) => ({
          templates: [...s.templates, { ...template, id: crypto.randomUUID(), active: true, parsedAt: Date.now() }],
        })),

      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, ...patch } : t),
        })),

      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      setActiveTemplate: (label) =>
        set((s) => ({
          templates: s.templates.map((t) => ({ ...t, active: t.label === label })),
        })),

      // ─── ROTATION ────────────────────────────────────────────────
      getTemplateForDate: (dateStr) => {
        const overrides = get().rotationOverrides
        if (overrides[dateStr] !== undefined) return overrides[dateStr]
        // dateStr = 'YYYY-MM-DD'
        const d = new Date(dateStr + 'T12:00:00')
        const dow = d.getDay() // JS 0=Dom
        // Convert to scheduler convention: 0=Lun
        const schedDow = dow === 0 ? 6 : dow - 1
        return ROTATION_MAP[schedDow] ?? null
      },

      setRotationOverride: (dateStr, label) =>
        set((s) => ({
          rotationOverrides: { ...s.rotationOverrides, [dateStr]: label },
        })),

      // ─── INVENTORY ───────────────────────────────────────────────
      addInventoryItem: (item) =>
        set((s) => ({
          inventory: [...s.inventory, {
            id: crypto.randomUUID(),
            ingredientName: item.ingredientName,
            category: item.category || 'otros',
            quantity: item.quantity,
            unit: item.unit,
            purchaseDate: item.purchaseDate || new Date().toISOString().slice(0, 10),
            expiryDate: item.expiryDate || '',
            status: 'ok',
          }],
        })),

      updateInventoryItem: (id, patch) =>
        set((s) => ({
          inventory: s.inventory.map((i) => i.id === id ? { ...i, ...patch } : i),
        })),

      removeInventoryItem: (id) =>
        set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) })),

      // Recompute expiry status for all items
      refreshInventoryStatus: () =>
        set((s) => {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return {
            inventory: s.inventory.map((item) => {
              if (!item.expiryDate) return { ...item, status: 'ok' }
              const exp = new Date(item.expiryDate + 'T00:00:00')
              const diffDays = Math.floor((exp - today) / 86400000)
              const status = diffDays < 0 ? 'expired'
                : diffDays <= 1 ? 'expiring_soon'
                : diffDays <= 3 ? 'use_next'
                : 'ok'
              return { ...item, status }
            }),
          }
        }),

      // ─── SHOPPING LIST ───────────────────────────────────────────
      setShoppingList: (list) => set({ shoppingList: list }),

      toggleShoppingItem: (id) =>
        set((s) => ({
          shoppingList: s.shoppingList.map((i) =>
            i.id === id ? { ...i, checked: !i.checked } : i
          ),
        })),

      clearCheckedItems: () =>
        set((s) => ({ shoppingList: s.shoppingList.filter((i) => !i.checked) })),

      addShoppingItem: (item) =>
        set((s) => ({
          shoppingList: [...s.shoppingList, {
            id: crypto.randomUUID(),
            name: item.name,
            category: item.category || 'otros',
            quantity: item.quantity || 1,
            unit: item.unit || '',
            checked: false,
            fromTemplate: item.fromTemplate || false,
          }],
        })),

      // ─── COOKING STEPS ───────────────────────────────────────────
      setCookingSteps: (steps) => set({ cookingSteps: steps }),

      updateCookingStep: (idx, patch) =>
        set((s) => ({
          cookingSteps: s.cookingSteps.map((step, i) =>
            i === idx ? { ...step, ...patch } : step
          ),
        })),

      // ─── SELECTORS ───────────────────────────────────────────────
      getTodayMeals: () => {
        const { templates, getTemplateForDate } = get()
        const today = new Date().toISOString().slice(0, 10)
        const label = getTemplateForDate(today)
        if (!label) return null
        const template = templates.find((t) => t.label === label && t.active)
        if (!template) return null
        // Find the day in the template that matches today
        const day = template.days?.find((d) => d.date === today)
          || template.days?.[0] // fallback to first day
        return { template, day, label }
      },

      // Pure read — computes status on the fly without calling any setter.
      // Call refreshInventoryStatus() separately (e.g. on tab mount) to persist
      // the status back to the store if you need it in the UI.
      getExpiringItems: () => {
        return get().inventory.filter((i) =>
          ['expiring_soon', 'use_next', 'expired'].includes(computeExpiryStatus(i))
        )
      },
    }),

    {
      name: 'gibran-os-diet-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useDietStore
