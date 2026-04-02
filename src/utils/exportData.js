// ─── Export Utilities ─────────────────────────────────────────────────────────

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export completed scheduler blocks as CSV
export function exportMetricsToCSV(blocks) {
  const done = blocks.filter((b) => b.status === 'done' || b.status === 'extended')
  const headers = [
    'fecha', 'dia', 'titulo', 'seccion', 'proyecto',
    'hora_inicio', 'hora_fin', 'min_planeados', 'min_reales', 'estado',
  ]
  const rows = done.map((b) => [
    b.timerStart ? new Date(b.timerStart).toISOString().split('T')[0] : '',
    DAY_LABELS[b.day] || '',
    b.title,
    b.section,
    b.projectId || '',
    b.startTime,
    b.endTime,
    b.duration,
    b.actualDuration ?? b.duration,
    b.status,
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const today = new Date().toISOString().split('T')[0]
  downloadFile(`gibran-os-metrics-${today}.csv`, csv, 'text/csv;charset=utf-8;')
}

// Export completed blocks + logs as JSON snapshot
export function exportMetricsToJSON(blocks, logs) {
  const payload = {
    exportedAt: new Date().toISOString(),
    blocks: blocks.filter((b) => b.status === 'done' || b.status === 'extended'),
    logs,
  }
  const today = new Date().toISOString().split('T')[0]
  downloadFile(`gibran-os-snapshot-${today}.json`, JSON.stringify(payload, null, 2), 'application/json')
}
