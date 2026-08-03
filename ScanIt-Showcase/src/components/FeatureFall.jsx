import { motion } from 'framer-motion'

const ICONS = {
  scan: <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M3 12h18" strokeLinecap="round" />,
  tag: <path d="M12 2 L21 11 L13 19 a2 2 0 0 1-2.8 0 L3 11.8 V4 a2 2 0 0 1 2-2 h7Z M8 6.5 h.01" strokeLinecap="round" strokeLinejoin="round" />,
  shield: <path d="M12 3 l7 3 v6 c0 4.4-3 7.6-7 9 -4-1.4-7-4.6-7-9V6 Z M9 12 l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />,
  phone: <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.4 21 3 13.6 3 4.5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.44.57 3.55a1 1 0 0 1-.25 1.03Z" strokeLinecap="round" strokeLinejoin="round" />,
  sparkle: <path d="M12 3 l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z M19 3l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" strokeLinecap="round" strokeLinejoin="round" />,
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />,
}

const FEATURES = [
  { icon: 'scan',     title: 'AI product recognition', body: 'Just point and shoot — no barcode or QR code needed to identify what you\'re looking at.' },
  { icon: 'tag',      title: 'Price comparison',        body: 'See how a product\'s price stacks up across vendors, in Ghana Cedi (₵).' },
  { icon: 'shield',   title: 'Authenticity checks',     body: 'Flags counterfeit and suspicious products before you hand over your money.' },
  { icon: 'phone',    title: 'Seller hotlines',         body: 'Call, WhatsApp, or message a real seller directly from the app.' },
  { icon: 'sparkle',  title: 'Smart recommendations',   body: 'Surfaces cheaper alternatives nearby when a better deal exists.' },
  { icon: 'bookmark', title: 'Saved products',          body: 'Bookmark anything you\'ve scanned to track its price over time.' },
]

const headingWords = 'Built to protect every purchase'.split(' ')

function FeatureCard({ icon, title, body, index }) {
  const col = index % 3
  return (
    <motion.div
      initial={{ y: -60, opacity: 0, rotate: index % 2 === 0 ? -3 : 3 }}
      whileInView={{ y: 0, opacity: 1, rotate: 0 }}
      viewport={{ amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14, mass: 0.9, delay: col * 0.1 }}
      whileHover={{ y: -10, scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-light)] bg-white p-6 shadow-[0_8px_24px_-12px_rgba(62,44,35,0.18)]"
    >
      {/* shimmer on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0"
        whileHover={{ opacity: 1, x: ['−120%', '220%'] }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      />
      {/* bottom glow bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.35 }}
      />
      {/* hover border glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
        style={{ boxShadow: '0 0 0 1.5px var(--color-primary), 0 16px 40px -12px rgba(232,104,42,0.3)' }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      <motion.div
        whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.12 }}
        transition={{ duration: 0.5 }}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 transition-colors duration-300 group-hover:bg-[var(--color-primary)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" className="transition-colors duration-300 group-hover:stroke-white">
          {ICONS[icon]}
        </svg>
      </motion.div>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-secondary)]">{body}</p>
    </motion.div>
  )
}

export default function FeatureFall() {
  return (
    <section id="features" className="relative overflow-hidden bg-white py-24">
      {/* floating background orbs */}
      <motion.div
        className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[var(--color-primary)]/8 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[var(--color-accent)]/8 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.8 }}
            transition={{ duration: 0.4 }}
            className="text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]"
          >
            Everything in one scan
          </motion.span>

          <h2 className="mt-3 flex flex-wrap justify-center gap-x-2 text-3xl font-extrabold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {headingWords.map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            ))}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} index={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}
