// One loading state for every page, on both sides. Colours come from the --rs-* tokens
// (see styles/theme-tokens.css), so it is orange on /ws and follows the phase on /hs.
export default function PageLoader({ label = 'Loading…', fill = true }: { label?: string; fill?: boolean }) {
  return (
    <div
      className="rs-loader-wrap"
      style={fill ? { minHeight: 'calc(100vh - 4rem)' } : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="rs-loader-card">
        <div className="rs-loader-spinner" aria-hidden />
        <p className="rs-loader-label">{label}</p>
      </div>
    </div>
  );
}
