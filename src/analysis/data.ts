// All figures + sources for the Reitweg 25 real estate analysis.
// Discipline: every market number is sourced (see SOURCES) or flagged as an estimate.
// German sold prices are private — portal/agent figures are ASKING prices unless noted.

export interface Source {
  n: number
  title: string
  url: string
}

export const PRICE = {
  asking: 9_750_000,
  commissionPct: 2.38,
  commission: 232_050, // 2.38% of 9.75M
  total: 9_982_050,
  livingM2: 488,
  usableM2: 781,
  plotM2: 3_887,
  perM2Living: 19_980, // 9,750,000 / 488
  perM2Usable: 12_484, // 9,750,000 / 781
  perM2Plot: 2_508, // 9,750,000 / 3,887 (whole price over land — crude)
}

export const PROPERTY_STATS: { label: string; value: string; note?: string }[] = [
  { label: 'Asking price', value: '€9.75M', note: '+2.38% buyer commission ≈ €232k' },
  { label: 'Living area', value: '488 m²', note: 'Wohnfläche' },
  { label: 'Usable area', value: '781 m²', note: 'incl. spa house, cellar' },
  { label: 'Plot', value: '3,887 m²', note: 'borders protected park' },
  { label: 'Built / renovated', value: '1970 / 2017–18', note: 'core renovation' },
  { label: 'Bedrooms / baths', value: '4 / 3', note: '6 rooms + wine cellar' },
  { label: 'Pool', value: '16 × 4 m', note: 'heated outdoor' },
  { label: 'Energy class', value: 'E', note: '139 kWh/m², gas' },
]

// West-bank town house ASKING €/m² (mid-points; immoverkauf24 / immowelt / E&V, 2025–26).
export const TOWN_BENCHMARKS: { town: string; perM2: number; note?: string }[] = [
  { town: 'Bernried', perM2: 6_400, note: 'cheapest of the seven' },
  { town: 'Seeshaupt', perM2: 6_780 },
  { town: 'Tutzing', perM2: 7_580 },
  { town: 'Berg', perM2: 8_240 },
  { town: 'Pöcking', perM2: 8_140 },
  { town: 'Feldafing', perM2: 8_270 },
  { town: 'Starnberg', perM2: 8_803, note: 'E&V, Jun 2026' },
]

export interface Comp {
  town: string
  price: number
  livingM2: number
  plotM2: number | null
  perM2: number
  proximity: 'Waterfront' | 'Lake view' | 'Near-lake' | 'Inland'
  built: string
  note: string
  subject?: boolean
  outlier?: boolean
}

// Active asking-price comps (Jun 2026). €/m² computed on living area.
export const COMPS: Comp[] = [
  { town: 'Feldafing', price: 3_875_000, livingM2: 355, plotM2: 696, perM2: 10_915, proximity: 'Lake view', built: '2021', note: 'New, EEK A+, 360° roof terrace' },
  { town: 'Berg', price: 7_950_000, livingM2: 700, plotM2: 5_058, perM2: 11_357, proximity: 'Waterfront', built: '1962 / redev.', note: 'East shore; 5,058 m² redevelopment plot' },
  { town: 'Pöcking', price: 3_590_000, livingM2: 275, plotM2: 843, perM2: 13_055, proximity: 'Waterfront', built: '2025', note: 'New Japandi build, 9×3 m pool' },
  { town: 'Tutzing', price: 6_390_000, livingM2: 460, plotM2: 2_001, perM2: 13_891, proximity: 'Lake view', built: '2020', note: 'Architect English country house, guest apt' },
  { town: 'Pullach', price: 10_900_000, livingM2: 599, plotM2: 2_831, perM2: 18_197, proximity: 'Inland', built: 'classic', note: 'Isar high-bank estate — Munich-edge ceiling' },
  { town: 'Bernried', price: 9_750_000, livingM2: 488, plotM2: 3_887, perM2: 19_980, proximity: 'Near-lake', built: '1970 / 2018', note: 'The subject — design villa, park border, spa house', subject: true },
  { town: 'Söcking', price: 6_000_000, livingM2: 232, plotM2: null, perM2: 25_862, proximity: 'Inland', built: 'historic', note: 'Heritage hunting lodge on parkland (small living area)', outlier: true },
  { town: 'Söcking', price: 9_500_000, livingM2: 282, plotM2: null, perM2: 33_688, proximity: 'Inland', built: 'historic', note: 'Heritage lodge + parkland (€/m² inflated by tiny living area)', outlier: true },
]

// Engel & Völkers Starnberg — house ASKING €/m² (the rate-cycle story). [src 6]
export const TREND: { year: string; perM2: number; label?: string }[] = [
  { year: '2021', perM2: 9_594, label: 'peak' },
  { year: '2022', perM2: 8_900 },
  { year: '2023', perM2: 8_050 },
  { year: '2024', perM2: 7_623, label: 'trough −20%' },
  { year: '2025', perM2: 8_250 },
  { year: '2026', perM2: 8_803, label: 'recovered' },
]

// Positioning tiers (€/m² of living area) — where the subject sits in the market.
export const TIERS: { label: string; lo: number; hi: number; color: string }[] = [
  { label: 'Ordinary house', lo: 4_400, hi: 7_850, color: '#9ca3af' },
  { label: 'Top town', lo: 7_600, hi: 9_600, color: '#60a5fa' },
  { label: 'Near-lake luxury', lo: 11_000, hi: 14_000, color: '#34d399' },
  { label: 'Direct waterfront', lo: 15_000, hi: 22_000, color: '#f59e0b' },
]

export const MARKET_FACTS: { stat: string; label: string; src?: number }[] = [
  { stat: '#1', label: 'Landkreis Starnberg — highest purchasing power of ~400 German districts (€38,702/capita, +39% vs national)', src: 3 },
  { stat: '~30 min', label: 'S-Bahn / direct RB66 to Munich — premium core of the commuter belt' },
  { stat: '−20%', label: 'Starnberg house asking prices, 2021 peak → 2024 trough (rate shock), now recovered to €8,803/m²', src: 6 },
  { stat: '+7.7%', label: 'Starnberger See prices YoY, H1 2025 — prime lakeside recovered faster than the German market', src: 17 },
  { stat: '1.7 km', label: 'of undeveloped, perpetually-protected Bernrieder Park lakeshore a few minutes away', src: 13 },
]

export const DRIVERS: { title: string; body: string; src?: number }[] = [
  {
    title: 'Permanent no-build neighbor (strongest driver)',
    body:
      'The bordering Bernrieder Park is locked against development by three independent layers: a perpetual foundation charter ("may never be subdivided, built upon or settled"), Landschaftsschutzgebiet status since 1959, and monument protection since 1992. Open-space research finds permanent protected space lifts adjacent values ~3× more than merely-developable open space — buyers pay for the guaranteed absence of future development.',
    src: 13,
  },
  {
    title: 'Rare undeveloped near-lake access',
    body:
      'Over 1.7 km of the park’s Starnberger See shoreline is undeveloped with public bathing coves — minutes’ walk away. Undeveloped lakeshore is exceptionally scarce on a lake whose frontage is largely state-owned and built up.',
    src: 13,
  },
  {
    title: 'Architect-grade design',
    body:
      'The 2017/18 core renovation is by Landau + Kindelbacher, an award-laden Munich firm (ICONIC, German Design Award, SBID Global Winner). A pedigreed "Unikat" design is widely held to be more value-stable, though no credible study quantifies the resale premium — treat it as real but unquantified.',
    src: 11,
  },
  {
    title: 'Large plot + flexible space',
    body:
      'A 3,887 m² park-like plot, a self-contained two-storey spa/guest house, 781 m² usable area, and a permitted ~40 m² winter-garden extension (approved to 2029) add optionality rarely available near the lake.',
  },
]

export const DETRACTORS: { title: string; body: string; src?: number }[] = [
  {
    title: 'Near-lake, not waterfront',
    body:
      'The single biggest price driver on this lake is direct frontage, which commands roughly +60% to +200% over near-lake and is extremely scarce (~1–2 sales/year). The villa is a few minutes’ walk from the shore, so it forgoes the trophy-tier scarcity premium and competes in the deeper near-lake tier.',
    src: 20,
  },
  {
    title: 'Energy class E — average, for a luxury asset',
    body:
      'E (139 kWh/m²) is literally mid-scale; prime buyers increasingly expect A–C. A heat-pump conversion of a large 1970 villa realistically needs envelope work — plausibly €100k+ all-in (informed estimate, not a quote). The 2017/18 renovation reaching only E is a signal the thermal envelope/heat source weren’t fully modernized.',
    src: 19,
  },
  {
    title: 'Gas heating — a manageable, often-overstated risk',
    body:
      'Germany’s building-energy law grandfathers the working gas system (no rip-out; fossil fuels allowed until end-2044), and condensing boilers are exempt from the 30-year replacement rule — so the headline "gas ban" risk is largely defused. Confirm the boiler type and renovation scope before bidding.',
    src: 17,
  },
  {
    title: '"Franz Ruf" attribution unverified',
    body:
      'The 1970 design is attributed to Franz Ruf (brother of the canonical modernist Sep Ruf) by the exposé only; his documented works list no Bernried villa. Sep Ruf’s fame is a name association, not a credential of this house. The verifiable design credit is the Landau + Kindelbacher renovation.',
    src: 10,
  },
]

export const EXEC_SUMMARY = `Reitweg 25 is a singular trophy asset, and its €9.75M asking price reflects that — not the Bernried market median. On living area (488 m²) the ask is ~€19,980/m²: roughly 2.5–3× ordinary Bernried houses (~€6,400/m², the cheapest of the west-bank towns) and about double the priciest west-bank town, Starnberg (~€8,800/m²). That headline overstates the case, because the price is spread across a rare 3,887 m² plot bordering the permanently-protected Bernrieder Park. On usable area (781 m²) it is ~€12,480/m² — squarely inside the €11,000–18,000/m² band where renovated, near-lake luxury villas actually trade.

The region’s fundamentals are strong: Landkreis Starnberg is Germany’s #1 district for purchasing power, supply is throttled by a state-owned, largely-protected shoreline, and prime lakeside property corrected less and recovered faster than the German market through the 2022–24 rate shock.

The strongest, best-evidenced value driver is permanence: the bordering park is locked against development by a perpetual foundation charter plus landscape and monument protection, with rare undeveloped lakeshore minutes away. The award-winning Landau + Kindelbacher renovation adds a real but unquantifiable premium.

The honest detractors: it is near-lake, not direct waterfront, so it forgoes the scarcity premium that defines the very top of this market; energy class E is merely average for a luxury asset, and a heat-pump retrofit could run six figures; and the "Franz Ruf" design attribution is unverified.

Bottom line: it is priced like the top of the near-lake tier, not the waterfront-trophy tier it doesn’t occupy. Defensible for a buyer who prizes the protected setting and the architecture; aggressive on a pure living-area €/m² basis. Pull the official parcel land value (BORIS-Bayern) before bidding.`

export const METHOD_NOTE = `Germany does not publish per-property sold prices, so every €/m² home figure here is an ASKING price from listing portals or agents (which run above achieved prices), unless labelled an official index. Comparables are real, currently-listed properties with source links. The official parcel land value (Bodenrichtwert) for this plot is not public — it must be read from BORIS-Bayern/BayernAtlas; the €610/m² figure circulating online is a Weilheim-Schongau district average and is not this property’s land value. Fair-value framing is a reasoned inference from comparables and drivers, not a formal appraisal.`

export const SOURCES: Source[] = [
  { n: 3, title: 'NIQ/GfK Kaufkraft 2024 — Starnberg #1 of 400 districts (€38,702/capita)', url: 'https://nielseniq.com/global/de/news-center/2024/kaufkraft-der-deutschen-steigt-2024-auf-27-848-euro/' },
  { n: 6, title: 'Engel & Völkers Starnberg — house asking €/m², 5-yr peak/trough/recovery', url: 'https://www.engelvoelkers.com/de-de/immobilienpreise/bayern/starnberg/' },
  { n: 13, title: 'Bernrieder Park — foundation statute, protected status, 1.7 km undeveloped shore', url: 'https://www.bernrieder-park.de/' },
  { n: 17, title: 'vdpResearch / von Poll — Starnberger See price recovery (+7.7% H1 2025)', url: 'https://www.asscompact.de/nachrichten/ein-blick-auf-die-immobilienpreise-deutschen-seen' },
  { n: 11, title: 'Landau + Kindelbacher — awards / firm profile', url: 'https://www.landaukindelbacher.de/en/awards/' },
  { n: 10, title: 'Franz Ruf (architect) — documented works (no Bernried villa)', url: 'https://de.wikipedia.org/wiki/Franz_Ruf_(Architekt)' },
  { n: 19, title: 'Energy efficiency classes + heat-pump retrofit cost (Germany)', url: 'https://www.co2online.de/modernisieren-und-bauen/waermepumpe/' },
  { n: 20, title: 'Starnberger See waterfront vs near-lake premium (broker market note)', url: 'https://www.ftimmobilien24.com/immobilienmakler-m%C3%BCnchen/immobilienmakler-starnberg/immobilienpreise-starnberg-2025/' },
  { n: 1, title: 'immoverkauf24 (Sprengnetter) — west-bank town asking €/m²', url: 'https://www.immoverkauf24.de/immobilienpreise/bayern/weilheim-schongau-kreis/bernried-am-starnberger-see/' },
  { n: 7, title: 'destatis Häuserpreisindex — −8.4% in 2023 (national context)', url: 'https://www.destatis.de/DE/Presse/Pressemitteilungen/2023/12/PD23_498_61262.html' },
  { n: 14, title: 'vdp property price index — prime resilience through the rate cycle', url: 'https://www.pfandbrief.de/en/vdp-property-price-index-property-prices-end-2023-down-7-2/' },
  { n: 21, title: 'Riedel Immobilien × Christie’s International Real Estate — listing & affiliation', url: 'https://www.riedel-immobilien.de/en/properties/in-an-unspoilt-idyllic-location-by-bernrieder-park-designer-villa-with-pool-spa-and-guest-apartment_11336.php' },
  { n: 9, title: 'BORIS-Bayern — official Bodenrichtwert (parcel land value) portal', url: 'https://www.bodenrichtwerte.bayern.de' },
]
