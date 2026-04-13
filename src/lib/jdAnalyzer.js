// ─── JD Analyzer — Prompt builder for Cortana ────────────────────────────────
// Compares a Job Description against Gibran's profile and returns a structured
// analysis prompt for Ollama/Cortana to evaluate.

const GIBRAN_PROFILE = {
  title: 'QA Engineer / Software Engineer',
  location: 'Vancouver, BC, Canada',
  status: 'Seeking PR sponsorship / LMIA-eligible roles',
  yearsExperience: '5+',
  languages: ['Spanish (native)', 'English (professional)'],
  coreSkills: [
    'Playwright', 'Cypress', 'Selenium', 'Test Automation',
    'Python', 'JavaScript', 'TypeScript', 'React',
    'API Testing', 'REST', 'GraphQL',
    'CI/CD', 'GitHub Actions', 'Jenkins',
    'Agile', 'Scrum', 'JIRA',
    'Manual QA', 'Regression Testing', 'Performance Testing',
    'SQL', 'PostgreSQL', 'MongoDB',
  ],
  tools: [
    'VS Code', 'Git', 'Docker', 'Postman',
    'BrowserStack', 'Charles Proxy',
    'Appwrite', 'Supabase', 'Vercel',
  ],
  strengths: [
    'End-to-end test automation architecture',
    'Cross-browser and mobile testing',
    'Building test frameworks from scratch',
    'Strong debugging and root cause analysis',
    'Bilingual communication (Spanish + English)',
  ],
  weaknesses: [
    'Limited AWS/cloud infrastructure experience',
    'No formal CS degree (self-taught + bootcamp)',
    'Work permit requires LMIA sponsorship',
  ],
}

/**
 * Build the JD analysis prompt for Cortana.
 * @param {string} jdText - The raw Job Description text
 * @param {string} company - Company name
 * @param {string} role - Role title
 * @returns {string} The prompt to send to Cortana
 */
export function buildJDAnalysisPrompt(jdText, company, role) {
  return `Analiza esta vacante contra el perfil de Gibran. Responde EN ESPAÑOL, de forma directa y útil.

## PERFIL DE GIBRAN
- ${GIBRAN_PROFILE.title} | ${GIBRAN_PROFILE.location}
- ${GIBRAN_PROFILE.yearsExperience} años de experiencia
- Skills principales: ${GIBRAN_PROFILE.coreSkills.join(', ')}
- Herramientas: ${GIBRAN_PROFILE.tools.join(', ')}
- Fortalezas: ${GIBRAN_PROFILE.strengths.join('; ')}
- Debilidades conocidas: ${GIBRAN_PROFILE.weaknesses.join('; ')}
- Status migratorio: ${GIBRAN_PROFILE.status}

## VACANTE: ${company} — ${role}
${jdText}

## INSTRUCCIONES
Responde con esta estructura exacta:

**MATCH SCORE: [0-100]%**

**KEYWORDS QUE COINCIDEN:**
- Lista de skills/tecnologías del JD que Gibran SÍ tiene

**KEYWORDS FALTANTES:**
- Lista de skills/tecnologías del JD que Gibran NO tiene o no ha mencionado

**RED FLAGS:**
- Requisitos que podrían ser deal-breakers (visa, nivel senior extremo, tecnología desconocida)

**RESUMEN EJECUTIVO:**
Un párrafo directo (estilo Cortana) diciendo qué tan viable es esta vacante y qué debería preparar para la entrevista.

**ACCIÓN RECOMENDADA:**
- Aplicar ya / Aplicar pero ajustar CV / Pasar de esta / Agregar a wishlist

Sé honesta y directa. Si no es un buen fit, dilo sin rodeos.`
}

/**
 * Parse match score from Cortana's response text.
 * Looks for "MATCH SCORE: XX%" pattern.
 * @param {string} responseText - Cortana's full response
 * @returns {number|null} Match score 0-100 or null if not found
 */
export function parseMatchScore(responseText) {
  const match = responseText.match(/MATCH\s*SCORE[:\s]*(\d{1,3})%/i)
  if (match) {
    const score = parseInt(match[1], 10)
    return score >= 0 && score <= 100 ? score : null
  }
  return null
}

export { GIBRAN_PROFILE }
