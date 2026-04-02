// ─── COOKING SEQUENCE OPTIMIZER ───────────────────────────────────────────────
// Rules:
// - Max 2 ollas/sartenes simultáneas
// - Parallelizes passive steps (boiling, baking) with active prep
// - Includes cleanup steps between preparations
// - Each step has: active (needs attention) or passive (set and forget)

export function buildCookingSequence(dishes) {
  if (!dishes || dishes.length === 0) return []

  const steps = []
  let stepIdx = 0

  // Phase 1: Prep all ingredients
  const allIngredients = dishes.flatMap((d) => d.ingredients || [])
  if (allIngredients.length > 0) {
    steps.push({
      id: stepIdx++,
      type: 'prep',
      active: true,
      title: 'Mise en place',
      description: `Lava y corta: ${allIngredients.slice(0, 5).map((i) => i.name).join(', ')}${allIngredients.length > 5 ? '...' : ''}`,
      durationMin: Math.min(15, allIngredients.length * 2),
      status: 'pending',
      timerStart: null,
    })
  }

  // Phase 2: Generate steps per dish
  // Identify passive-first dishes (grains, legumes that boil)
  const passiveDishes = dishes.filter((d) =>
    d.ingredients?.some((i) => ['arroz', 'pasta', 'frijol', 'lenteja', 'quinoa', 'camote', 'papa']
      .some((k) => i.name?.toLowerCase().includes(k)))
  )

  const activeDishes = dishes.filter((d) => !passiveDishes.includes(d))

  // Start passive dishes first
  for (const dish of passiveDishes) {
    const grainIng = dish.ingredients?.find((i) =>
      ['arroz', 'pasta', 'frijol', 'lenteja', 'quinoa'].some((k) => i.name?.toLowerCase().includes(k))
    )
    if (grainIng) {
      steps.push({
        id: stepIdx++,
        type: 'passive',
        active: false,
        title: `Poner a hervir: ${grainIng.name}`,
        description: `Agua + ${grainIng.quantity} ${grainIng.unit} de ${grainIng.name}. Tapar y dejar a fuego medio.`,
        durationMin: 20,
        status: 'pending',
        timerStart: null,
      })
    }
  }

  // While grains boil, prep proteins
  const proteinDishes = activeDishes.filter((d) =>
    d.ingredients?.some((i) =>
      ['pollo', 'carne', 'salmon', 'tilapia', 'huevo', 'clara'].some((k) => i.name?.toLowerCase().includes(k))
    )
  )

  for (const dish of proteinDishes) {
    const protIng = dish.ingredients?.find((i) =>
      ['pollo', 'carne', 'salmon', 'tilapia', 'huevo', 'clara'].some((k) => i.name?.toLowerCase().includes(k))
    )
    if (protIng) {
      steps.push({
        id: stepIdx++,
        type: 'active',
        active: true,
        title: `Preparar: ${dish.name}`,
        description: `Sazona y cocina ${protIng.quantity} ${protIng.unit} de ${protIng.name}. Voltear a mitad.`,
        durationMin: 15,
        status: 'pending',
        timerStart: null,
      })
    }
  }

  // Veggie sides
  const veggieDishes = activeDishes.filter((d) =>
    d.ingredients?.some((i) =>
      ['espinaca', 'brocoli', 'zanahoria', 'apio', 'verdura', 'vegetal'].some((k) => i.name?.toLowerCase().includes(k))
    )
  )

  for (const dish of veggieDishes) {
    steps.push({
      id: stepIdx++,
      type: 'active',
      active: true,
      title: `Saltear verduras: ${dish.name}`,
      description: `Aceite caliente, saltea a fuego alto 5-7 min. Sazona al gusto.`,
      durationMin: 7,
      status: 'pending',
      timerStart: null,
    })
  }

  // Check on passive dishes
  if (passiveDishes.length > 0) {
    steps.push({
      id: stepIdx++,
      type: 'passive',
      active: true,
      title: 'Verificar granos',
      description: 'Revisa cocción, ajusta agua si es necesario y apaga el fuego.',
      durationMin: 3,
      status: 'pending',
      timerStart: null,
    })
  }

  // Cleanup
  steps.push({
    id: stepIdx++,
    type: 'cleanup',
    active: true,
    title: 'Limpieza intermedia',
    description: 'Enjuaga utensilios usados, limpia la estufa y organiza el espacio.',
    durationMin: 5,
    status: 'pending',
    timerStart: null,
  })

  // Pack / portion
  steps.push({
    id: stepIdx++,
    type: 'prep',
    active: true,
    title: 'Porcionar y guardar',
    description: 'Divide en contenedores para los días. Etiqueta con fecha.',
    durationMin: 10,
    status: 'pending',
    timerStart: null,
  })

  return steps
}

export const STEP_COLORS = {
  prep:    'var(--teal)',
  active:  'var(--orange)',
  passive: 'var(--blue)',
  cleanup: 'var(--text-dim)',
}
