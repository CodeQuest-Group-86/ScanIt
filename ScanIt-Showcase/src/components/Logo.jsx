/** Vector recreation of the app icon (scan-bracket viewfinder framing a verified shield) so
 *  it stays crisp at any size instead of scaling a raster PNG. */
export function LogoMark({ size = 40, rounded = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={rounded ? 'rounded-[22%]' : ''}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9a5c" />
          <stop offset="55%" stopColor="#e8682a" />
          <stop offset="100%" stopColor="#c4521a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#logoGrad)" />

      {/* scan corner brackets */}
      <g stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M14 26 V16 a4 4 0 0 1 4-4 H28" />
        <path d="M72 12 H82 a4 4 0 0 1 4 4 V26" />
        <path d="M14 74 V84 a4 4 0 0 1 4 4 H28" />
        <path d="M72 88 H82 a4 4 0 0 1 4-4 V74" />
      </g>

      {/* shield */}
      <path
        d="M50 22 L68 29 V50 c0 15-8 26-18 31 c-10-5-18-16-18-31 V29 Z"
        fill="#fff"
      />
      <path
        d="M42 51 L48 57 L60 44"
        stroke="#c4521a"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export default function Logo({ size = 36, withWordmark = true, dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ color: dark ? '#fff' : 'var(--color-ink)' }}
        >
          Scan<span style={{ color: 'var(--color-primary)' }}>It</span>
        </span>
      )}
    </div>
  )
}
