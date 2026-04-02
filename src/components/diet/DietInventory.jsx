import { useState } from 'react'
import useDietStore, { CATEGORIES, CATEGORY_ICONS } from '../../store/dietStore'
import { createInventoryItem, STATUS_CONFIG } from '../../services/diet/inventoryTracker'
import { Card, Btn, Input, SectionTitle, Badge } from '../UI'

export default function DietInventory() {
  const inventory      = useDietStore((s) => s.inventory)
  const addItem        = useDietStore((s) => s.addInventoryItem)
  const removeItem     = useDietStore((s) => s.removeInventoryItem)
  const refreshStatus  = useDietStore((s) => s.refreshInventoryStatus)

  const [form, setForm] = useState({ name: '', quantity: '', unit: '', purchaseDate: '' })
  const [filter, setFilter] = useState('all') // 'all' | status keys

  // Always refresh on render
  refreshStatus()

  const filtered = filter === 'all'
    ? inventory
    : inventory.filter((i) => i.status === filter)

  // Group by category
  const byCategory = {}
  for (const item of filtered) {
    const cat = item.category || 'otros'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }

  const expiring = inventory.filter((i) => ['expiring_soon', 'expired'].includes(i.status))

  function handleAdd() {
    if (!form.name.trim()) return
    const item = createInventoryItem(
      form.name.trim(),
      parseFloat(form.quantity) || 1,
      form.unit,
      form.purchaseDate || undefined
    )
    addItem(item)
    setForm({ name: '', quantity: '', unit: '', purchaseDate: '' })
  }

  function p(k) { return (v) => setForm((f) => ({ ...f, [k]: v })) }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red-mid)',
          borderRadius: 'var(--radius)', padding: '12px 16px',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>⚠️ Vence pronto</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {expiring.map((i) => (
              <span key={i.id} style={{
                background: 'var(--red-dim)', border: '1px solid var(--red-mid)',
                borderRadius: 12, padding: '2px 10px', fontSize: 12, color: 'var(--red)',
              }}>
                {i.ingredientName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <Card accent="green">
        <SectionTitle>Registrar compra</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Input value={form.name} onChange={p('name')} placeholder="Ingrediente*" style={{ flex: '2 1 140px' }} />
          <Input value={form.quantity} onChange={p('quantity')} placeholder="Cant." type="number" style={{ flex: '0 1 70px' }} />
          <Input value={form.unit} onChange={p('unit')} placeholder="g/ml/pza" style={{ flex: '0 1 70px' }} />
          <input type="date" className="input" value={form.purchaseDate} onChange={(e) => p('purchaseDate')(e.target.value)} style={{ flex: '1 1 120px' }} />
          <Btn variant="primary" onClick={handleAdd} disabled={!form.name.trim()}>+ Agregar</Btn>
        </div>
      </Card>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { val: 'all', label: `Todo (${inventory.length})` },
          { val: 'expiring_soon', label: '⚠️ Vence hoy' },
          { val: 'use_next',      label: '⚡ Usar pronto' },
          { val: 'expired',       label: '✗ Vencido' },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12,
            border: `1px solid ${filter === val ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
            background: filter === val ? 'var(--teal-dim)' : 'var(--bg3)',
            color: filter === val ? 'var(--teal)' : 'var(--text-dim)',
            cursor: 'pointer', transition: 'var(--transition)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Inventory list */}
      {Object.entries(byCategory).map(([cat, items]) => (
        <Card key={cat}>
          <div className="row" style={{ marginBottom: 10, gap: 8 }}>
            <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat] || '📦'}</span>
            <div className="label">{cat}</div>
          </div>
          <div className="stack" style={{ gap: 5 }}>
            {items.map((item) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.ok
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <span style={{ fontSize: 14 }}>{sc.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.ingredientName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      {item.quantity}{item.unit} · vence {item.expiryDate || '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: sc.color, fontWeight: 700 }}>{sc.label}</span>
                  <button onClick={() => removeItem(item.id)} style={{
                    background: 'none', border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', fontSize: 14, padding: '0 4px',
                  }}>✕</button>
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 14 }}>
            {filter === 'all' ? 'Inventario vacío — agrega tus compras' : 'Sin ítems en esta categoría'}
          </div>
        </Card>
      )}
    </div>
  )
}
