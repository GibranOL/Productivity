import { useState, useRef } from 'react'
import useDietStore from '../../store/dietStore'
import { parseMundoNutritionPDF } from '../../services/diet/pdfParser'
import { Card, Btn, SectionTitle, ProgressBar, Badge } from '../UI'

export default function DietUpload() {
  const addTemplate    = useDietStore((s) => s.addTemplate)
  const templates      = useDietStore((s) => s.templates)
  const deleteTemplate = useDietStore((s) => s.deleteTemplate)
  const updateTemplate = useDietStore((s) => s.updateTemplate)

  const [dragging, setDragging]   = useState(false)
  const [parsing, setParsing]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const [labelInput, setLabelInput] = useState('A')
  const fileRef = useRef(null)

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF.')
      return
    }
    setError(null)
    setResult(null)
    setParsing(true)
    setProgress(10)

    try {
      setProgress(30)
      const parsed = await parseMundoNutritionPDF(file)
      setProgress(80)

      addTemplate({
        label: labelInput,
        sourceFile: file.name,
        days: parsed.days,
        confidence: parsed.confidence,
        warnings: parsed.warnings,
        totalIngredients: parsed.totalIngredients,
      })

      setProgress(100)
      setResult(parsed)
    } catch (e) {
      setError(`Error al parsear: ${e.message}`)
    } finally {
      setParsing(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Upload zone */}
      <Card accent="teal">
        <SectionTitle>Subir PDF de Mundo Nutrition</SectionTitle>

        {/* Label selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['A', 'B', 'C'].map((l) => (
            <button
              key={l}
              onClick={() => setLabelInput(l)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8,
                border: `1px solid ${labelInput === l ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                background: labelInput === l ? 'var(--teal-dim)' : 'var(--bg3)',
                color: labelInput === l ? 'var(--teal)' : 'var(--text-dim)',
                fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800,
                cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              T{l}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--teal)' : 'var(--border-bright)'}`,
            borderRadius: 'var(--radius)',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--teal-dim)' : 'var(--bg3)',
            transition: 'var(--transition)',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600, color: dragging ? 'var(--teal)' : 'var(--text)' }}>
            {parsing ? 'Procesando...' : 'Arrastra tu PDF aquí'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            o toca para seleccionar archivo
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {/* Progress */}
        {parsing && (
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={progress} max={100} color="var(--teal)" />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--mono)' }}>
              Parseando PDF...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13, background: 'var(--red-dim)', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 12, background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>
              ✅ Template {labelInput} importado
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>
              {result.days.length} días · {result.totalIngredients} ingredientes parseados
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Confianza:</span>
              <ProgressBar value={result.confidence} max={100} color={result.confidence > 70 ? 'var(--green)' : 'var(--yellow)'} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: result.confidence > 70 ? 'var(--green)' : 'var(--yellow)' }}>
                {result.confidence}%
              </span>
            </div>
            {result.warnings.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--yellow)' }}>
                ⚠️ {result.warnings.length} líneas no parseadas
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Existing templates */}
      {templates.length > 0 && (
        <Card>
          <SectionTitle>Templates cargados</SectionTitle>
          <div className="stack" style={{ gap: 8 }}>
            {templates.map((t) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--teal-dim)', border: '1px solid var(--teal-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800, color: 'var(--teal)',
                }}>
                  {t.label}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.sourceFile || 'Mundo Nutrition'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {t.days?.length || 0} días · {t.confidence || 0}% conf · {new Date(t.parsedAt).toLocaleDateString('es')}
                  </div>
                </div>
                <Badge color={t.active ? 'teal' : 'yellow'}>{t.active ? 'Activo' : 'Inactivo'}</Badge>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
