# Sprint 3: Cortana Intelligence

## Objetivo
Que Gibran pueda decirle a Cortana: "Oye, que me toca hacer hoy?" y que ella
lea los eventos de Appwrite y de un resumen inteligente con sugerencias de
optimizacion.

---

## 1. El Shell (UI/UX)

- **Componente**: `CortanaSidebar.jsx` — panel colapsable a la derecha del dashboard
- **Estilo**: Look Cyberpunk/Minimalista (transparencias, bordes neon sutiles)
- **Interaccion**: Lista de mensajes con scroll automatico + input de texto (Enter para enviar)

## 2. El Cerebro (Model Integration)

- **Conector**: `src/lib/aiClient.js`
- **Prioridad 1**: Conexion local via Ollama (Gemma 4)
- **Fallback**: Configuracion para Gemini API si el local no responde
- **System Prompt**: Cortana debe tener personalidad — directa, motivadora,
  con toque mexicano (wey, compa) pero profesional en lo tecnico.
  Sabe que Gibran es QA Engineer en Vancouver.

## 3. Memoria y Contexto (The "Magic")

- **Prompt Builder**: Antes de cada mensaje, inyectar contexto actual:
  - Hora y fecha en Vancouver
  - Proximos 3 eventos del calendario (especialmente medicamentos)
  - Status de metas de PR (Immigration Goals)
- **Store**: `src/store/cortanaStore.js` — historial de conversacion y estados de carga

## 4. Action Engine (JSON Output)

- Cortana no solo habla, actua. Implementar un ActionParser:
  - Si Cortana sugiere un cambio (ej. "Quieres que bloquee tiempo para CosmoTarot?"),
    debe enviar un bloque JSON oculto
  - La UI muestra una "Action Card" con botones de Aceptar o Rechazar
  - Si acepta, el calendarEventStore actualiza Appwrite automaticamente

## 5. Archivos a crear/modificar

| Archivo                              | Tipo     | Descripcion                              |
|--------------------------------------|----------|------------------------------------------|
| `src/components/cortana/CortanaSidebar.jsx` | Crear   | UI del sidebar de chat                  |
| `src/store/cortanaStore.js`          | Crear    | Historial de chat + estados de carga     |
| `src/lib/cortanaPromptBuilder.js`    | Crear    | Inyeccion de contexto al system prompt   |
| `src/lib/cortanaActionParser.js`     | Crear    | Parser de bloques JSON de acciones       |
| `src/lib/aiClient.js`               | Crear    | Conector Ollama (Gemma 4) + fallback Gemini |
| `src/components/Layout.jsx`          | Modificar| Integrar CortanaSidebar                  |
| `src/components/Header.jsx`          | Modificar| Toggle de Cortana sidebar                |
