// Pure logic for the GLP-1 health modules (weight/BMI, nutrition, injections, drug
// levels). No React, no fetch — shared by every module and runnable from a plain
// script, so the math can be checked without a browser.

// ── Injection sites ──────────────────────────────────────────────────────────

// Abdomen is a 3×3 grid (upper/mid/lower × left/mid/right) minus the centre cell,
// which is the navel. Left/right are the injector's own left and right.
export const SITES = [
  'abdomen_ul', 'abdomen_um', 'abdomen_ur',
  'abdomen_ml', 'abdomen_mr',
  'abdomen_ll', 'abdomen_lm', 'abdomen_lr',
  'flank_l', 'flank_r',
  'arm_l', 'arm_r',
  'thigh_l', 'thigh_r',
] as const;
export type Site = (typeof SITES)[number];

export const SITE_LABEL: Record<Site, string> = {
  abdomen_ul: 'Abdomen: Upper Left',
  abdomen_um: 'Abdomen: Upper Mid',
  abdomen_ur: 'Abdomen: Upper Right',
  abdomen_ml: 'Abdomen: Mid Left',
  abdomen_mr: 'Abdomen: Mid Right',
  abdomen_ll: 'Abdomen: Lower Left',
  abdomen_lm: 'Abdomen: Lower Mid',
  abdomen_lr: 'Abdomen: Lower Right',
  flank_l: 'Flank: Left',
  flank_r: 'Flank: Right',
  arm_l: 'Arm: Left',
  arm_r: 'Arm: Right',
  thigh_l: 'Thigh: Left',
  thigh_r: 'Thigh: Right',
};

// ── Medications ──────────────────────────────────────────────────────────────

export const MEDICATIONS = ['tirzepatide', 'semaglutide', 'liraglutide', 'retatrutide'] as const;
export type Medication = (typeof MEDICATIONS)[number];

interface DrugProfile {
  label: string;
  halfLifeDays: number;
  // Median time to peak concentration after a subcutaneous dose, in days.
  tmaxDays: number;
}

// Half-lives are the labelled elimination half-lives; tmax is the midpoint of the
// labelled range. Retatrutide is not approved, so its numbers come from trial
// reports and are approximate.
export const DRUGS: Record<Medication, DrugProfile> = {
  tirzepatide: { label: 'Tirzepatide', halfLifeDays: 5, tmaxDays: 1.5 },
  semaglutide: { label: 'Semaglutide', halfLifeDays: 7, tmaxDays: 2 },
  liraglutide: { label: 'Liraglutide', halfLifeDays: 0.55, tmaxDays: 0.5 },
  retatrutide: { label: 'Retatrutide (approx.)', halfLifeDays: 6, tmaxDays: 1.5 },
};

// ── Weight / BMI ─────────────────────────────────────────────────────────────

export function bmi(weightLb: number, heightIn: number): number | null {
  if (!(weightLb > 0) || !(heightIn > 0)) return null;
  return (703 * weightLb) / (heightIn * heightIn);
}

export function bmiCategory(value: number): { label: string; color: string } {
  if (value < 18.5) return { label: 'Underweight', color: 'var(--rs-warn)' };
  if (value < 25) return { label: 'Normal', color: 'var(--rs-ok)' };
  if (value < 30) return { label: 'Overweight', color: 'var(--rs-warn)' };
  if (value < 35) return { label: 'Obese (Class 1)', color: 'var(--rs-bad)' };
  if (value < 40) return { label: 'Obese (Class 2)', color: 'var(--rs-bad)' };
  return { label: 'Obese (Class 3)', color: 'var(--rs-bad)' };
}

// BMI swimlanes for the weight chart: the category cut-offs as weight bands for a given height.
// `bmiLo`/`bmiHi` are the BMI limits; `lb(b)` converts one to pounds (inverse of bmi()).
export const BMI_BANDS = [
  { label: 'Underweight', short: 'Under', bmiLo: 0, bmiHi: 18.5, color: 'var(--rs-info)', alpha: 14 },
  { label: 'Normal', short: 'Normal', bmiLo: 18.5, bmiHi: 25, color: 'var(--rs-ok)', alpha: 14 },
  { label: 'Overweight', short: 'Over', bmiLo: 25, bmiHi: 30, color: 'var(--rs-warn)', alpha: 14 },
  { label: 'Obese Class 1', short: 'Obese I', bmiLo: 30, bmiHi: 35, color: 'var(--rs-bad)', alpha: 10 },
  { label: 'Obese Class 2', short: 'Obese II', bmiLo: 35, bmiHi: 40, color: 'var(--rs-bad)', alpha: 17 },
  { label: 'Obese Class 3', short: 'Obese III', bmiLo: 40, bmiHi: Infinity, color: 'var(--rs-bad)', alpha: 24 },
] as const;

export function weightAtBmi(b: number, heightIn: number): number {
  return (b * heightIn * heightIn) / 703;
}

export interface WeightPoint { t: number; lb: number }

// Trailing moving average over the last `window` entries (entries, not days — a
// person weighing in irregularly still gets a smooth line).
export function movingAverage(points: WeightPoint[], window = 7): number[] {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, p) => s + p.lb, 0) / slice.length;
  });
}

// Least-squares slope in lb/day over points within the last `days` days of the
// newest point. null when there are fewer than two points or no time spread.
export function weightSlopePerDay(points: WeightPoint[], days = 30): number | null {
  if (points.length < 2) return null;
  const latest = points[points.length - 1].t;
  const recent = points.filter(p => latest - p.t <= days * 86400000);
  if (recent.length < 2) return null;
  const xs = recent.map(p => (p.t - recent[0].t) / 86400000);
  const ys = recent.map(p => p.lb);
  const n = recent.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

// ── Drug levels ──────────────────────────────────────────────────────────────

export interface DoseEvent { t: number; mg: number; medication: Medication }

// Absorption rate constant (per day) such that the Bateman curve peaks at tmax,
// given the elimination rate ke. tmax(ka) = ln(ka/ke)/(ka-ke) falls monotonically
// from 1/ke (as ka→ke) toward 0 (as ka→∞), so bisection is safe. A tmax at or
// beyond 1/ke has no solution; it is clamped just inside the valid range.
export function absorptionRate(halfLifeDays: number, tmaxDays: number): number {
  const ke = Math.LN2 / halfLifeDays;
  const target = Math.min(tmaxDays, (1 / ke) * 0.999);
  let lo = ke * 1.000001;
  let hi = ke * 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const tmax = Math.log(mid / ke) / (mid - ke);
    if (tmax > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Amount of drug (mg) still in the body from one dose, `days` after injecting it.
export function doseRemaining(mg: number, medication: Medication, days: number): number {
  if (days <= 0) return 0;
  const { halfLifeDays, tmaxDays } = DRUGS[medication];
  const ke = Math.LN2 / halfLifeDays;
  const ka = absorptionRate(halfLifeDays, tmaxDays);
  return mg * (ka / (ka - ke)) * (Math.exp(-ke * days) - Math.exp(-ka * days));
}

// Total estimated drug in the body at time t (ms), summed over every earlier dose.
export function levelAt(doses: DoseEvent[], t: number): number {
  let total = 0;
  for (const d of doses) {
    total += doseRemaining(d.mg, d.medication, (t - d.t) / 86400000);
  }
  return total;
}

export interface LevelPoint { t: number; mg: number }

// Level sampled on a regular grid. `stepHours` trades smoothness for cost; 6h is
// plenty for week-scale dosing.
export function levelSeries(doses: DoseEvent[], fromT: number, toT: number, stepHours = 6): LevelPoint[] {
  const out: LevelPoint[] = [];
  const step = stepHours * 3600000;
  for (let t = fromT; t <= toT; t += step) out.push({ t, mg: levelAt(doses, t) });
  return out;
}

// Average amount in the body once a repeated dose has reached steady state:
// dose / (ke * interval). Compare against `levelAt(now)` to see how close the
// current dosing is to plateau.
export function steadyStateAverage(mg: number, medication: Medication, intervalDays: number): number {
  const ke = Math.LN2 / DRUGS[medication].halfLifeDays;
  return mg / (ke * intervalDays);
}

// ── Rotation & schedule ──────────────────────────────────────────────────────

export interface SiteUse { site: Site; t: number }

export interface SiteStatus {
  site: Site;
  lastUsed: number | null;
  uses: number;
}

export function siteStatuses(history: SiteUse[]): SiteStatus[] {
  return SITES.map(site => {
    const mine = history.filter(h => h.site === site);
    return {
      site,
      lastUsed: mine.length ? Math.max(...mine.map(h => h.t)) : null,
      uses: mine.length,
    };
  });
}

// Which site to inject next. Policy: the site that has gone longest without use,
// with never-used sites first; ties break toward the site with fewer total uses.
// Rotating by recency alone ignores that the same half of the body could be hit
// two weeks running, so the policy is kept in this one function to tune.
export function recommendNextSite(history: SiteUse[]): Site {
  const statuses = siteStatuses(history);
  statuses.sort((a, b) => {
    if (a.lastUsed === null && b.lastUsed !== null) return -1;
    if (b.lastUsed === null && a.lastUsed !== null) return 1;
    if (a.lastUsed !== b.lastUsed) return (a.lastUsed ?? 0) - (b.lastUsed ?? 0);
    return a.uses - b.uses;
  });
  return statuses[0].site;
}

// Typical gap between recent doses, in days. Falls back to a weekly schedule when
// there is not enough history (or the gaps look like corrections, not a schedule).
export function typicalIntervalDays(times: number[]): number {
  const sorted = [...times].sort((a, b) => b - a).slice(0, 10);
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const d = (sorted[i] - sorted[i + 1]) / 86400000;
    if (d >= 2 && d <= 14) gaps.push(d);
  }
  if (!gaps.length) return 7;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}
