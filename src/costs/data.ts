// Annual running cost of Reitweg 25 — built from the OWNER'S OWN operating-cost
// statement (16 line items, average monthly costs; provided privately, dated Dec 2025,
// "without guarantee, subject to change"). Monthly figures are annualized ×12.
// The only line we add is a capital-repair reserve — the owner's sheet explicitly
// excludes repairs — and it is flagged `estimate`.

export type CostGroup =
  | 'Labor & grounds'
  | 'Energy'
  | 'Water & sewer'
  | 'Tax & insurance'
  | 'Services & media'
  | 'Repair reserve'

export interface CostItem {
  label: string
  monthly: number | null // owner-reported €/month (null for our reserve add-on)
  annual: number
  group: CostGroup
  basis: string
  estimate?: boolean // true = our addition, not on the owner's sheet
}

// Owner's 16 line items, ordered by annual cost; reserve add-on last.
export const COSTS: CostItem[] = [
  { label: 'Garden maintenance', monthly: 1551.52, annual: 18618, group: 'Labor & grounds', basis: 'Full crew on the 3,887 m² park — pruning, mowing, plant & herb-garden care, paths' },
  { label: 'Housekeeping incl. laundry', monthly: 1311.38, annual: 15737, group: 'Labor & grounds', basis: 'Billed by hours worked at €29/h + VAT' },
  { label: 'Gas (heating)', monthly: 1248.0, annual: 14976, group: 'Energy', basis: 'Monthly advance; heats the 488 m² villa + pool' },
  { label: 'Electricity', monthly: 412.0, annual: 4944, group: 'Energy', basis: 'Monthly advance payment' },
  { label: 'Swimming pool', monthly: 370.68, annual: 4448, group: 'Labor & grounds', basis: 'Commissioning, winterization, monthly inspection, consumables (energy is in gas/electric)' },
  { label: 'Building insurance', monthly: 327.87, annual: 3934, group: 'Tax & insurance', basis: 'Wohngebäudeversicherung' },
  { label: 'Sewage charges', monthly: 252.37, annual: 3028, group: 'Water & sewer', basis: 'As itemized by the owner' },
  { label: 'Wastewater charges', monthly: 235.66, annual: 2828, group: 'Water & sewer', basis: 'As itemized by the owner' },
  { label: 'Alarm system', monthly: 145.27, annual: 1743, group: 'Services & media', basis: 'Monitoring + maintenance' },
  { label: 'Heating maintenance', monthly: 122.17, annual: 1466, group: 'Services & media', basis: 'Service contract, excluding repairs' },
  { label: 'Window/door maintenance', monthly: 96.75, annual: 1161, group: 'Services & media', basis: 'Service contract, excluding repairs' },
  { label: 'Property tax (Grundsteuer)', monthly: 86.29, annual: 1035, group: 'Tax & insurance', basis: 'Bavaria area model — see derivation below' },
  { label: 'Landline telephone', monthly: 67.82, annual: 814, group: 'Services & media', basis: 'Festnetz' },
  { label: 'Internet (M-Net)', monthly: 45.21, annual: 543, group: 'Services & media', basis: 'Fibre' },
  { label: 'Broadcasting fee (ARD/ZDF)', monthly: 18.36, annual: 220, group: 'Services & media', basis: 'Rundfunkbeitrag, €18.36/mo' },
  { label: 'Cable TV (Vodafone)', monthly: 15.99, annual: 192, group: 'Services & media', basis: 'TV service' },
  { label: 'Capital-repair reserve', monthly: null, annual: 28000, group: 'Repair reserve', basis: "NOT on the owner's sheet — set-aside for big-ticket repairs (roof, façade, technical systems). Peters'sche Formel / 1–1.5% of ~€1.5–2.2M rebuild", estimate: true },
]

export const GROUP_COLORS: Record<CostGroup, string> = {
  'Labor & grounds': '#ca8a04',
  'Energy': '#ea580c',
  'Water & sewer': '#0891b2',
  'Tax & insurance': '#245772',
  'Services & media': '#5a8f4a',
  'Repair reserve': '#7f1d1d',
}

export const TOTALS = {
  monthly: 6307, // owner-reported average €/month (exact €6,307.34)
  operating: 75688, // owner total ×12, excludes capital repairs
  reserve: { low: 18000, point: 28000, high: 41000 },
  allIn: { low: 93700, point: 103700, high: 116700 }, // operating + reserve
  discretionary: 34355, // garden + housekeeping
  core: 41333, // operating − discretionary
  pctOperating: 0.78, // operating / €9.75M
  pctAllIn: 1.06, // all-in point / €9.75M
}

export const GRUNDSTEUER = {
  result: 1035,
  steps: [
    { label: 'Land', calc: '3,887 m² × €0.04/m²', value: '€155.48' },
    { label: 'Building', calc: '488 m² × €0.50/m² × 70% (residential)', value: '€170.80' },
    { label: 'Messbetrag', calc: '€155.48 + €170.80', value: '€326.28' },
    { label: 'Grundsteuer', calc: '€326.28 × ~320–340% (Bernried Hebesatz)', value: '€1,044–1,109' },
  ],
  note: "The owner's sheet reports €1,035/yr; the Bavarian area model independently derives ~€1,044–1,109. Both confirm property tax is ~€1,000/yr and — unlike the price — does NOT scale with the €9.75M value. (Bavaria's Grundsteuer has been purely area-based since 2025.)",
}

export const EXEC_SUMMARY = `The owner reports an average **€6,307 a month — €75,688 a year** — to run Reitweg 25. These are operating costs only: the sheet's maintenance lines are explicitly "excluding repairs." That's about 0.78% of the €9.75M price.

Two line items dominate and are largely discretionary: the **garden at €18,618/yr** (a full crew on the 3,887 m² park) and **housekeeping at €15,737/yr** (incl. laundry, billed at €29/h + VAT). Together they are €34,355 — **45% of the bill** — and a new owner could dial that service level up or down. Strip them out and the core, hard-to-avoid operating cost is **~€41,300/yr**.

Energy is the largest fixed cost: **gas €14,976/yr** (heating the 488 m² villa + pool) plus **electricity €4,944**. Water and sewer run €5,856, building insurance €3,934, and the alarm/maintenance/telecom block ~€6,100. **Property tax is just €1,035/yr** — Bavaria's area model doesn't scale with the €9.75M value (an independent derivation lands at ~€1,044–1,109, confirming it).

What the sheet does NOT include is **capital repairs**. For a premium 1970-built villa, a prudent reserve for the lumpy big-ticket items (roof, façade, technical systems) is ~€18–41k/yr. Adding the ~€28k midpoint puts the true all-in carrying cost near **~€104,000/yr (~1.1%)**.

These are the owner's own averaged figures ("without guarantee, subject to change"), annualized ×12.`

export const ASSUMPTIONS = [
  "Figures are the owner's averaged monthly operating costs (statement dated Dec 2025, marked “without guarantee, subject to change”), annualized ×12.",
  "They exclude capital repairs — the heating and window/door maintenance lines are explicitly “excluding repairs.” The €18–41k/yr repair reserve is our addition, not the owner's.",
  'Garden (€18.6k) and housekeeping (€15.7k) reflect the current premium service level and are largely discretionary — a new owner could spend materially less or more.',
  "Fresh-water supply isn't a separate line on the owner's sheet; the two charges shown (wastewater €2,828 + sewage €3,028) total €5,856/yr.",
  "The owner's property tax (€1,035/yr) sits just below the area-model derivation (~€1,044–1,109) — consistent, and trivial against the price either way.",
]

export const SOURCES: { n: number; title: string; url: string }[] = [
  { n: 1, title: "Owner's operating-cost statement (Dec 2025) — provided privately, not public", url: '' },
  { n: 2, title: 'Bernried Hebesatzsatzung — Grundsteuer Hebesatz (official)', url: 'https://bernried.de/media/download/cms/media/files/rathaus/satzungen/grundsteuerhebesaetze/hebesatzsatzung-2025.pdf' },
  { n: 3, title: "Peters'sche Formel / Instandhaltungsrücklage (repair reserve)", url: 'https://www.haufe.de/id/beitrag/erhaltungsruecklage-32-peterssche-formel-HI14945423.html' },
]
