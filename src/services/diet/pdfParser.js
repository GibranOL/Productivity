import * as pdfjsLib from 'pdfjs-dist'
import { categorizeIngredient, getShelfLife } from './ingredientNormalizer'

// pdfjs worker — use CDN to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

// ─── MEAL TYPE DETECTION ──────────────────────────────────────────────────────
const MEAL_HEADERS = [
  { key: 'al_despertar', patterns: ['al despertar', 'despertar'] },
  { key: 'desayuno',     patterns: ['desayuno'] },
  { key: 'medio_dia',    patterns: ['media mañana', 'medio dia', 'media manana', '10:', 'colación mañana'] },
  { key: 'comida',       patterns: ['comida', 'almuerzo'] },
  { key: 'media_tarde',  patterns: ['media tarde', 'colación tarde', 'merienda'] },
  { key: 'cena',         patterns: ['cena'] },
]

// ─── QUANTITY UNIT PATTERNS ───────────────────────────────────────────────────
// Matches: "100g", "2 piezas", "1/2 taza", "150 ml", "3 cdas"
const QTY_PATTERN = /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(g|gr|kg|ml|l|taza|tazas|pieza|piezas|pza|pzas|cda|cdas|cdita|cditas|oz|lb)?/i

// ─── ALTERNATIVE PATTERN ─────────────────────────────────────────────────────
// Matches: "(o 100g de X)" or "(alt: 2 pzas)"
const ALT_PATTERN = /\((?:o|alt[.:])?\s*(\d+[.,]?\d*)\s*(\w+)?\s+(?:de\s+)?([^)]+)\)/i

function parseQuantity(str) {
  const m = str.match(QTY_PATTERN)
  if (!m) return { quantity: 1, unit: '' }
  const raw = m[1].replace(',', '.')
  const quantity = raw.includes('/') ? eval(raw) : parseFloat(raw) // safe: only numbers
  const unit = (m[2] || '').toLowerCase()
  return { quantity: isNaN(quantity) ? 1 : quantity, unit }
}

function detectMealType(line) {
  const lower = line.toLowerCase()
  for (const { key, patterns } of MEAL_HEADERS) {
    if (patterns.some((p) => lower.includes(p))) return key
  }
  return null
}

function parseLine(line) {
  // Remove leading bullets, dashes, numbers
  line = line.replace(/^[\s•\-\*\d\.]+/, '').trim()
  if (!line || line.length < 3) return null

  // Check for alternative in parentheses
  let altQty = null, altUnit = null
  const altMatch = line.match(ALT_PATTERN)
  if (altMatch) {
    altQty = parseFloat(altMatch[1].replace(',', '.'))
    altUnit = altMatch[2] || ''
    line = line.replace(ALT_PATTERN, '').trim()
  }

  // Split quantity from name: "100g de pollo" or "2 piezas manzana"
  const deMatch = line.match(/^([\d.,\/]+\s*\w*)\s+(?:de\s+)?(.+)$/i)
  if (deMatch) {
    const { quantity, unit } = parseQuantity(deMatch[1])
    const name = deMatch[2].replace(/\s+/g, ' ').trim()
    if (name.length < 2) return null
    const category = categorizeIngredient(name)
    return {
      name,
      quantity,
      unit,
      alternativeQty: altQty,
      alternativeUnit: altUnit,
      category,
      shelfLifeDays: getShelfLife(category),
    }
  }

  // Fallback: whole line is ingredient name with qty=1
  const name = line.replace(/\s+/g, ' ').trim()
  if (name.length < 2) return null
  const category = categorizeIngredient(name)
  return {
    name,
    quantity: 1,
    unit: '',
    alternativeQty: null,
    alternativeUnit: null,
    category,
    shelfLifeDays: getShelfLife(category),
  }
}

// ─── MAIN PARSER ─────────────────────────────────────────────────────────────
export async function parseMundoNutritionPDF(file) {
  const warnings = []
  let parsedCount = 0
  let totalCount = 0

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdf.numPages

  const allText = []
  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const lines = content.items
      .map((item) => item.str)
      .join('\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    allText.push(...lines)
  }

  // Parse structure: detect meal sections and their ingredients
  const days = []
  let currentMealType = null
  let currentDish = null
  let currentDishes = []
  let currentMeals = []
  let dayCount = 0

  // Detect day boundaries — look for "Día X" or "DIA X"
  const dayPattern = /^d[ií]a\s+(\d+)/i

  function flushDish() {
    if (currentDish && currentDish.ingredients.length > 0) {
      currentDishes.push(currentDish)
      currentDish = null
    }
  }

  function flushMeal() {
    flushDish()
    if (currentMealType && currentDishes.length > 0) {
      currentMeals.push({ type: currentMealType, dishes: [...currentDishes] })
      currentDishes = []
      currentMealType = null
    }
  }

  function flushDay() {
    flushMeal()
    if (currentMeals.length > 0) {
      dayCount++
      const date = new Date()
      date.setDate(date.getDate() + dayCount - 1)
      days.push({
        date: date.toISOString().slice(0, 10),
        meals: [...currentMeals],
      })
      currentMeals = []
    }
  }

  for (const line of allText) {
    const dayMatch = line.match(dayPattern)
    if (dayMatch) {
      flushDay()
      continue
    }

    const mealType = detectMealType(line)
    if (mealType) {
      flushMeal()
      currentMealType = mealType
      // New dish named after the section
      currentDish = { name: line.trim(), ingredients: [] }
      continue
    }

    // Check if it's a dish/food name (not ingredient) — uppercase or ends with ':'
    if (line.length > 3 && (line === line.toUpperCase() || line.endsWith(':')) && !line.match(QTY_PATTERN)) {
      flushDish()
      currentDish = { name: line.replace(/:$/, '').trim(), ingredients: [] }
      continue
    }

    // Try to parse as ingredient
    if (currentDish && currentMealType) {
      totalCount++
      const ing = parseLine(line)
      if (ing) {
        parsedCount++
        currentDish.ingredients.push(ing)
      } else {
        warnings.push(`No se pudo parsear: "${line}"`)
      }
    }
  }

  flushDay()

  // If no days detected, treat all meals as day 1
  if (days.length === 0 && currentMeals.length > 0) {
    days.push({
      date: new Date().toISOString().slice(0, 10),
      meals: currentMeals,
    })
  }

  const confidence = totalCount > 0 ? Math.round((parsedCount / totalCount) * 100) : 0

  return {
    days,
    confidence,
    warnings: warnings.slice(0, 10), // limit warnings shown
    totalIngredients: parsedCount,
    totalLines: totalCount,
  }
}
