import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

/** A stylized illustration of the scan flow — not a literal screenshot of the app,
 *  just a visual sense of what scanning + verifying a product feels like. */
export default function PhoneMockup() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springCfg = { stiffness: 150, damping: 18, mass: 0.6 }
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), springCfg)
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), springCfg)

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function handleLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.div
      className="relative mx-auto w-[260px] sm:w-[290px]"
      style={{ perspective: 900 }}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* soft glow behind the phone */}
      <motion.div
        className="absolute inset-0 -z-10 scale-90 rounded-[3rem] bg-[var(--color-primary)]/25 blur-3xl"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-[2.6rem] border-[8px] border-[var(--color-near-black)] bg-[var(--color-near-black)] shadow-2xl"
      >
        <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[var(--color-near-black)]" />

        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-[#2c1f14] to-[var(--color-near-black)]">
          {/* viewfinder */}
          <div className="absolute inset-6 top-14 rounded-3xl border-2 border-white/15">
            {['top-2 left-2 border-t-2 border-l-2 rounded-tl-lg', 'top-2 right-2 border-t-2 border-r-2 rounded-tr-lg', 'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg', 'bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg'].map(
              (cls, i) => (
                <span key={i} className={`absolute h-6 w-6 border-white ${cls}`} />
              ),
            )}
            <motion.div
              className="absolute inset-x-4 h-0.5 rounded-full bg-[var(--color-primary-light)]"
              animate={{ top: ['12%', '85%', '12%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: '0 0 12px 2px rgba(255,140,74,0.7)' }}
            />
          </div>

          {/* verified chip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: [8, 0, 0, -3, 0] }}
            transition={{
              opacity: { delay: 0.6, duration: 0.5 },
              y: { delay: 0.6, duration: 2.4, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' },
            }}
            className="absolute right-6 top-16 flex items-center gap-1.5 rounded-full bg-[var(--color-success)] px-2.5 py-1 text-[10px] font-bold text-white shadow-lg"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Authentic
          </motion.div>

          {/* result card sliding up */}
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-3 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-primary)]"
                animate={{ rotate: [0, 6, 0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              />
              <div className="min-w-0 flex-1">
                <div className="h-2 w-3/4 rounded bg-[var(--color-ink)]/80" />
                <div className="mt-1.5 h-2 w-1/2 rounded bg-[var(--color-ink-muted)]/50" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[var(--color-border-light)] pt-2">
              <span className="text-[10px] text-[var(--color-ink-secondary)]">Best price</span>
              <span className="text-xs font-bold text-[var(--color-primary)]">₵ 189.00</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
