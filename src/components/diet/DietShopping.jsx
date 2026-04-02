import { useState } from 'react'
import useDietStore, { CATEGORY_ICONS } from '../../store/dietStore'
import { generateShoppingList } from '../../services/diet/shoppingListGenerator'
import { getUpcomingRotation } from '../../services/diet/rotationResolver'
import { Card, Btn, Input, SectionTitle, Badge } from '../UI'

export default function DietShopping() {
  const shoppingList     = useDietStore((s) => s.shoppingList)
  const templates        = useDietStore((s) => s.templates)
  const inventory        = useDietStore((s) => s.inventory)
  const rotationOverrides = useDietStore((s) => s.rotationOverrides)
  const setShoppingList  = useDietStore((s) => s.setShoppingList)
  const toggleItem       = useDietStore((s) => s.toggleShoppingItem)
  const clearChecked     = useDietStore((s) => s.clearCheckedItems)
  const addItem          = useDietStore((s) => s.addShoppingItem)

  const [newName, setNewName] = useState('')
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    const rotation = getUpcomingRotation(7, rotationOverrides)
    const list = generateShoppingList(templates, rotation, inventory, 7)
    setShoppingList(list)
    setGenerating(false)
  }

  function handleAddManual() {
    if (!newName.trim()) return
    addItem({ name: newName.trim() })
    setNewName('')
  }

  // Group by category
  const byCategory = {}
  for (const item of shoppingList) {
    const cat = item.category || 'otros'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }

  const checkedCount = shoppingList.filter((i) => i.checked).length
  const totalCount   = shoppingList.length

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Header */}
      <Card accent="green">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="label" style={{ marginBottom: 2 }}>Lista de compras</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-mid)' }}>
              {checkedCount}/{totalCount} comprados
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {checkedCount > 0 && (
              <Btn variant="ghost" size="sm" onClick={clearChecked}>Limpiar ✓</Btn>
            )}
            <Btn variant="primary" size="sm" onClick={handleGenerate}>
              {generating ? '...' : '⚡ Generar'}
            </Btn>
          </div>
        </div>
        {/* Add manual */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={newName} onChange={setNewName} placeholder="Agregar ítem..." style={{ flex: 1 }} />
          <Btn variant="ghost" size="sm" onClick={handleAddManual}>+</Btn>
        </div>
      </Card>

      {shoppingList.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 14 }}>
            Lista vacía — presiona "⚡ Generar" para crear la lista de la semana
          </div>
        </Card>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <Card key={cat}>
            <div className="row" style={{ marginBottom: 10, gap: 8 }}>
              <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat] || '📦'}</span>
              <div className="label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
              <Badge color="teal">{items.filter((i) => !i.checked).length}</Badge>
            </div>
            <div className="stack" style={{ gap: 5 }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px',
                    background: item.checked ? 'var(--bg4)' : 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition)',
                    opacity: item.checked ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.checked ? '✅' : '⬜'}</span>
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 500,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    color: item.checked ? 'var(--text-dim)' : 'var(--text)',
                  }}>
                    {item.name}
                  </span>
                  {item.quantity > 0 && item.unit && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                      {item.quantity}{item.unit}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
