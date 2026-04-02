import { CATEGORIES } from '../../store/dietStore'

// ─── CATEGORY KEYWORDS ────────────────────────────────────────────────────────
const CAT_KEYWORDS = {
  proteinas: ['pollo','pechuga','carne','res','salmon','atun','huevo','clara','proteina','jamon','pavo','tilapia','filete','bistec','cerdo'],
  verduras:  ['espinaca','brocoli','brócoli','zanahoria','apio','pepino','tomate','cebolla','ajo','chayote','nopal','calabaza','lechuga','acelga','kale','espárrago','esparragos','champiñon','champiñones','chile','pimiento'],
  frutas:    ['manzana','platano','plátano','naranja','fresa','piña','mango','uva','pera','melon','melón','sandía','sandia','kiwi','mandarina','limon','limón','blueberry','arándano'],
  lacteos:   ['leche','yogurt','queso','cottage','kefir','crema'],
  granos:    ['arroz','avena','quinoa','tortilla','pan','pasta','frijol','lenteja','garbanzo','papa','camote','tostada'],
  bebidas:   ['agua','café','te','té','jugo','proteina en polvo','suero'],
}

const SHELF_LIFE = {
  proteinas: 3,
  verduras:  5,
  frutas:    7,
  lacteos:   7,
  granos:    90,
  bebidas:   30,
  otros:     14,
}

export function categorizeIngredient(name) {
  const lower = name.toLowerCase()
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return cat
  }
  return 'otros'
}

export function getShelfLife(category) {
  return SHELF_LIFE[category] || 14
}

// Fuzzy dedup: merge ingredients with same normalized name
export function normalizeIngredients(ingredients) {
  const map = new Map()
  for (const ing of ingredients) {
    const key = ing.name.toLowerCase().trim().replace(/\s+/g, ' ')
    if (map.has(key)) {
      const existing = map.get(key)
      map.set(key, {
        ...existing,
        quantity: existing.quantity + ing.quantity,
      })
    } else {
      map.set(key, {
        ...ing,
        name: ing.name.trim(),
        category: ing.category || categorizeIngredient(ing.name),
        shelfLifeDays: ing.shelfLifeDays || getShelfLife(ing.category || categorizeIngredient(ing.name)),
      })
    }
  }
  return Array.from(map.values())
}
