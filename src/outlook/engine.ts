// Long-term financial-outlook engine for the Reitweg 25 purchase decision.
//
// Models a portfolio of concentrated US equities (SpaceX, TSLA, GOOG, a diversified bucket,
// cash) against an EUR house + EUR living costs, for a US-citizen family that becomes German
// tax-resident. Everything internal is USD; net worth is reported in EUR (home currency) at the
// simulated EUR/USD path. Three funding strategies (sell outright / borrow / hybrid) run through
// the same annual drawdown loop, deterministically or as a Monte Carlo cloud.
//
// Returns: μ is the TYPICAL (median) annual return — the median path (all shocks 0) grows at
// exactly (1+μ). Single-stock medians are set below index averages on purpose (most single
// stocks lag the index over decades). Volatility spreads the cone; `meanReversion` (0 = random
// walk; >0 = AR(1) pull toward the median path) caps long-horizon dispersion so 50%+ single-stock
// vol doesn't fan out to an absurd range over 30y. A separate `impairProb` jump models the one
// thing a log-normal cannot: a concentrated position permanently cratering.

export type Strategy = 'outright' | 'borrow' | 'hybrid'

export interface AssetInput {
  mu: number // typical (median) nominal annual total return
  sigma: number // annual volatility (log)
  beta: number // correlation to the common market factor (0..1); pairwise corr = sqrt(beta_i*beta_j)
}

export interface Inputs {
  horizon: number
  housePriceEur: number
  houseGrowth: number
  setupCapexEur: number // one-off furnishing/renovation at purchase
  spacexShares: number
  spacexPrice: number
  spacexBasisPerShare: number
  tslaValue: number
  tslaBasis: number
  googValue: number
  googBasis: number
  cashUsd: number
  cashRate: number
  spacex: AssetInput
  tsla: AssetInput
  goog: AssetInput
  div: AssetInput
  eurUsd: number // USD per 1 EUR
  fxDrift: number
  fxVol: number
  meanReversion: number // 0..~0.3; AR(1) pull on log-deviations (0 = pure random walk)
  impairProb: number // annual probability SpaceX permanently impairs (MC only)
  impairTo: number // residual fraction it drops to if it impairs
  capGainsRate: number
  wealthTaxRate: number // annual German wealth-tax scenario (0 = none today)
  burnHouseOps: number
  burnSchooling: number
  burnChildcare: number
  burnHealth: number
  burnGeneral: number
  burnTravel: number
  burnInsurance: number
  burnAdvisory: number // cross-border US+DE tax/legal/advisory
  inflation: number
  mortgageLtv: number
  mortgageRate: number
  sblocRate: number
  sblocMaxLtv: number
  strategy: Strategy
  hybridSellPct: number
  spacexInitialDivPct: number // one-time fraction of SpaceX sold into diversified at t=0
  spacexTrimPct: number // fraction of remaining SpaceX sold each year → diversified bucket
  mcPaths: number
}

export interface Composition {
  spacex: number
  tsla: number
  goog: number
  div: number
  cash: number
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
  marginCallEur: number
  comp: Composition
}

export interface PathResult {
  rows: YearRow[]
  ruinYear: number | null
}

interface Holding {
  value: number
  basis: number
  dev: number
  a: AssetInput
}

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
  const a = u() || 1e-9
  const b = u()
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b)
}

// Raise `targetNetUsd` of cash: spend cash first (no gain), then sell holdings in order of least
// taxable gain per dollar. Mutates holdings; returns realized tax (USD) and whether it fell short.
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
    .sort((x, y) => y.basis / y.value - x.basis / x.value)
  for (const h of order) {
    if (need <= 0) break
    const gainFrac = Math.max(0, (h.value - h.basis) / h.value)
    const netPerValue = 1 - gainFrac * rate
    const maxNet = h.value * netPerValue
    if (maxNet <= need + 1e-6) {
      taxUsd += Math.max(0, h.value - h.basis) * rate
      need -= maxNet
      h.value = 0
      h.basis = 0
    } else {
      const f = need / maxNet
      taxUsd += Math.max(0, h.value - h.basis) * f * rate
      h.value -= h.value * f
      h.basis -= h.basis * f
      need = 0
    }
  }
  return { taxUsd, short: need > 1 }
}

export function simulatePath(inp: Inputs, stochastic: boolean, seed: number): PathResult {
  const u = mulberry32(seed)
  const phi = 1 - Math.max(0, Math.min(0.95, inp.meanReversion))

  const holdings: Holding[] = [
    { value: inp.spacexShares * inp.spacexPrice, basis: inp.spacexShares * inp.spacexBasisPerShare, dev: 0, a: inp.spacex },
    { value: inp.tslaValue, basis: inp.tslaBasis, dev: 0, a: inp.tsla },
    { value: inp.googValue, basis: inp.googBasis, dev: 0, a: inp.goog },
    { value: 0, basis: 0, dev: 0, a: inp.div },
  ]
  const spacex = holdings[0]
  const div = holdings[3]
  const cashRef = { v: inp.cashUsd }
  let fx = inp.eurUsd > 0 ? inp.eurUsd : 1 // guard against a cleared / zero EUR/USD input
  let house = 0
  let mortgage = 0
  let ploan = 0
  let cumTaxEur = 0
  let cumInterestEur = 0
  let ruinYear: number | null = null

  // Sell a fraction of SpaceX, pay cap-gains tax on the gain, and move ONLY the after-tax
  // proceeds into the diversified bucket — you never get 100% of the proceeds reinvested.
  const diversifySpacex = (frac: number) => {
    if (frac <= 0 || spacex.value <= 1) return
    const sellV = spacex.value * frac
    const tax = Math.max(0, sellV * (1 - spacex.basis / spacex.value)) * inp.capGainsRate
    cumTaxEur += tax / fx
    spacex.value -= sellV
    spacex.basis -= spacex.basis * frac
    const net = sellV - tax
    div.value += net
    div.basis += net
  }

  // t=0 — buy the house per strategy, then pay one-off setup capex
  if (inp.strategy === 'outright') {
    const { taxUsd, short } = raiseNet(cashRef, holdings, inp.housePriceEur * fx, inp.capGainsRate)
    cumTaxEur += taxUsd / fx
    if (short) ruinYear = 0
  } else if (inp.strategy === 'borrow') {
    mortgage = inp.housePriceEur * inp.mortgageLtv
    let remEur = inp.housePriceEur - mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    ploan = Math.min(remEur, inp.sblocMaxLtv * portfolioEur)
    remEur -= ploan
    if (remEur > 0) {
      const { taxUsd, short } = raiseNet(cashRef, holdings, remEur * fx, inp.capGainsRate)
      cumTaxEur += taxUsd / fx
      if (short) ruinYear = 0
    }
  } else {
    const sellEur = inp.housePriceEur * inp.hybridSellPct
    const r1 = raiseNet(cashRef, holdings, sellEur * fx, inp.capGainsRate)
    cumTaxEur += r1.taxUsd / fx
    if (r1.short) ruinYear = 0
    const borrowEur = inp.housePriceEur - sellEur
    mortgage = Math.min(borrowEur, inp.housePriceEur * inp.mortgageLtv)
    const afterMortEur = borrowEur - mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    ploan = Math.min(afterMortEur, inp.sblocMaxLtv * portfolioEur)
    const unfundedEur = afterMortEur - ploan
    if (unfundedEur > 0) {
      const r2 = raiseNet(cashRef, holdings, unfundedEur * fx, inp.capGainsRate)
      cumTaxEur += r2.taxUsd / fx
      if (r2.short) ruinYear = 0
    }
  }
  house = inp.housePriceEur
  if (inp.setupCapexEur > 0) {
    const rc = raiseNet(cashRef, holdings, inp.setupCapexEur * fx, inp.capGainsRate)
    cumTaxEur += rc.taxUsd / fx
    if (rc.short) ruinYear = 0
  }
  // One-time SpaceX diversification at purchase (after funding the house, so the freshly
  // diversified bucket isn't immediately re-sold to cover the purchase).
  diversifySpacex(inp.spacexInitialDivPct)

  const rows: YearRow[] = []
  const record = (year: number, burnEur: number, marginCallEur: number) => {
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
      marginCallEur,
      comp: {
        spacex: holdings[0].value / fx,
        tsla: holdings[1].value / fx,
        goog: holdings[2].value / fx,
        div: holdings[3].value / fx,
        cash: cashRef.v / fx,
      },
    })
  }
  record(0, 0, 0)

  for (let year = 1; year <= inp.horizon; year++) {
    // Asset growth: median path grows at (1+μ); AR(1) deviation adds bounded volatility.
    const m = stochastic ? gaussian(u) : 0
    for (const h of holdings) {
      if (h.value <= 0 && h !== div) continue
      if (stochastic) {
        const eps = gaussian(u)
        const z = Math.sqrt(h.a.beta) * m + Math.sqrt(1 - h.a.beta) * eps
        const devNew = phi * h.dev + h.a.sigma * z
        h.value *= (1 + h.a.mu) * Math.exp(devNew - h.dev)
        h.dev = devNew
      } else {
        h.value *= 1 + h.a.mu
      }
    }
    // Permanent impairment jump on the dominant single position (MC only) — the one tail a
    // log-normal can't produce: fraud, technical failure, valuation reset that never recovers.
    if (stochastic && inp.impairProb > 0 && spacex.value > 1 && u() < inp.impairProb) {
      spacex.value *= inp.impairTo // basis unchanged: a real market loss
    }
    cashRef.v *= 1 + inp.cashRate
    house *= 1 + inp.houseGrowth
    if (stochastic) {
      const z = gaussian(u)
      fx *= (1 + inp.fxDrift) * Math.exp(inp.fxVol * z)
    } else {
      fx *= 1 + inp.fxDrift
    }

    // Annual SpaceX de-risking trim → reinvest after-tax into the diversified bucket
    diversifySpacex(inp.spacexTrimPct)

    // Living costs (inflated) + interest-only debt + optional wealth tax, funded by drawdown
    const infl = Math.pow(1 + inp.inflation, year)
    const burnEur =
      (inp.burnHouseOps + inp.burnSchooling + inp.burnChildcare + inp.burnHealth + inp.burnGeneral +
        inp.burnTravel + inp.burnInsurance + inp.burnAdvisory) * infl
    const interestEur = mortgage * inp.mortgageRate + ploan * inp.sblocRate
    cumInterestEur += interestEur
    let netWorthNowEur = cashRef.v / fx + holdings.reduce((s, h) => s + h.value, 0) / fx + house - mortgage - ploan
    const wealthTaxEur = inp.wealthTaxRate > 0 ? Math.max(0, netWorthNowEur) * inp.wealthTaxRate : 0
    const r = raiseNet(cashRef, holdings, (burnEur + interestEur + wealthTaxEur) * fx, inp.capGainsRate)
    cumTaxEur += (r.taxUsd / fx) + wealthTaxEur
    if (r.short && ruinYear === null) ruinYear = year

    // SBLOC margin call: a breach of the max LTV forces selling into the down market.
    let marginCallEur = 0
    if (ploan > 0) {
      const portUsd = cashRef.v + holdings.reduce((s, h) => s + h.value, 0)
      const ploanUsd = ploan * fx
      if (ploanUsd > inp.sblocMaxLtv * portUsd) {
        const grossUsd = (ploanUsd - inp.sblocMaxLtv * portUsd) / (1 - inp.sblocMaxLtv)
        const rc = raiseNet(cashRef, holdings, grossUsd, inp.capGainsRate)
        cumTaxEur += rc.taxUsd / fx
        const paydownUsd = Math.min(grossUsd, ploanUsd)
        ploan -= paydownUsd / fx
        marginCallEur = paydownUsd / fx
        if (rc.short && ruinYear === null) ruinYear = year
      }
    }

    record(year, burnEur, marginCallEur)
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
  liquidP50: number[]
  ruinProb: number
  terminal: { p10: number; p50: number; p90: number }
  terminalLiquid: { p10: number; p50: number; p90: number }
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
  const liqByYear: number[][] = Array.from({ length: H + 1 }, () => [])
  let ruined = 0
  for (let p = 0; p < inp.mcPaths; p++) {
    const { rows, ruinYear } = simulatePath(inp, true, (p + 1) * 2654435761)
    if (ruinYear !== null) ruined++
    for (const r of rows) {
      byYear[r.year].push(Number.isFinite(r.netWorthEur) ? r.netWorthEur : 0)
      liqByYear[r.year].push(Number.isFinite(r.liquidEur) ? r.liquidEur : 0)
    }
  }
  const years: number[] = []
  const p10: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p90: number[] = []
  const liquidP50: number[] = []
  for (let y = 0; y <= H; y++) {
    const s = byYear[y].slice().sort((a, b) => a - b)
    const ls = liqByYear[y].slice().sort((a, b) => a - b)
    years.push(y)
    p10.push(percentile(s, 0.1))
    p25.push(percentile(s, 0.25))
    p50.push(percentile(s, 0.5))
    p75.push(percentile(s, 0.75))
    p90.push(percentile(s, 0.9))
    liquidP50.push(percentile(ls, 0.5))
  }
  const term = byYear[H].slice().sort((a, b) => a - b)
  const termLiq = liqByYear[H].slice().sort((a, b) => a - b)
  return {
    years,
    p10, p25, p50, p75, p90, liquidP50,
    ruinProb: ruined / inp.mcPaths,
    terminal: { p10: percentile(term, 0.1), p50: percentile(term, 0.5), p90: percentile(term, 0.9) },
    terminalLiquid: { p10: percentile(termLiq, 0.1), p50: percentile(termLiq, 0.5), p90: percentile(termLiq, 0.9) },
  }
}

// ---- Strategy comparison (deterministic median path + MC summary) ----------
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
