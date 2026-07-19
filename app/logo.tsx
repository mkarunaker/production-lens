export function ProductionLensLogo({ size = 34 }: { size?: number }) {
  return <svg className="production-logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="29" cy="29" r="23" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M29 2v6M29 50v6M2 29h6M50 29h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <rect x="16" y="21" width="26" height="20" rx="8" fill="currentColor" />
    <circle cx="24" cy="30" r="2.7" fill="var(--paper)" /><circle cx="34" cy="30" r="2.7" fill="var(--paper)" />
    <path d="M27 36h4" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="29" cy="16" r="3" fill="currentColor" /><path d="M29 18v3" stroke="currentColor" strokeWidth="2" />
    <circle cx="48" cy="47" r="12" fill="var(--green-dark)" stroke="var(--lime)" strokeWidth="3" />
    <path d="m42 47 4 4 8-9" fill="none" stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
