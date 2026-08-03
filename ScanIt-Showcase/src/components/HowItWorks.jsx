import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const STEPS = [
  { n: '01', title: 'Scan it',                 body: 'Open the camera and point it at any product — no barcode, no typing.' },
  { n: '02', title: 'Verify it',               body: 'AI checks packaging for authenticity and pulls live prices from vendors.' },
  { n: '03', title: 'Decide with confidence',  body: 'See the best price nearby, or message a seller directly — right from the result.' },
]

function StepCard({ step, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.5 })   // no once — fires both scroll directions

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.4 }}
      transition={{ type: 'spring', stiffness: 130, damping: 16, delay: index * 0.14 }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 280, damping: 18 } }}
      className="group relative text-center"
    >
      {/* step number circle with ping rings */}
      <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
        {/* ping ring 1 */}
        {inView && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[var(--color-primary)]"
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0 }}
          />
        )}
        {/* ping ring 2 */}
        {inView && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[var(--color-primary)]"
            animate={{ scale: [1, 2.2], opacity: [0.35, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
          />
        )}
        <motion.div
          whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(232,104,42,0.7)]"
        >
          {step.n}
        </motion.div>
      </div>

      <h3 className="text-lg font-bold text-white transition-colors duration-300 group-hover:text-[var(--color-primary-light)]">
        {step.title}
      </h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">
        {step.body}
      </p>
    </motion.div>
  )
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-28"
      style={{ background: 'linear-gradient(160deg, #0f0a07 0%, #1c1008 50%, #0d1218 100%)' }}
    >
      {/* dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(232,104,42,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          maskImage:       'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* background glows */}
      <motion.div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-primary)]/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-accent)]/12 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* heading */}
        <div className="mx-auto max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.8 }}
            className="text-sm font-bold uppercase tracking-widest text-[var(--color-accent)]"
          >
            Simple by design
          </motion.span>

          <h2 className="mt-3 flex flex-wrap justify-center gap-x-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {['How', 'it', 'works'].map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            ))}
          </h2>
        </div>

        {/* steps */}
        <div className="relative mt-20 grid grid-cols-1 gap-12 sm:grid-cols-3">
          {/* animated connector line */}
          <div className="absolute top-7 left-0 right-0 hidden h-px bg-white/10 sm:block" />
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ amount: 0.4 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'left' }}
            className="absolute top-7 left-0 right-0 hidden h-px bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] sm:block"
          />

          {STEPS.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
