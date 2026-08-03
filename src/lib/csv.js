// Génération/téléchargement CSV côté client — aucune dépendance, aucun aller-retour
// serveur : les données sont déjà chargées (résultat de recherche du back-office).

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** @param {Array<object>} rows @param {Array<{label: string, value: (row: object) => unknown}>} columns */
export function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.value(row))).join(','))
  return [header, ...lines].join('\r\n')
}

/** BOM UTF-8 en préfixe : sans lui, Excel affiche mal les caractères accentués. */
export function downloadCsv(filename, csvContent) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
