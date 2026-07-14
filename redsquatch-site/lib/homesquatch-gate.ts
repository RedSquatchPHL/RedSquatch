// Vanilla time-gating logic for the Work Mode <-> Downtime (HomeSquatch) theme switch.
// Deliberately dependency-free (no React) so the exact same rules can run both inside the
// React provider (components/HomeSquatchGate.tsx) and in the pre-hydration boot <script>
// injected in app/layout.tsx (which prevents a flash of the wrong theme on load).

export type GateMode = 'work' | 'downtime';

// Downtime is split into three "Evening Shift" sub-phases, each with its own
// background image + derived color scheme (styles/homesquatch-theme.css).
// null means "not in downtime" (i.e. Work Mode — no phase applies).
export type GatePhase = 'dusk' | 'midnight' | 'predawn' | null;

export const WORK_START_HOUR = 8;  // 8:00 AM — Work Mode begins
export const WORK_END_HOUR   = 17; // 5:00 PM — Downtime begins (dusk phase)

// Evening Shift phase boundaries, sorted ascending across the 24h clock.
const DUSK_START_HOUR     = 17; // 5:00 PM
const MIDNIGHT_START_HOUR = 22; // 10:00 PM
const PREDAWN_START_HOUR  = 3;  //  3:00 AM
const BOUNDARIES = [PREDAWN_START_HOUR, WORK_START_HOUR, DUSK_START_HOUR, MIDNIGHT_START_HOUR];

const OVERRIDE_KEY      = 'hs_gate_override';      // 'work' | 'downtime'
const OVERRIDE_DATE_KEY = 'hs_gate_override_date'; // ISO timestamp the override was set
const TARGET_KEY        = 'hs_gate_clockout_target'; // epoch ms, pending scheduled clock-out

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function isWorkHours(date: Date = new Date()): boolean {
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= WORK_START_HOUR && h < WORK_END_HOUR;
}

export function autoMode(date: Date = new Date()): GateMode {
  return isWorkHours(date) ? 'work' : 'downtime';
}

// Which Evening Shift phase a given hour falls in. The 8-17 (work-hours) case only
// gets reached when Downtime has been manually forced early via the Clock Out button —
// it resolves to 'dusk', since clocking out early *is* the "initial transition from Work
// Mode to Home Mode" the 5 PM image represents, just happening ahead of schedule.
function phaseForHour(h: number): 'dusk' | 'midnight' | 'predawn' {
  if (h >= PREDAWN_START_HOUR && h < WORK_START_HOUR) return 'predawn';
  if (h >= DUSK_START_HOUR && h < MIDNIGHT_START_HOUR) return 'dusk';
  if (h >= MIDNIGHT_START_HOUR || h < PREDAWN_START_HOUR) return 'midnight';
  return 'dusk'; // h in [8, 17) — only reached via an early manual clock-out
}

// Manual overrides expire at the next Work Mode boundary (8 AM) after they were set —
// otherwise clocking out at 4:30 PM would silently keep the beach theme on all day tomorrow.
function nextWorkStartAfter(d: Date): Date {
  const t = new Date(d);
  t.setHours(WORK_START_HOUR, 0, 0, 0);
  if (t <= d) t.setDate(t.getDate() + 1);
  return t;
}

export function readOverride(): GateMode | null {
  if (!hasStorage()) return null;
  const val = localStorage.getItem(OVERRIDE_KEY) as GateMode | null;
  const setIso = localStorage.getItem(OVERRIDE_DATE_KEY);
  if (!val || !setIso) return null;

  const setAt = new Date(setIso);
  if (Number.isNaN(setAt.getTime()) || new Date() >= nextWorkStartAfter(setAt)) {
    clearOverride();
    return null;
  }
  return val;
}

export function writeOverride(mode: GateMode): void {
  if (!hasStorage()) return;
  localStorage.setItem(OVERRIDE_KEY, mode);
  localStorage.setItem(OVERRIDE_DATE_KEY, new Date().toISOString());
}

export function clearOverride(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(OVERRIDE_KEY);
  localStorage.removeItem(OVERRIDE_DATE_KEY);
}

export function effectiveMode(date: Date = new Date()): GateMode {
  return readOverride() ?? autoMode(date);
}

// Phase only means anything once mode is 'downtime' — pass the already-resolved mode in
// (rather than recomputing it) so callers can't accidentally desync the two.
export function effectivePhase(mode: GateMode, date: Date = new Date()): GatePhase {
  if (mode !== 'downtime') return null;
  const h = date.getHours() + date.getMinutes() / 60;
  return phaseForHour(h);
}

// Milliseconds until the next phase/mode boundary (3/8/17/22), so callers can schedule a
// precise re-check instead of polling constantly.
export function msUntilNextBoundary(date: Date = new Date()): number {
  const hourNow = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const target = new Date(date);
  const next = BOUNDARIES.find(b => b > hourNow);

  if (next !== undefined) {
    target.setHours(next, 0, 0, 0);
  } else {
    target.setDate(target.getDate() + 1);
    target.setHours(BOUNDARIES[0], 0, 0, 0);
  }
  return Math.max(target.getTime() - date.getTime(), 1000);
}

export function readClockoutTarget(): number | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(TARGET_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeClockoutTarget(epochMs: number): void {
  if (!hasStorage()) return;
  localStorage.setItem(TARGET_KEY, String(epochMs));
}

export function clearClockoutTarget(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(TARGET_KEY);
}

// The exact logic above, serialized as a standalone (no-import) script so it can run
// before React hydrates. Keep this in sync with the functions above by hand — it can't
// import them since it executes as raw text via a beforeInteractive <script> tag.
export const GATE_BOOT_SCRIPT = `(function(){
  try {
    var WORK_START = ${WORK_START_HOUR}, WORK_END = ${WORK_END_HOUR};
    var DUSK = ${DUSK_START_HOUR}, MIDNIGHT = ${MIDNIGHT_START_HOUR}, PREDAWN = ${PREDAWN_START_HOUR};
    var d = new Date();
    var h = d.getHours() + d.getMinutes() / 60;
    var auto = (h >= WORK_START && h < WORK_END) ? 'work' : 'downtime';

    var mode = auto;
    var ov = localStorage.getItem('${OVERRIDE_KEY}');
    var ovDate = localStorage.getItem('${OVERRIDE_DATE_KEY}');
    if (ov && ovDate) {
      var setAt = new Date(ovDate);
      var expiry = new Date(setAt);
      expiry.setHours(WORK_START, 0, 0, 0);
      if (expiry <= setAt) expiry.setDate(expiry.getDate() + 1);
      if (!isNaN(setAt.getTime()) && new Date() < expiry) {
        mode = ov;
      } else {
        localStorage.removeItem('${OVERRIDE_KEY}');
        localStorage.removeItem('${OVERRIDE_DATE_KEY}');
      }
    }

    if (mode === 'downtime') {
      document.documentElement.classList.add('homesquatch-theme');
      var phase;
      if (h >= PREDAWN && h < WORK_START) phase = 'predawn';
      else if (h >= DUSK && h < MIDNIGHT) phase = 'dusk';
      else if (h >= MIDNIGHT || h < PREDAWN) phase = 'midnight';
      else phase = 'dusk';
      document.documentElement.classList.add('homesquatch-phase-' + phase);
    }
  } catch (e) {}
})();`;
