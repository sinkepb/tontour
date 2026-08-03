import { describe, it, expect } from 'vitest'
import { SEGMENTS, segmentKeyForOrgType, findPlan } from './plans.js'

describe('segmentKeyForOrgType', () => {
  it('mappe boutique -> telecom', () => {
    expect(segmentKeyForOrgType('boutique')).toBe('telecom')
  })
  it('mappe mairie -> mairie', () => {
    expect(segmentKeyForOrgType('mairie')).toBe('mairie')
  })
  it('type inconnu ou absent retombe sur telecom', () => {
    expect(segmentKeyForOrgType('inconnu')).toBe('telecom')
    expect(segmentKeyForOrgType(undefined)).toBe('telecom')
  })
})

describe('findPlan', () => {
  it('retrouve un plan par segment + clé', () => {
    expect(findPlan('telecom', 'pro').name).toBe('Pro')
    expect(findPlan('mairie', 'intercommunalite').name).toBe('Intercommunalité')
  })
  it("retombe sur le premier plan du segment si la clé est inconnue", () => {
    expect(findPlan('telecom', 'inexistant')).toBe(SEGMENTS.telecom.plans[0])
  })
  it('retombe sur undefined si le segment est inconnu', () => {
    expect(findPlan('inexistant', 'starter')).toBeUndefined()
  })
})

// Données maintenues à la main et consommées à la fois par la landing page et par
// l'éligibilité au self-service (OnboardingPage) : une clé dupliquée ou un priceEur
// mal typé casserait silencieusement le wizard d'inscription plutôt que de crasher
// franchement, d'où ces tests d'intégrité.
describe('intégrité des données SEGMENTS', () => {
  for (const [segKey, seg] of Object.entries(SEGMENTS)) {
    it(`${segKey} : clés de plan uniques`, () => {
      const keys = seg.plans.map((p) => p.key)
      expect(new Set(keys).size).toBe(keys.length)
    })
    it(`${segKey} : priceEur numérique ou null sur chaque plan`, () => {
      seg.plans.forEach((p) => {
        expect(p.priceEur === null || typeof p.priceEur === 'number').toBe(true)
      })
    })
    it(`${segKey} : au moins un plan éligible au self-service (priceEur non null)`, () => {
      expect(seg.plans.some((p) => p.priceEur !== null)).toBe(true)
    })
  }
})
