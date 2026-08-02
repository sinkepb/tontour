const SERVICE_ICONS = [
  [/sav|panne|répar/i, '🔧'],
  [/vente|forfait/i, '🛒'],
  [/fidél|résilia/i, '🎁'],
  [/état civil|acte|mariage/i, '📜'],
  [/urban|permis/i, '🏗️'],
]

export function serviceIcon(nom = '') {
  return SERVICE_ICONS.find(([re]) => re.test(nom))?.[1] || '🎫'
}
