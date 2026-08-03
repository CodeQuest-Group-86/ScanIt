import { motion } from 'framer-motion'

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.44 2.06-1.32 2.94-.98.98-2.06 1.4-3.19 1.32-.13-1.1.44-2.24 1.28-3.03.86-.82 2.14-1.36 3.23-1.23zM20.5 17.34c-.5 1.14-.74 1.65-1.38 2.65-.9 1.4-2.16 3.14-3.73 3.15-1.4.02-1.76-.92-3.66-.91-1.9.01-2.3.93-3.7.91-1.57-.02-2.76-1.6-3.66-3-2.5-3.9-2.77-8.47-1.22-10.9 1.1-1.74 2.84-2.75 4.47-2.75 1.66 0 2.7.92 4.08.92 1.34 0 2.14-.92 4.08-.92 1.45 0 2.99.79 4.08 2.16-3.59 1.97-3.01 7.1.64 8.69z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.6 2.6c-.36.36-.6.9-.6 1.53v15.74c0 .63.24 1.17.6 1.53l.1.08 8.83-8.83v-.2L3.7 2.52l-.1.08z" />
      <path d="M15.3 14.5l-2.94-2.94v-.2l2.94-2.94.07.04 3.49 1.98c1 .57 1 1.5 0 2.07l-3.49 1.98-.07.01z" />
      <path d="M15.37 14.46l-3.01-3.01L3.6 20.28c.33.35.87.39 1.48.05l10.29-5.87" />
      <path d="M15.37 8.54l-10.29-5.87c-.61-.34-1.15-.3-1.48.05l8.76 8.83 3.01-3.01z" />
    </svg>
  )
}

function Badge({ icon, eyebrow, label }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03, opacity: 1, borderColor: 'rgba(255,255,255,0.35)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-[var(--color-near-black)] px-4 py-2.5 text-white opacity-90 select-none"
      aria-disabled="true"
    >
      <motion.span
        className="flex"
        whileHover={{ rotate: [0, -10, 10, -6, 0] }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.span>
      <div className="text-left leading-none">
        <div className="text-[10px] tracking-wide text-white/60">{eyebrow}</div>
        <div className="text-sm font-semibold">{label}</div>
      </div>
    </motion.div>
  )
}

/** Not live links — the app isn't published on either store yet, so these are honest
 *  "coming soon" badges rather than dead/fabricated store URLs. */
export default function StoreBadges({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Badge icon={<AppleIcon />} eyebrow="Coming soon on the" label="App Store" />
      <Badge icon={<PlayIcon />} eyebrow="Coming soon on" label="Google Play" />
    </div>
  )
}
