import { describe, it, expect } from 'vitest'
import { toCsv } from './csv.js'

describe('toCsv', () => {
  const columns = [
    { label: 'Code', value: (r) => r.code },
    { label: 'Note', value: (r) => r.note },
  ]

  it('génère un en-tête puis une ligne par élément', () => {
    const csv = toCsv([{ code: 'V-01', note: 5 }, { code: 'V-02', note: 3 }], columns)
    expect(csv).toBe('Code,Note\r\nV-01,5\r\nV-02,3')
  })

  it('échappe les valeurs contenant une virgule ou un guillemet', () => {
    const csv = toCsv([{ code: 'V-01', note: 'Bien joué, "top" service' }], columns)
    expect(csv).toBe('Code,Note\r\nV-01,"Bien joué, ""top"" service"')
  })

  it('convertit null/undefined en chaîne vide', () => {
    const csv = toCsv([{ code: 'V-01', note: null }], columns)
    expect(csv).toBe('Code,Note\r\nV-01,')
  })

  it('tableau vide -> seulement l’en-tête', () => {
    expect(toCsv([], columns)).toBe('Code,Note')
  })

  it('neutralise une valeur pouvant être interprétée comme une formule Excel', () => {
    const csv = toCsv([{ code: 'V-01', note: '=HYPERLINK("http://evil.test")' }], columns)
    expect(csv).toBe('Code,Note\r\nV-01,"\'=HYPERLINK(""http://evil.test"")"')
  })

  it('neutralise +, - et @ en tête de valeur', () => {
    expect(toCsv([{ code: '+1', note: 0 }], columns)).toBe("Code,Note\r\n'+1,0")
    expect(toCsv([{ code: '-1', note: 0 }], columns)).toBe("Code,Note\r\n'-1,0")
    expect(toCsv([{ code: '@cmd', note: 0 }], columns)).toBe("Code,Note\r\n'@cmd,0")
  })
})
