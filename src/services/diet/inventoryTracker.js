import { categorizeIngredient, getShelfLife } from './ingredientNormalizer'

export function createInventoryItem(name, quantity, unit, purchaseDateStr) {
  const category = categorizeIngredient(name)
  const shelfDays = getShelfLife(category)
  const purchase = purchaseDateStr || new Date().toISOString().slice(0, 10)
  const purchaseDate = new Date(purchase + 'T00:00:00')
  const expiryDate = new Date(purchaseDate)
  expiryDate.setDate(purchaseDate.getDate() + shelfDays)

  return {
    ingredientName: name.trim(),
    category,
    quantity,
    unit: unit || '',
    purchaseDate: purchase,
    expiryDate: expiryDate.toISOString().slice(0, 10),
    status: 'ok',
  }
}

export function computeStatus(expiryDateStr) {
  if (!expiryDateStr) return 'ok'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDateStr + 'T00:00:00')
  const diff = Math.floor((exp - today) / 86400000)
  if (diff < 0) return 'expired'
  if (diff <= 1) return 'expiring_soon'
  if (diff <= 3) return 'use_next'
  return 'ok'
}

export const STATUS_CONFIG = {
  ok:            { label: 'OK',          color: 'var(--green)',  icon: '✓' },
  use_next:      { label: 'Usar pronto', color: 'var(--yellow)', icon: '⚡' },
  expiring_soon: { label: 'Vence hoy',   color: 'var(--orange)', icon: '⚠️' },
  expired:       { label: 'Vencido',     color: 'var(--red)',    icon: '✗' },
}
