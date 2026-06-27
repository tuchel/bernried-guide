// Long-term financial-outlook engine for the Reitweg 25 purchase decision.
//
// Models a portfolio of concentrated US equities (SpaceX 0-basis, TSLA, GOOG, cash)
// against an EUR house + EUR living costs, for a US-citizen family that becomes German
// tax-resident. Everything internal is USD; net worth is reported in EUR (home currency)
// at the simulated EUR/USD path. Three funding strategies (sell outright / borrow against
// assets / hybrid) are run through the same annual drawdown loop, deterministically or as
// a Monte Carlo cloud. See DEFAULTS for sourced assumptions.

export type Strategy = 'outright' | 'borrow' | 'hybrid'

export interface AssetInput {
  mu: number // expected nominal annual total return
  sigma: number // annual volatility
  beta: number // squared correlation to the common market factor (0..1); pairwise corr = sqrt(beta_i*beta_j)
}

export interface Inputs {
  horizon: number // years
  // House (EUR)
  housePriceEur: number
  houseGrowth: number
  // Holdings (USD)
  spacexShares: number
  spacexPrice: number
  spacexBasisPerShare: number
  tslaValue: number
  tslaBasis: number
  googValue: number
  googBasis: number
  cashUsd: number
  cashRate: number
  // Per-asset return models
  spacex: AssetInput
  tsla: AssetInput
  goog: AssetInput
  div: AssetInput // diversified proxy that reinvested / trimmed proceeds flow into
  // FX: USD per 1 EUR
  eurUsd: number
  fxDrift: number
  fxVol: number
  // Tax
  capGainsRate: number // effective combined LT cap-gains rate on share sales
  // Living costs (EUR / yr, today's money)
  burnHouseOps: number
  burnSchooling: number
  burnChildcare: number
  burnHealth: number
  burnGeneral: number
  burnTravel: number
  inflation: number
  // Loans
  mortgageLtv: number
  mortgageRate: number
  sblocRate: number
  sblocMaxLtv: number
  // Strategy
  strategy: Strategy
  hybridSellPct: number // fraction of the house funded by selling (rest borrowed)
  // De-risking
  spacexTrimPct: number // fraction of remaining SpaceX sold each year, reinvested into `div`
  // Monte Carlo
  mcPaths: number
}

export interface YearRow {
  year: number
  netWorthEur: number
  liquidEur: number
  houseEur: number
  debtEur: number
  cumTaxEur: number
  cumInterestEur: number
  burnEur: number
}

export interface PathResult {
  rows: YearRow[]
  ruinYear: number | null
}

interface Holding {
  value: number
  basis: number
  a: AssetInput
}

// ---- RNG: seeded uniform + gaussian (Box–Muller) ---------------------------
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
function gaussian(u: () => number) {
  let s = 0
  // Box–Muller; reject the rare u=0
  const a = u() || 1e-9
  const b = u()
  s = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b)
  return s
}

// ---- Tax-aware liquidity raise ---------------------------------------------
// Raise `targetNetUsd` of cash. Spend `cash` first (no gain), then sell holdings in
// order of *least* taxable gain per dollar (highest basis fraction first). Mutates the
// holdings + returns realized tax (USD) and whether the raise fell short.
function raiseNet(
  cashRef: { v: number },
  holdings: Holding[],
  targetNetUsd: number,
  rate: number,
): { taxUsd: number; short: boolean } {
  let need = targetNetUsd
  let taxUsd = 0
  if (need <= 0) return { taxUsd, short: false }

  const useCash = Math.min(cashRef.v, need)
  cashRef.v -= useCash
  need -= useCash

  const order = holdings
    .filter((h) => h.value > 1)
    .sort((x, y) => y.basis / y.value - x.basis / x.value) // most basis (least gain) first
  for (const h of order) {
    if (need <= 0) break
    const gainFrac = Math.max(0, (h.value - h.basis) / h.value)
    const netPerValue = 1 - gainFrac * rate // net cash per $1 of position sold
    const maxNet = h.value * netPerValue
    if (maxNet <= need + 1e-6) {
      // liquidate this holding entirely
      taxUsd += Math.max(0, h.value - h.basis) * rate
      need -= maxNet
      h.value = 0
      h.basis = 0
    } else {
      const f = need / maxNet // fraction of the holding to sell
      taxUsd += Math.max(0, h.value - h.basis) * f * rate
      h.value -= h.value * f
      h.basis -= h.basis * f
      need = 0
    }
  }
  return { taxUsd, short: need > 1 }
}

// ---- One path --------------------------------------------------------------
export function simulatePath(inp: Inputs, stochastic: boolean, seed: number, muShift = 0): PathResult {
  const u = mulberry32(seed)
  const shift = (a: AssetInput): AssetInput => ({ ...a, mu: a.mu + muShift })

  const holdings: Holding[] = [
    { value: inp.spacexShares * inp.spacexPrice, basis: inp.spacexShares * inp.spacexBasisPerShare, a: shift(inp.spacex) },
    { value: inp.tslaValue, basis: inp.tslaBasis, a: shift(inp.tsla) },
    { value: inp.googValue, basis: inp.googBasis, a: shift(inp.goog) },
    { value: 0, basis: 0, a: shift(inp.div) },
  ]
  const spacex = holdings[0]
  const div = holdings[3]
  const cashRef = { v: inp.cashUsd }
  let fx = inp.eurUsd
  let house = 0
  let mortgage = 0
  let ploan = 0
  let cumTaxEur = 0
  let cumInterestEur = 0
  let ruinYear: number | null = null

  // t=0 — buy the house per strategy
  const priceUsd = inp.housePriceEur * fx
  if (inp.strategy === 'outright') {
    const { taxUsd, short } = raiseNet(cashRef, holdings, priceUsd, inp.capGainsRate)
    cumTaxEur += taxUsd / fx
    if (short) ruinYear = 0
  } else if (inp.strategy === 'borrow') {
    mortgage = inp.housePriceEur * inp.mortgageLtv
    let remEur = inp.housePriceEur - mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    const sbloc = Math.min(remEur, inp.sblocMaxLtv * portfolioEur)
    ploan = sbloc
    remEur -= sbloc
    if (remEur > 0) {
      const { taxUsd, short } = raiseNet(cashRef, holdings, remEur * fx, inp.capGainsRate)
      cumTaxEur += taxUsd / fx
      if (short) ruinYear = 0
    }
  } else {
    // hybrid: sell a fraction, borrow the rest (mortgage first, then SBLOC)
    const sellEur = inp.housePriceEur * inp.hybridSellPct
    const r1 = raiseNet(cashRef, holdings, sellEur * fx, inp.capGainsRate)
    cumTaxEur += r1.taxUsd / fx
    if (r1.short) ruinYear = 0
    let borrowEur = inp.housePriceEur - sellEur
    mortgage = Math.min(borrowEur, inp.housePriceEur * inp.mortgageLtv)
    borrowEur -= mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    ploan = Math.min(borrowEur, inp.sblocMaxLtv * portfolioEur)
  }
  house = inp.housePriceEur

  const rows: YearRow[] = []
  const record = (year: number, burnEur: number) => {
    const liquidUsd = cashRef.v + holdings.reduce((s, h) => s + h.value, 0)
    const liquidEur = liquidUsd / fx
    rows.push({
      year,
      netWorthEur: liquidEur + house - mortgage - ploan,
      liquidEur,
      houseEur: house,
      debtEur: mortgage + ploan,
      cumTaxEur,
      cumInterestEur,
      burnEur,
    })
  }
  record(0, 0)

  for (let year = 1; year <= inp.horizon; year++) {
    // Asset growth. μ is the TYPICAL (median) annual return: the median path (z=0) grows
    // at exactly (1+μ), matching the deterministic line, while volatility spreads the cone
    // around it with the usual log-normal upside skew. One common market factor + idiosyncratic.
    const m = stochastic ? gaussian(u) : 0
    for (const h of holdings) {
      if (h.value <= 0 && h !== div) continue
      let g: number
      if (stochastic) {
        const eps = gaussian(u)
        const z = Math.sqrt(h.a.beta) * m + Math.sqrt(1 - h.a.beta) * eps
        g = (1 + h.a.mu) * Math.exp(h.a.sigma * z)
      } else {
        g = 1 + h.a.mu
      }
      h.value *= g
    }
    cashRef.v *= 1 + inp.cashRate
    house *= 1 + inp.houseGrowth
    if (stochastic) {
      const z = gaussian(u)
      fx *= (1 + inp.fxDrift) * Math.exp(inp.fxVol * z)
    } else {
      fx *= 1 + inp.fxDrift
    }

    // Annual SpaceX de-risking trim → reinvest after-tax into the diversified proxy
    if (inp.spacexTrimPct > 0 && spacex.value > 1) {
      const sellV = spacex.value * inp.spacexTrimPct
      const tax = Math.max(0, sellV * (1 - spacex.basis / spacex.value)) * inp.capGainsRate
      cumTaxEur += tax / fx
      spacex.value -= sellV
      spacex.basis -= spacex.basis * inp.spacexTrimPct
      const net = sellV - tax
      div.value += net
      div.basis += net
    }

    // Living costs (inflated) + interest-only debt service
    const infl = Math.pow(1 + inp.inflation, year)
    const burnEur =
      (inp.burnHouseOps + inp.burnSchooling + inp.burnChildcare + inp.burnHealth + inp.burnGeneral + inp.burnTravel) * infl
    const interestEur = mortgage * inp.mortgageRate + ploan * inp.sblocRate
    cumInterestEur += interestEur
    const needUsd = (burnEur + interestEur) * fx

    const { taxUsd, short } = raiseNet(cashRef, holdings, needUsd, inp.capGainsRate)
    cumTaxEur += taxUsd / fx
    if (short && ruinYear === null) ruinYear = year

    record(year, burnEur)
  }

  return { rows, ruinYear }
}

// ---- Monte Carlo -----------------------------------------------------------
export interface McResult {
  years: number[]
  p10: number[]
  p25: number[]
  p50: number[]
  p75: number[]
  p90: number[]
  ruinProb: number
  terminal: { p10: number; p50: number; p90: number }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export function runMonteCarlo(inp: Inputs): McResult {
  const H = inp.horizon
  const byYear: number[][] = Array.from({ length: H + 1 }, () => [])
  let ruined = 0
  for (let p = 0; p < inp.mcPaths; p++) {
    const { rows, ruinYear } = simulatePath(inp, true, (p + 1) * 2654435761)
    if (ruinYear !== null) ruined++
    for (const r of rows) byYear[r.year].push(r.netWorthEur)
  }
  const years: number[] = []
  const p10: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p90: number[] = []
  for (let y = 0; y <= H; y++) {
    const s = byYear[y].slice().sort((a, b) => a - b)
    years.push(y)
    p10.push(percentile(s, 0.1))
    p25.push(percentile(s, 0.25))
    p50.push(percentile(s, 0.5))
    p75.push(percentile(s, 0.75))
    p90.push(percentile(s, 0.9))
  }
  const term = byYear[H].slice().sort((a, b) => a - b)
  return {
    years,
    p10, p25, p50, p75, p90,
    ruinProb: ruined / inp.mcPaths,
    terminal: { p10: percentile(term, 0.1), p50: percentile(term, 0.5), p90: percentile(term, 0.9) },
  }
}

// ---- Strategy comparison (deterministic base + MC summary) -----------------
export interface StrategyResult {
  strategy: Strategy
  deterministic: YearRow[]
  mc: McResult
  upfrontTaxEur: number
  endDebtEur: number
}

export function runStrategy(inp: Inputs, strategy: Strategy): StrategyResult {
  const i = { ...inp, strategy }
  const det = simulatePath(i, false, 1).rows
  const mc = runMonteCarlo(i)
  return {
    strategy,
    deterministic: det,
    mc,
    upfrontTaxEur: det[0].cumTaxEur,
    endDebtEur: det[det.length - 1].debtEur,
  }
}
