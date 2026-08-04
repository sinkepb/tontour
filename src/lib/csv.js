// Génération/téléchargement CSV côté client — aucune dépendance, aucun aller-retour
// serveur : les données sont déjà chargées (résultat de recherche du back-office).

// Un motif client (`tickets.motif`) est repris tel quel dans l'export : sans ce garde-fou,
// une valeur commençant par =, +, - ou @ s'exécute comme une formule quand l'admin ouvre
// le CSV dans Excel/Sheets (injection de formule CSV). On neutralise en préfixant d'une
// apostrophe, convention standard qui force une lecture en texte brut.
const FORMULA_TRIGGER = /^[=+\-@]/

function csvEscape(value) {
  const raw = value == null ? '' : String(value)
  const s = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw
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
