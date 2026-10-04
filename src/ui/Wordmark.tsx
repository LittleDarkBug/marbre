export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <svg className="wordmark-mark" viewBox="0 0 20 20" width={size * 0.95} height={size * 0.95} aria-hidden="true">
        <rect x="1.5" y="1.5" width="17" height="17" rx="4.5" fill="currentColor" />
        <rect x="5" y="5.5" width="5.4" height="9" rx="1" fill="var(--paper)" />
        <rect x="11.8" y="5.5" width="3.2" height="4" rx="1" fill="var(--paper)" />
        <rect x="11.8" y="10.5" width="3.2" height="4" rx="1" fill="var(--paper)" opacity="0.55" />
      </svg>
      <span className="wordmark-text">Marbre</span>
    </span>
  )
}
