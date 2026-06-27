// Default assumptions + sources for the financial-outlook simulator.
// Tax constants are sourced (see SOURCES); market return/vol are defensible planning defaults
// the user is meant to override. μ is the TYPICAL (median) annual return — single-stock medians
// are set below index averages on purpose (most single stocks lag the index over decades).

import type { Inputs } from './engine'

export const DEFAULTS: Inputs = {
  horizon: 30,
  housePriceEur: 10_000_000,
  houseGrowth: 0.02,
  setupCapexEur: 1_000_000, // one-off furnishing / fit-out of a €10M villa
  // Holdings (USD). SpaceX treated as public/liquid per the user; price is an assumption that
  // drives everything — confirm it.
  spacexShares: 380_000,
  spacexPrice: 150,
  spacexBasisPerShare: 0,
  tslaValue: 700_000,
  tslaBasis: 350_000,
  googValue: 150_000,
  googBasis: 75_000,
  cashUsd: 1_100_000,
  cashRate: 0.035,
  // Return models: μ = median annual return, σ = annual log-vol, beta = market co-movement (ρ²).
  // Single-stock medians sit below index averages by design (idiosyncratic risk + skew).
  spacex: { mu: 0.06, sigma: 0.6, beta: 0.35 },
  tsla: { mu: 0.05, sigma: 0.55, beta: 0.5 },
  goog: { mu: 0.06, sigma: 0.32, beta: 0.6 },
  div: { mu: 0.065, sigma: 0.17, beta: 0.9 }, // diversified index, median, net of ~0.5%/yr fund tax drag
  eurUsd: 1.12,
  fxDrift: 0,
  fxVol: 0.09,
  meanReversion: 0.05, // AR(1) pull toward the median path; without it 30-yr single-stock tails are absurd
  impairProb: 0.005, // ~14% chance over 30y that SpaceX permanently craters
  impairTo: 0.25,
  // Tax: German Abgeltungsteuer (26.375%) + the currently-non-creditable US NIIT (3.8%) = ~30.2%.
  capGainsRate: 0.30175,
  wealthTaxRate: 0, // no German wealth tax today; raise to stress the political-risk scenario
  burnHouseOps: 104_000,
  burnSchooling: 50_000,
  burnChildcare: 40_000,
  burnHealth: 24_000,
  burnGeneral: 120_000,
  burnTravel: 30_000,
  burnInsurance: 25_000, // property + liability + umbrella on a €10M villa
  burnAdvisory: 50_000, // cross-border US+DE tax prep, FBAR/FATCA, planning
  inflation: 0.02,
  mortgageLtv: 0.6,
  mortgageRate: 0.038,
  sblocRate: 0.07,
  sblocMaxLtv: 0.4, // concentrated single-stock advance rate
  strategy: 'hybrid',
  hybridSellPct: 0.5,
  spacexTrimPct: 0,
  mcPaths: 2000,
}

export const STRATEGY_LABEL: Record<Inputs['strategy'], string> = {
  outright: 'Sell outright',
  borrow: 'Borrow against assets',
  hybrid: 'Hybrid (sell + borrow)',
}

export const STRATEGY_COLOR: Record<Inputs['strategy'], string> = {
  outright: '#ca8a04',
  borrow: '#7f1d1d',
  hybrid: '#1d6f8b',
}

export const STRATEGY_BLURB: Record<Inputs['strategy'], string> = {
  outright: 'Sell equities to pay cash. No debt, but you realize a large taxable gain up front — brutal on the $0-basis SpaceX.',
  borrow: 'Mortgage the house + a portfolio loan; keep the equities invested. You pay interest and a crash can trigger a margin call (now modeled).',
  hybrid: 'Sell part, borrow the rest — a middle path between the up-front tax hit and the ongoing carry + margin risk.',
}

export const INTRO = `Your wealth is heavily concentrated in one $0-basis position. So the real question isn't "can you afford the house" — it's how you fund €10M without a needless tax hit or a liquidity squeeze, and how that choice compounds over ${DEFAULTS.horizon} years.

Selling realizes German capital-gains tax (the $0-basis SpaceX is taxed on the full proceeds); borrowing keeps the money invested but costs interest and carries margin-call risk. The shaded cone is the Monte Carlo range (10th–90th percentile across ${DEFAULTS.mcPaths.toLocaleString()} paths); the solid line is the median (typical) outcome. Returns you enter are the typical (median) annual growth — single stocks are set below the index because most lag it over decades. Everything below is an input — change any assumption and the whole model re-runs.`

export const ASSUMPTIONS = [
  'Returns (μ) are the TYPICAL (median) annual growth, not the average — most single stocks lag the index over decades, so SpaceX/TSLA medians are set below the index. Volatility fans the cone around the median with upside skew.',
  'Mean reversion caps long-horizon spread: without it, compounding 50–60% single-stock vol independently for 30 years implies a ~1,000× range, which is not a credible distribution. Set it to 0 to see the raw (much wider) random-walk tails.',
  'A separate “permanent impairment” jump models the one risk a bell-curve can’t: a concentrated position cratering and never recovering (fraud, technical failure, valuation reset). Default ~0.5%/yr → ~14% over 30 years.',
  'Tax residency: US citizens who become German tax residents. German Abgeltungsteuer (26.375%) governs share gains, US tax is credited away — but the 3.8% US NIIT is currently treated as non-creditable, so the default rate is ~30.2% (the conservative case). California severed → its 13.3% does not apply.',
  'The diversified bucket assumes US-domiciled holdings via a US brokerage. A US citizen generally CANNOT use European index funds (punitive US PFIC tax); and Germany still levies an annual Vorabpauschale on funds — folded into a slightly lower diversified return here.',
  'Loans are interest-only; the portfolio loan is marked to market each year — a drawdown that breaches the advance rate forces a margin-call sale (realizing tax at the worst time). Mortgage terms (60% LTV, 3.8%) are best-case, income-qualified pricing; a no-income relocant may get less.',
  'The €10M is all-in incl. Bavaria’s 3.5% Grunderwerbsteuer + notary; a one-off €1M setup/furnishing cost is taken at purchase. No German wealth tax exists today — raise the wealth-tax input to stress the political-risk scenario.',
  'The house is counted in net worth but is NOT liquid — it can’t fund the burn. We show liquid net worth separately; “run-dry” risk is defined on liquid assets only.',
  'No earned income — all spending is funded by drawing down the portfolio (cash first, then lowest-gain lots, SpaceX last). Excluded: leaving Germany later would trigger exit tax on the fund bucket (cost > €500k) and possibly on a ≥1% SpaceX stake; church tax (Bavaria +8% of the tax) if you register a faith.',
]

export const SOURCES: { n: number; title: string; url: string }[] = [
  { n: 1, title: 'German Abgeltungsteuer — 25% + 5.5% Soli = 26.375%', url: 'https://en.wikipedia.org/wiki/Abgeltungsteuer' },
  { n: 2, title: 'IRS Topic 409 — long-term capital gains (20%) + NIIT 3.8%', url: 'https://www.irs.gov/taxtopics/tc409' },
  { n: 3, title: 'US–Germany treaty FTC + NIIT non-creditability (The Tax Adviser, 2025)', url: 'https://www.thetaxadviser.com/issues/2025/jun/treaty-based-foreign-tax-credit-and-net-investment-income-tax/' },
  { n: 4, title: 'PFIC rules for US persons holding non-US funds (IRS Form 8621)', url: 'https://www.irs.gov/forms-pubs/about-form-8621' },
  { n: 5, title: 'German Vorabpauschale — annual advance fund tax (Basiszins)', url: 'https://www.bundesbank.de/en' },
  { n: 6, title: 'CA FTB Pub. 1100 — gains on intangibles sourced to state of residence', url: 'https://www.ftb.ca.gov/forms/misc/1100.html' },
  { n: 7, title: 'German exit tax / §17 ≥1% threshold + 2025 fund extension (Grant Thornton)', url: 'https://www.grantthornton.de/en/insights/exit-tax-topic-hub/' },
  { n: 8, title: 'Grunderwerbsteuer — Bavaria 3.5% (Tax Foundation)', url: 'https://taxfoundation.org/data/all/eu/germany-real-estate-transaction-tax-rates/' },
  { n: 9, title: 'S&P 500 long-run ~10% mean return / ~17% volatility', url: 'https://tradethatswing.com/average-historical-stock-market-returns-for-sp-500-5-year-up-to-150-year-averages/' },
  { n: 10, title: 'TSLA realized volatility ~45–60% (GuruFocus)', url: 'https://www.gurufocus.com/term/volatility/TSLA' },
  { n: 11, title: 'EUR/USD long-run level + volatility (Macrotrends)', url: 'https://www.macrotrends.net/2548/euro-dollar-exchange-rate-historical-chart' },
  { n: 12, title: 'SBLOC advance rates + pricing (Fidelity)', url: 'https://www.fidelity.com/lending/securities-backed-line-of-credit' },
  { n: 13, title: 'German mortgage rates / LTV mid-2026 (Hypofriend)', url: 'https://hypofriend.de/en/current-interest-rates-germany-2026.afb' },
]
