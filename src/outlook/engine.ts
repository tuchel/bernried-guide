// Long-term financial-outlook engine for the Reitweg 25 purchase decision.
//
// Models a portfolio of concentrated US equities (SpaceX, TSLA, GOOG, a diversified bucket,
// cash) against an EUR house + EUR living costs, for a US-citizen family that becomes German
// tax-resident. Everything internal is USD; net worth is reported in EUR (home currency) at the
// simulated EUR/USD path. Three funding strategies (sell outright / borrow / hybrid) run through
// the same annual drawdown loop, deterministically or as a Monte Carlo cloud.
//
// Returns: μ is the TYPICAL (median) annual return — the median path (all shocks 0) grows at
// exactly (1+μ). Volatility spreads the cone; `meanReversion` (AR(1)) caps long-horizon spread;
// `impairProb` is the jump a log-normal can't make (a concentrated position permanently cratering).
// Each year also records a cash-flow breakdown (sources, uses, and the traced SpaceX→diversified
// conversion) for the per-year flow diagram.

export type Strategy = 'outright' | 'borrow' | 'hybrid'

export interface AssetInput {
  mu: number
  sigma: number
  beta: number
}

export interface Inputs {
  horizon: number
  housePriceEur: number
  houseGrowth: number
  setupCapexEur: number
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
  eurUsd: number
  fxDrift: number
  fxVol: number
  meanReversion: number
  impairProb: number
  impairTo: number
  capGainsRate: number
  wealthTaxRate: number
  burnHouseOps: number
  burnSchooling: number
  burnChildcare: number
  burnHealth: number
  burnGeneral: number
  burnTravel: number
  burnInsurance: number
  burnAdvisory: number
  inflation: number
  mortgageLtv: number
  mortgageRate: number
  sblocRate: number
  sblocMaxLtv: number
  loanTermYears: number
  strategy: Strategy
  hybridSellPct: number
  spacexInitialDivPct: number
  spacexTrimPct: number
  mcPaths: number
}

export interface Composition {
  spacex: number
  tsla: number
  goog: number
  div: number
  cash: number
}

// Per-year cash flows, in EUR. Sources fund uses; the two sides balance.
export interface YearFlow {
  sellSpacex: number
  sellTsla: number
  sellGoog: number
  sellDiv: number
  cash: number
  loan: number
  // uses
  tax: number
  house: number
  setup: number
  living: number
  interest: number
  principal: number
  wealthTax: number
  toDiv: number
  // traced SpaceX → diversified conversion (gross sold for diversification, and its tax)
  spacexToDivGross: number
  divTax: number
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
  flow: YearFlow
}

export interface PathResult {
  rows: YearRow[]
  ruinYear: number | null
}

type HoldKey = 'spacex' | 'tsla' | 'goog' | 'div'
interface Holding {
  key: HoldKey
  value: number
  basis: number
  dev: number
  a: AssetInput
}

function makeFlow(): YearFlow {
  return {
    sellSpacex: 0, sellTsla: 0, sellGoog: 0, sellDiv: 0, cash: 0, loan: 0,
    tax: 0, house: 0, setup: 0, living: 0, interest: 0, principal: 0, wealthTax: 0, toDiv: 0,
    spacexToDivGross: 0, divTax: 0,
  }
}
function addSell(flow: YearFlow, key: HoldKey, grossUsd: number) {
  if (key === 'spacex') flow.sellSpacex += grossUsd
  else if (key === 'tsla') flow.sellTsla += grossUsd
  else if (key === 'goog') flow.sellGoog += grossUsd
  else flow.sellDiv += grossUsd
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
// taxable gain per dollar. Mutates holdings; records sources + tax into `flow`; returns short flag.
// `onlyKey` restricts the raise to a single holding and leaves cash untouched (used at t=0 to fund
// the purchase from SpaceX alone).
function raiseNet(
  cashRef: { v: number },
  holdings: Holding[],
  targetNetUsd: number,
  rate: number,
  flow: YearFlow,
  onlyKey?: HoldKey,
): { short: boolean } {
  let need = targetNetUsd
  if (need <= 0) return { short: false }
  if (!onlyKey) {
    const useCash = Math.min(cashRef.v, need)
    cashRef.v -= useCash
    flow.cash += useCash
    need -= useCash
  }
  const order = holdings
    .filter((h) => h.value > 1 && (!onlyKey || h.key === onlyKey))
    .sort((x, y) => y.basis / y.value - x.basis / x.value)
  for (const h of order) {
    if (need <= 0) break
    const gainFrac = Math.max(0, (h.value - h.basis) / h.value)
    const netPerValue = 1 - gainFrac * rate
    const maxNet = h.value * netPerValue
    if (maxNet <= need + 1e-6) {
      flow.tax += Math.max(0, h.value - h.basis) * rate
      addSell(flow, h.key, h.value)
      need -= maxNet
      h.value = 0
      h.basis = 0
    } else {
      const f = need / maxNet
      flow.tax += Math.max(0, h.value - h.basis) * f * rate
      addSell(flow, h.key, h.value * f)
      h.value -= h.value * f
      h.basis -= h.basis * f
      need = 0
    }
  }
  return { short: need > 1 }
}

export function simulatePath(inp: Inputs, stochastic: boolean, seed: number): PathResult {
  const u = mulberry32(seed)
  const phi = 1 - Math.max(0, Math.min(0.95, inp.meanReversion))

  const holdings: Holding[] = [
    { key: 'spacex', value: inp.spacexShares * inp.spacexPrice, basis: inp.spacexShares * inp.spacexBasisPerShare, dev: 0, a: inp.spacex },
    { key: 'tsla', value: inp.tslaValue, basis: inp.tslaBasis, dev: 0, a: inp.tsla },
    { key: 'goog', value: inp.googValue, basis: inp.googBasis, dev: 0, a: inp.goog },
    { key: 'div', value: 0, basis: 0, dev: 0, a: inp.div },
  ]
  const spacex = holdings[0]
  const div = holdings[3]
  const cashRef = { v: inp.cashUsd }
  let fx = inp.eurUsd > 0 ? inp.eurUsd : 1
  let house = 0
  let mortgage = 0
  let ploan = 0
  let cumTaxEur = 0
  let cumInterestEur = 0
  let ruinYear: number | null = null

  // Sell a fraction of SpaceX, pay cap-gains tax on the gain, and move ONLY the after-tax
  // proceeds into the diversified bucket — never 100% of proceeds reinvested. Records the
  // traced conversion into `flow`.
  const diversifySpacex = (frac: number, flow: YearFlow) => {
    if (frac <= 0 || spacex.value <= 1) return
    const sellV = spacex.value * frac
    const tax = Math.max(0, sellV * (1 - spacex.basis / spacex.value)) * inp.capGainsRate
    spacex.value -= sellV
    spacex.basis -= spacex.basis * frac
    const net = sellV - tax
    div.value += net
    div.basis += net
    flow.sellSpacex += sellV
    flow.spacexToDivGross += sellV
    flow.tax += tax
    flow.divTax += tax
    flow.toDiv += net
  }

  // t=0 — buy the house per strategy, then setup capex, then optional one-time diversification
  const f0 = makeFlow()
  if (inp.strategy === 'outright') {
    if (raiseNet(cashRef, holdings, inp.housePriceEur * fx, inp.capGainsRate, f0, 'spacex').short) ruinYear = 0
    f0.house += inp.housePriceEur * fx
  } else if (inp.strategy === 'borrow') {
    mortgage = inp.housePriceEur * inp.mortgageLtv
    let remEur = inp.housePriceEur - mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    ploan = Math.min(remEur, inp.sblocMaxLtv * portfolioEur)
    remEur -= ploan
    if (remEur > 0 && raiseNet(cashRef, holdings, remEur * fx, inp.capGainsRate, f0, 'spacex').short) ruinYear = 0
    f0.loan += (mortgage + ploan) * fx
    f0.house += inp.housePriceEur * fx
  } else {
    const sellEur = inp.housePriceEur * inp.hybridSellPct
    if (raiseNet(cashRef, holdings, sellEur * fx, inp.capGainsRate, f0, 'spacex').short) ruinYear = 0
    const borrowEur = inp.housePriceEur - sellEur
    mortgage = Math.min(borrowEur, inp.housePriceEur * inp.mortgageLtv)
    const afterMortEur = borrowEur - mortgage
    const portfolioEur = holdings.reduce((s, h) => s + h.value, 0) / fx
    ploan = Math.min(afterMortEur, inp.sblocMaxLtv * portfolioEur)
    const unfundedEur = afterMortEur - ploan
    if (unfundedEur > 0 && raiseNet(cashRef, holdings, unfundedEur * fx, inp.capGainsRate, f0, 'spacex').short) ruinYear = 0
    f0.loan += (mortgage + ploan) * fx
    f0.house += inp.housePriceEur * fx
  }
  house = inp.housePriceEur
  if (inp.setupCapexEur > 0) {
    if (raiseNet(cashRef, holdings, inp.setupCapexEur * fx, inp.capGainsRate, f0, 'spacex').short) ruinYear = 0
    f0.setup += inp.setupCapexEur * fx
  }
  diversifySpacex(inp.spacexInitialDivPct, f0)
  cumTaxEur += f0.tax / fx

  const amortize = inp.loanTermYears >= 1 && inp.loanTermYears <= 30
  const annuity = (P: number, r: number) =>
    amortize && P > 0 ? (r > 0 ? (P * r) / (1 - Math.pow(1 + r, -inp.loanTermYears)) : P / inp.loanTermYears) : 0
  const mortgageAnnuity = annuity(mortgage, inp.mortgageRate)
  const ploanAnnuity = annuity(ploan, inp.sblocRate)

  const rows: YearRow[] = []
  const record = (year: number, burnEur: number, marginCallEur: number, flow: YearFlow) => {
    const liquidUsd = cashRef.v + holdings.reduce((s, h) => s + h.value, 0)
    const liquidEur = liquidUsd / fx
    const e = (v: number) => v / fx // flows recorded in USD → EUR at this year's fx
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
      flow: {
        sellSpacex: e(flow.sellSpacex), sellTsla: e(flow.sellTsla), sellGoog: e(flow.sellGoog), sellDiv: e(flow.sellDiv),
        cash: e(flow.cash), loan: e(flow.loan), tax: e(flow.tax), house: e(flow.house), setup: e(flow.setup),
        living: e(flow.living), interest: e(flow.interest), principal: e(flow.principal), wealthTax: e(flow.wealthTax),
        toDiv: e(flow.toDiv), spacexToDivGross: e(flow.spacexToDivGross), divTax: e(flow.divTax),
      },
    })
  }
  record(0, 0, 0, f0)

  for (let year = 1; year <= inp.horizon; year++) {
    const flow = makeFlow()
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
    if (stochastic && inp.impairProb > 0 && spacex.value > 1 && u() < inp.impairProb) {
      spacex.value *= inp.impairTo
    }
    cashRef.v *= 1 + inp.cashRate
    house *= 1 + inp.houseGrowth
    if (stochastic) {
      const z = gaussian(u)
      fx *= (1 + inp.fxDrift) * Math.exp(inp.fxVol * z)
    } else {
      fx *= 1 + inp.fxDrift
    }

    diversifySpacex(inp.spacexTrimPct, flow)

    const infl = Math.pow(1 + inp.inflation, year)
    const burnEur =
      (inp.burnHouseOps + inp.burnSchooling + inp.burnChildcare + inp.burnHealth + inp.burnGeneral +
        inp.burnTravel + inp.burnInsurance + inp.burnAdvisory) * infl
    const interestEur = mortgage * inp.mortgageRate + ploan * inp.sblocRate
    const mortgagePrincipal = amortize ? Math.min(mortgage, Math.max(0, mortgageAnnuity - mortgage * inp.mortgageRate)) : 0
    const ploanPrincipal = amortize ? Math.min(ploan, Math.max(0, ploanAnnuity - ploan * inp.sblocRate)) : 0
    mortgage -= mortgagePrincipal
    ploan -= ploanPrincipal
    cumInterestEur += interestEur
    const debtServiceEur = interestEur + mortgagePrincipal + ploanPrincipal
    const netWorthNowEur = cashRef.v / fx + holdings.reduce((s, h) => s + h.value, 0) / fx + house - mortgage - ploan
    const wealthTaxEur = inp.wealthTaxRate > 0 ? Math.max(0, netWorthNowEur) * inp.wealthTaxRate : 0
    if (raiseNet(cashRef, holdings, (burnEur + debtServiceEur + wealthTaxEur) * fx, inp.capGainsRate, flow).short && ruinYear === null) ruinYear = year
    flow.living += burnEur * fx
    flow.interest += interestEur * fx
    flow.principal += (mortgagePrincipal + ploanPrincipal) * fx
    flow.wealthTax += wealthTaxEur * fx

    let marginCallEur = 0
    if (ploan > 0) {
      const portUsd = cashRef.v + holdings.reduce((s, h) => s + h.value, 0)
      const ploanUsd = ploan * fx
      if (ploanUsd > inp.sblocMaxLtv * portUsd) {
        const grossUsd = (ploanUsd - inp.sblocMaxLtv * portUsd) / (1 - inp.sblocMaxLtv)
        if (raiseNet(cashRef, holdings, grossUsd, inp.capGainsRate, flow).short && ruinYear === null) ruinYear = year
        const paydownUsd = Math.min(grossUsd, ploanUsd)
        ploan -= paydownUsd / fx
        flow.principal += paydownUsd
        marginCallEur = paydownUsd / fx
      }
    }
    cumTaxEur += flow.tax / fx + wealthTaxEur

    record(year, burnEur, marginCallEur, flow)
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
