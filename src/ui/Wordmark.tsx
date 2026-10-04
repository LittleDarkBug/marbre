export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <svg className="wordmark-reg" viewBox="0 0 20 20" width={size * 0.9} height={size * 0.9} aria-hidden="true">
        <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 0v20M0 10h20" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="wordmark-text">Marbre</span>
    </span>
  )
}
