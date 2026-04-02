import { normalizeIngredients, categorizeIngredient, getShelfLife } from './ingredientNormalizer'

// Collect all ingredients from templates for the next N days
export function generateShoppingList(templates, rotation, inventory, daysAhead = 7) {
  const relevantDays = rotation.slice(0, daysAhead).filter((r) => r.label !== null)

  const allIngredients = []

  for (const { date, label } of relevantDays) {
    const template = templates.find((t) => t.label === label && t.active)
    if (!template) continue
    const day = template.days?.find((d) => d.date === date) || template.days?.[0]
    if (!day) continue

    for (const meal of day.meals || []) {
      for (const dish of meal.dishes || []) {
        for (const ing of dish.ingredients || []) {
          allIngredients.push({ ...ing })
        }
      }
    }
  }

  // Normalize + dedup
  const normalized = normalizeIngredients(allIngredients)

  // Subtract inventory quantities
  const shopping = normalized.map((ing) => {
    const inStock = inventory
      .filter((i) => i.ingredientName.toLowerCase() === ing.name.toLowerCase() && i.status !== 'expired')
      .reduce((sum, i) => sum + i.quantity, 0)
    const needed = Math.max(0, ing.quantity - inStock)
    return {
      id: crypto.randomUUID(),
      name: ing.name,
      category: ing.category || categorizeIngredient(ing.name),
      quantity: needed,
      unit: ing.unit || '',
      checked: false,
      fromTemplate: true,
    }
  }).filter((i) => i.quantity > 0)

  // Sort by category
  const catOrder = ['proteinas', 'verduras', 'frutas', 'lacteos', 'granos', 'bebidas', 'otros']
  shopping.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category))

  return shopping
}
