import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import PhoneMockup from './PhoneMockup'
import StoreBadges from './StoreBadges'

const WORDS_LINE1 = ["Know", "it's", "real"]
const WORDS_LINE2 = ["before", "you", "buy", "it."]

const wordVariants = {
  hidden: { opacity: 0, y: 32, filter: 'blur(6px)' },
  visible: (i) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { delay: i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const blob1Y = useTransform(scrollYProgress, [0, 1], [0, -120])
  const blob1X = useTransform(scrollYProgress, [0, 1], [0, 60])
  const blob2Y = useTransform(scrollYProgress, [0, 1], [0, -80])
  const blob2X = useTransform(scrollYProgress, [0, 1], [0, -40])
  const blob3Y = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <section
      ref={ref}
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-[#fff6ec] via-[var(--color-surface)] to-[var(--color-surface)] pt-32 pb-20 sm:pt-40"
    >
      {/* blob 1 — parallax + drift */}
      <motion.div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[var(--color-primary)]/15 blur-3xl"
        style={{ y: blob1Y, x: blob1X }}
        animate={{ x: [0, -20, 0], y: [0, 24, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* blob 2 — parallax + drift */}
      <motion.div
        className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[var(--color-accent)]/10 blur-3xl"
        style={{ y: blob2Y, x: blob2X }}
        animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      {/* blob 3 — center breathing orb */}
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]/5 blur-3xl"
        style={{ y: blob3Y }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center lg:text-left"
        >
          {/* badge with shimmer */}
          <div className="relative inline-flex overflow-hidden rounded-full">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.04 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary-dark)]"
            >
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
                animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              Built for Ghana&apos;s market
            </motion.span>
            {/* shimmer sweep */}
            <motion.span
              className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              initial={{ x: '-120%' }}
              animate={{ x: '220%' }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
            />
          </div>

          {/* headline — word stagger */}
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-[3.4rem]">
            <span className="flex flex-wrap justify-center gap-x-3 lg:justify-start">
              {WORDS_LINE1.map((w, i) => (
                <motion.span key={w} custom={i} initial="hidden" animate="visible" variants={wordVariants}>
                  {w}
                </motion.span>
              ))}
            </span>
            <span className="flex flex-wrap justify-center gap-x-3 text-[var(--color-primary)] lg:justify-start">
              {WORDS_LINE2.map((w, i) => (
                <motion.span key={w} custom={WORDS_LINE1.length + i} initial="hidden" animate="visible" variants={wordVariants}>
                  {w}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.55 }}
            className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-[var(--color-ink-secondary)] lg:mx-0"
          >
            Point your camera at any product to instantly compare prices, verify
            authenticity, and find sellers near you — no barcode required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8 flex flex-col items-center gap-4 lg:items-start"
          >
            {/* CTA with pulse */}
            <motion.a
              href="#download"
              whileHover={{ scale: 1.06, boxShadow: '0 16px 34px -8px rgba(232,104,42,0.85)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              animate={{ boxShadow: ['0 12px 28px -8px rgba(232,104,42,0.5)', '0 12px 36px -4px rgba(232,104,42,0.85)', '0 12px 28px -8px rgba(232,104,42,0.5)'] }}
              style={{ transition: 'none' }}
              className="rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-base font-bold text-white"
            >
              Join the waitlist
            </motion.a>
            <StoreBadges />
          </motion.div>
        </motion.div>

        {/* phone — float */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: [20, 0, -16, 0] }}
          transition={{
            opacity: { duration: 0.8, delay: 0.15 },
            scale:   { duration: 0.8, delay: 0.15 },
            y: { duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.6, 1] },
          }}
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  )
}
