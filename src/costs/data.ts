// Ground-up annual running-cost estimate for Reitweg 25.
// Every figure is computed [C] or a sourced-range estimate [E]; 2025/26 prices, gross.

export type CostGroup = 'Upkeep reserve' | 'Energy' | 'Labor & grounds' | 'Tax & insurance' | 'Utilities & other'

export interface CostItem {
  label: string
  basis: string
  low: number
  point: number
  high: number
  group: CostGroup
  computed?: boolean
  src?: number
}

export const COSTS: CostItem[] = [
  { label: 'Grundsteuer (property tax)', basis: 'Bavaria area model · Bernried 340% Hebesatz (official Satzung)', low: 1109, point: 1109, high: 1109, group: 'Tax & insurance', computed: true, src: 1 },
  { label: 'Insurance (buildings + liability + contents)', basis: 'Rebuild value ~€2–3M; +Elementar, Privathaftpflicht, Hausrat', low: 1800, point: 2990, high: 5770, group: 'Tax & insurance', src: 2 },
  { label: 'Heating — gas', basis: '~488 m² + guest house × 139 kWh/m² × ~€0.10/kWh', low: 7014, point: 9908, high: 11809, group: 'Energy', computed: true, src: 3 },
  { label: 'Pool heating', basis: '16×4 m outdoor; cover saves ~€3k/season', low: 1430, point: 1700, high: 5500, group: 'Energy', src: 4 },
  { label: 'Electricity', basis: 'Villa + pool pump + electric sauna; ~10–18k kWh', low: 2660, point: 4000, high: 6660, group: 'Energy', src: 5 },
  { label: 'Water + wastewater', basis: 'Fresh €1.14/m³ + Grundgebühr; Abwasser €4.52/m³ (official rates)', low: 1100, point: 1600, high: 2400, group: 'Utilities & other', src: 6 },
  { label: 'Chimney sweep', basis: 'Mandatory; gas + open + gas fireplaces', low: 135, point: 175, high: 250, group: 'Utilities & other', computed: true, src: 7 },
  { label: 'Waste (Müllgebühren)', basis: 'Landkreis Weilheim-Schongau', low: 300, point: 420, high: 560, group: 'Utilities & other', src: 8 },
  { label: 'Garden maintenance', basis: '3,887 m² park-like estate; ~80–220 h × €50/h', low: 4000, point: 7000, high: 11000, group: 'Labor & grounds', src: 9 },
  { label: 'Pool service', basis: 'Seasonal open/close + chemicals (excl. energy)', low: 500, point: 900, high: 1400, group: 'Labor & grounds', src: 4 },
  { label: 'Housekeeping', basis: '488 m² + guest house; ~8–16 h/wk (Minijob→agency)', low: 6400, point: 10000, high: 24000, group: 'Labor & grounds', src: 10 },
  { label: 'Maintenance reserve', basis: 'Building ~€1.5–2.2M; Peters’sche Formel / 1–1.5%', low: 18000, point: 28000, high: 41000, group: 'Upkeep reserve', computed: true, src: 11 },
  { label: 'Heating service + alarm + internet + Rundfunk', basis: 'Boiler service, Telenot monitoring, fibre+TV, €18.36/mo licence', low: 1435, point: 1870, high: 2370, group: 'Utilities & other', src: 12 },
]

export const GROUP_COLORS: Record<CostGroup, string> = {
  'Upkeep reserve': '#7f1d1d',
  'Energy': '#ea580c',
  'Labor & grounds': '#ca8a04',
  'Tax & insurance': '#245772',
  'Utilities & other': '#5a8f4a',
}

export const TOTALS = {
  allIn: { low: 45900, point: 69700, high: 113800 },
  cash: { low: 27900, point: 41700, high: 72800 }, // excludes the maintenance-reserve set-aside
  reserve: 28000,
  pctOfPrice: 0.71, // point all-in / €9.75M
}

export const GRUNDSTEUER = {
  result: 1109,
  steps: [
    { label: 'Land', calc: '3,887 m² × €0.04/m²', value: '€155.48' },
    { label: 'Building', calc: '488 m² × €0.50/m² × 70% (residential)', value: '€170.80' },
    { label: 'Messbetrag', calc: '€155.48 + €170.80', value: '€326.28' },
    { label: 'Grundsteuer', calc: '€326.28 × 340% (Bernried Hebesatz)', value: '€1,109/yr' },
  ],
  note: 'Bavaria’s Grundsteuer is purely area-based since 2025 — it does NOT scale with the €9.75M price. Bernried’s Hebesatz is 340% per the official Hebesatzsatzung (effective 1 Jan 2025); the 320% still shown on tax-comparison sites is the superseded pre-reform rate.',
}

export const EXEC_SUMMARY = `Running this house costs an estimated **~€70,000 a year, all-in** — about 0.71% of the €9.75M price. Roughly €42,000 of that is actual cash out the door; the rest (~€28,000) is a maintenance reserve you set aside for the lumpy reality of keeping a premium, 1970-built, 488 m² villa in top condition (the Peters’sche Formel and the 1–1.5%-of-rebuild-value rule both land there).

Where the money goes: the upkeep reserve and labor dominate. Energy is the biggest hard bill — ~€10k/yr to heat 488 m² at energy class E on gas, plus ~€1,700 to heat the outdoor pool (a cover swings that by ~€3k). Housekeeping for the main house + guest house runs ~€10k, and roughly doubles if you go above the Minijob cap to an agency. The 3,887 m² park-like garden is ~€7k.

The pleasant surprise is property tax: Bavaria’s new area-based Grundsteuer is just ~€1,109/year and doesn’t scale with the €9.75M value at all. Insurance (buildings + liability + contents) is ~€3,000.

The biggest swings are housekeeping intensity (€6k–24k), the maintenance reserve (€18k–41k), and pool heating — together they stretch the all-in range to roughly €46k–€115k.

Excluded: financing/interest, capex/renovations, contents cover for art, and a precise flood-class (Elementar) rate. Both local figures are now confirmed from Bernried’s own bylaws — the Grundsteuer Hebesatz is 340% (the 320% on comparison sites is the pre-reform rate) and fresh water is €1.14/m³ — so everything here is computed or sourced.`

export const ASSUMPTIONS = [
  'Grundsteuer uses Bernried’s official 340% Hebesatz (Hebesatzsatzung, effective 1 Jan 2025) on the Bavarian area model — the 320% on comparison sites is the superseded pre-reform rate.',
  'Fresh water is Bernried’s official €1.14/m³ (BGS-WAS §10) + ~€41–80/yr Grundgebühr by meter size; wastewater is €4.52/m³ (Abwasserverband Starnberger See), with garden/pool water on a separate Gartenzähler exempt from the wastewater charge.',
  'Pool heating assumes a cover at low/point; without one, add ~€3,000.',
  'Housekeeping above the Minijob cap (~10–12 h/wk) must move to an agency at €22–35/h all-in, which roughly doubles it.',
  'Maintenance reserve is a budget set-aside, not a guaranteed yearly bill — real repair spend is lumpy across years.',
]

export const SOURCES: { n: number; title: string; url: string }[] = [
  { n: 1, title: 'Bernried Hebesatzsatzung — Grundsteuer A & B 340% (official, effective 2025)', url: 'https://bernried.de/media/download/cms/media/files/rathaus/satzungen/grundsteuerhebesaetze/hebesatzsatzung-2025.pdf' },
  { n: 2, title: 'Finanztip — Wohngebäude / Elementar / Privathaftpflicht', url: 'https://www.finanztip.de/wohngebaeudeversicherungen/' },
  { n: 3, title: 'Gaspreis 2026 (Finanztip)', url: 'https://www.finanztip.de/gaspreisvergleich/gaspreis-gaskosten/' },
  { n: 4, title: 'Pool heating & service costs', url: 'https://www.primepool.de/ratgeber/pool-heizung-im-vergleich' },
  { n: 5, title: 'Strompreis 2026 (strom-report)', url: 'https://strom-report.com/strompreise/' },
  { n: 6, title: 'Bernried BGS-WAS — fresh water €1.14/m³ + Grundgebühr (§§9a–10)', url: 'https://bernried.de/media/download/cms/media/files/rathaus/buergerservice/satzungen/bgs-was/2024-10-18-beitrags-und-gebuehrensatzung.pdf' },
  { n: 7, title: 'Schornsteinfeger KÜO Gebührentabelle', url: 'https://www.gesetze-im-internet.de/k_o/' },
  { n: 8, title: 'Landkreis Weilheim-Schongau Abfallgebühren', url: 'https://www.weilheim-schongau.de/' },
  { n: 9, title: 'Gartenpflege Kosten (rates)', url: 'https://handwerkerkosten.net/gartenpflege-kosten/' },
  { n: 10, title: 'Haushaltshilfe Kosten (Finanztip)', url: 'https://www.finanztip.de/haushaltshilfe-kosten/' },
  { n: 11, title: 'Peters’sche Formel / Instandhaltungsrücklage', url: 'https://www.haufe.de/id/beitrag/erhaltungsruecklage-32-peterssche-formel-HI14945423.html' },
  { n: 12, title: 'Rundfunkbeitrag €18.36/mo', url: 'https://www.finanztip.de/rundfunkbeitrag' },
  { n: 13, title: 'Abwasserverband Starnberger See — wastewater €4.52/m³', url: 'https://www.av-starnberger-see.de/beitraege-gebuehren.html' },
]
