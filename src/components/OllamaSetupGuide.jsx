import { useState } from 'react'
import { checkOllamaStatus } from '../services/ollamaService'

function CodeBlock({ children }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border-mid)',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'var(--mono)',
      fontSize: 11,
      color: 'var(--teal)',
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

export default function OllamaSetupGuide({ onRetry }) {
  const [checking, setChecking] = useState(false)

  async function handleRetry() {
    setChecking(true)
    const { online, models } = await checkOllamaStatus()
    setChecking(false)
    onRetry?.({ online, models })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 24px',
      gap: 0,
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border-mid)',
        borderRadius: 14,
        borderTop: '2px solid var(--orange)',
        padding: '24px',
        maxWidth: 480,
        width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
            AI Assistant no disponible
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Para usar el asistente necesitas Ollama corriendo localmente
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'var(--text-dim)',
            marginBottom: 8,
          }}>
            1. TENER OLLAMA CORRIENDO
          </div>
          <CodeBlock>$ ollama serve</CodeBlock>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'var(--text-dim)',
            marginBottom: 8,
          }}>
            2. TENER EL MODELO INSTALADO
          </div>
          <CodeBlock>$ ollama pull gemma4:e4b</CodeBlock>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            descarga ~3.5GB — cierra otras apps
          </div>
        </div>

        <div style={{
          background: 'var(--orange-dim)',
          border: '1px solid var(--orange-mid)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 20,
          fontSize: 12,
          color: 'var(--orange)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <span>⚠️</span>
          <span>Con 8GB RAM: cierra Chrome extra, Spotify y otras apps antes de cargar el modelo</span>
        </div>

        <button
          onClick={handleRetry}
          disabled={checking}
          style={{
            width: '100%',
            padding: '11px',
            background: checking ? 'var(--bg3)' : 'var(--teal-dim)',
            border: `1px solid ${checking ? 'var(--border-mid)' : 'var(--teal-mid)'}`,
            borderRadius: 10,
            color: checking ? 'var(--text-dim)' : 'var(--teal)',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            fontWeight: 600,
            cursor: checking ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s',
            marginBottom: 12,
          }}
        >
          {checking ? 'Verificando...' : '↻ Reintentar conexión'}
        </button>

        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-dim)',
          fontFamily: 'var(--mono)',
        }}>
          El resto de la app funciona sin AI
        </div>
      </div>
    </div>
  )
}
