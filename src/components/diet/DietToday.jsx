import useDietStore, { MEAL_TYPES, ROTATION_MAP } from '../../store/dietStore'
import { buildCookingSequence } from '../../services/diet/cookingSequenceOptimizer'
import { Card, Btn, Badge, SectionTitle } from '../UI'
import DietCookingTimer from './DietCookingTimer'

export default function DietToday() {
  const getTodayMeals  = useDietStore((s) => s.getTodayMeals)
  const setCookingSteps = useDietStore((s) => s.setCookingSteps)
  const cookingSteps   = useDietStore((s) => s.cookingSteps)
  const templates      = useDietStore((s) => s.templates)

  const today = getTodayMeals()
  const todayStr = new Date().toISOString().slice(0, 10)
  const dow = new Date().getDay()
  const schedDow = dow === 0 ? 6 : dow - 1
  const label = ROTATION_MAP[schedDow]

  if (templates.length === 0) {
    return (
      <EmptyState message="No hay templates cargados. Sube tu PDF de Mundo Nutrition en la pestaña 'PDF'." />
    )
  }

  if (!label) {
    return (
      <Card accent="purple" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700 }}>Domingo — Día de descanso</div>
        <div style={{ color: 'var(--text-mid)', marginTop: 6, fontSize: 14 }}>Sin plan de comidas hoy. Relax 🙂</div>
      </Card>
    )
  }

  if (!today) {
    return (
      <EmptyState message={`Template ${label} activo pero sin plan para hoy. Revisa las fechas del template.`} />
    )
  }

  const { day, template } = today
  const allDishes = day?.meals?.flatMap((m) => m.dishes || []) || []

  function handleStartCooking() {
    const steps = buildCookingSequence(allDishes)
    setCookingSteps(steps)
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Header */}
      <Card accent="green">
        <div className="row-between">
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Plan de hoy</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800 }}>
              Template {label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>
              {template.sourceFile || 'Mundo Nutrition'} · {day?.meals?.length || 0} tiempos
            </div>
          </div>
          <Badge color="green">T{label}</Badge>
        </div>
        {allDishes.length > 0 && cookingSteps.length === 0 && (
          <Btn variant="primary" size="sm" style={{ marginTop: 12 }} onClick={handleStartCooking}>
            🍳 Iniciar secuencia de cocina
          </Btn>
        )}
      </Card>

      {/* Cooking timer (if active) */}
      {cookingSteps.length > 0 && (
        <Card accent="orange">
          <DietCookingTimer />
          <Btn variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => setCookingSteps([])}>
            Cancelar secuencia
          </Btn>
        </Card>
      )}

      {/* Meals */}
      {day?.meals?.map((meal) => {
        const mealConfig = MEAL_TYPES.find((m) => m.key === meal.type) || { label: meal.type, icon: '🍽️' }
        return (
          <Card key={meal.type} accent="teal">
            <div className="row" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{mealConfig.icon}</span>
              <div className="label">{mealConfig.label}</div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {meal.dishes?.map((dish, i) => (
                <div key={i} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{dish.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {dish.ingredients?.map((ing, j) => (
                      <span key={j} style={{
                        background: 'var(--bg4)', border: '1px solid var(--border-mid)',
                        borderRadius: 12, padding: '2px 8px', fontSize: 11, color: 'var(--text-mid)',
                      }}>
                        {ing.quantity}{ing.unit} {ing.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🥗</div>
        <div style={{ color: 'var(--text-mid)', fontSize: 14 }}>{message}</div>
      </div>
    </Card>
  )
}
