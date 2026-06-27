// Default assumptions + sources for the financial-outlook simulator.
// Tax constants are sourced (see SOURCES); market return/vol are defensible planning
// defaults the user is meant to override — the whole point is to test different regimes.

import type { Inputs } from './engine'

export const DEFAULTS: Inputs = {
  horizon: 30,
  // House (EUR), all-in incl. 3.5% Grunderwerbsteuer + notary per the user's brief
  housePriceEur: 10_000_000,
  houseGrowth: 0.02,
  // Holdings (USD). SpaceX treated as public/liquid per the user; price is an assumption.
  spacexShares: 350_000,
  spacexPrice: 200,
  spacexBasisPerShare: 0,
  tslaValue: 700_000,
  tslaBasis: 350_000, // assume ~50% basis; user should set actual
  googValue: 150_000,
  googBasis: 75_000,
  cashUsd: 1_100_000,
  cashRate: 0.035,
  // Return models (nominal annual μ, annual σ, market-factor loading β∈[0,1])
  spacex: { mu: 0.1, sigma: 0.5, beta: 0.35 },
  tsla: { mu: 0.09, sigma: 0.55, beta: 0.5 },
  goog: { mu: 0.08, sigma: 0.32, beta: 0.6 },
  div: { mu: 0.08, sigma: 0.17, beta: 0.9 }, // diversified S&P-like proxy for reinvested proceeds
  // FX — USD per 1 EUR
  eurUsd: 1.12,
  fxDrift: 0,
  fxVol: 0.09,
  // Tax — German Abgeltungsteuer governs (26.375%); raise toward ~30.2% to include the
  // currently-non-creditable US NIIT (conservative). CA avoided by severing residency.
  capGainsRate: 0.26375,
  // Living costs (EUR/yr, today's money)
  burnHouseOps: 104_000, // from the Running Costs page (all-in incl. repair reserve)
  burnSchooling: 50_000, // ~2 kids × international/bilingual
  burnChildcare: 40_000, // nanny / au pair
  burnHealth: 20_000, // German private health insurance (PKV), family
  burnGeneral: 120_000, // general living + discretionary
  burnTravel: 30_000, // US trips etc.
  inflation: 0.02, // ECB medium-term target
  // Loans
  mortgageLtv: 0.6,
  mortgageRate: 0.038, // 10-yr fixed Annuitätendarlehen, mid-2026
  sblocRate: 0.07, // SOFR + ~2.75%
  sblocMaxLtv: 0.4, // concentrated single-stock advance rate
  // Strategy
  strategy: 'hybrid',
  hybridSellPct: 0.5,
  // De-risking
  spacexTrimPct: 0,
  // Monte Carlo
  mcPaths: 1200,
}

export const STRATEGY_LABEL: Record<Inputs['strategy'], string> = {
  outright: 'Sell outright',
  borrow: 'Borrow against assets',
  hybrid: 'Hybrid (sell + borrow)',
}

export const STRATEGY_BLURB: Record<Inputs['strategy'], string> = {
  outright: 'Sell equities to pay cash. No debt, but you realize a large taxable gain up front — brutal on the $0-basis SpaceX.',
  borrow: 'Mortgage the house + a portfolio loan; keep the equities invested and compounding. You pay interest and carry margin-call risk.',
  hybrid: 'Sell part, borrow the rest — a middle path between the up-front tax hit and the ongoing carry.',
}

export const INTRO = `Your wealth is ~95% one concentrated, $0-basis position. So the real question isn't "can you afford the house" — it's how you fund €10M without a needless tax hit or a liquidity squeeze, and how that choice compounds over ${DEFAULTS.horizon} years.

This runs each funding strategy through the same engine — selling realizes German capital-gains tax (the $0-basis SpaceX is taxed on the full proceeds), borrowing keeps the money invested but costs interest. The shaded cone is the Monte Carlo range (10th–90th percentile across ${DEFAULTS.mcPaths.toLocaleString()} paths); the solid line is the median (typical) outcome. Everything below is an input — change any assumption and the whole model re-runs.`

export const ASSUMPTIONS = [
  'Tax residency: US citizens who become German tax residents. German Abgeltungsteuer (25% + 5.5% Soli = 26.375%) governs share gains; US tax is credited away via the treaty/foreign tax credit, so you pay roughly the higher of the two, not the sum.',
  'NIIT wrinkle: the US 3.8% Net Investment Income Tax is currently treated as not creditable against foreign tax — raise the rate toward ~30.2% to model that conservative case. (Litigation could change it.)',
  'California is severed before any sale, so its 13.3% does not apply to gains on personally-held public stock.',
  'SpaceX is modeled as public and freely sellable (per your brief), at $0 cost basis — every dollar of proceeds is a taxable gain.',
  'The $10M is all-in including Bavaria’s 3.5% Grunderwerbsteuer + notary; no separate German wealth tax exists. Grundsteuer (~€1k/yr) sits inside the house-ops line.',
  'No earned income — all spending is funded by drawing down the portfolio (selling, tax-aware: cash first, then lowest-gain lots, SpaceX last).',
  'Loans are interest-only here (mortgage + portfolio line); amortization would raise near-term cash needs and lower debt over time.',
  'Returns are nominal; correlations use a one-factor market model. Single-stock vols (TSLA ~55%, GOOG ~32%) are realized/regime-dependent — treat the cone as indicative, not a forecast.',
]

export const SOURCES: { n: number; title: string; url: string }[] = [
  { n: 1, title: 'German Abgeltungsteuer — 25% + 5.5% Soli = 26.375% (overview)', url: 'https://en.wikipedia.org/wiki/Abgeltungsteuer' },
  { n: 2, title: 'IRS Topic 409 — long-term capital gains (20% top) + NIIT 3.8%', url: 'https://www.irs.gov/taxtopics/tc409' },
  { n: 3, title: 'US–Germany treaty FTC + NIIT non-creditability (The Tax Adviser, 2025)', url: 'https://www.thetaxadviser.com/issues/2025/jun/treaty-based-foreign-tax-credit-and-net-investment-income-tax/' },
  { n: 4, title: 'CA FTB Pub. 1100 — gains on intangibles sourced to state of residence', url: 'https://www.ftb.ca.gov/forms/misc/1100.html' },
  { n: 5, title: 'German exit tax / §17 substantial-shareholding ≥1% threshold (Grant Thornton)', url: 'https://www.grantthornton.de/en/insights/exit-tax-topic-hub/' },
  { n: 6, title: 'Grunderwerbsteuer — Bavaria 3.5% (Tax Foundation)', url: 'https://taxfoundation.org/data/all/eu/germany-real-estate-transaction-tax-rates/' },
  { n: 7, title: 'German wealth tax suspended since 1997 (Tax Foundation)', url: 'https://taxfoundation.org/research/all/eu/wealth-tax-impact/' },
  { n: 8, title: 'S&P 500 long-run ~10% return / ~17% volatility', url: 'https://tradethatswing.com/average-historical-stock-market-returns-for-sp-500-5-year-up-to-150-year-averages/' },
  { n: 9, title: 'TSLA realized volatility ~45–60% (GuruFocus)', url: 'https://www.gurufocus.com/term/volatility/TSLA' },
  { n: 10, title: 'EUR/USD long-run level + volatility (Macrotrends)', url: 'https://www.macrotrends.net/2548/euro-dollar-exchange-rate-historical-chart' },
  { n: 11, title: 'SBLOC advance rates + pricing (Fidelity)', url: 'https://www.fidelity.com/lending/securities-backed-line-of-credit' },
  { n: 12, title: 'German mortgage rates / LTV mid-2026 (Hypofriend)', url: 'https://hypofriend.de/en/current-interest-rates-germany-2026.afb' },
]
