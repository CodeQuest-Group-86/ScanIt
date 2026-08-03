import { motion } from 'framer-motion'
import StoreBadges from './StoreBadges'

export default function Download() {
  return (
    <section id="download" className="relative overflow-hidden bg-[var(--color-near-black)] py-24">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/25 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Never guess if it&apos;s real again
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/60">
          ScanIt is launching soon. Join the waitlist and be first to know when it lands on
          your phone.
        </p>

        <div className="mt-8 flex justify-center">
          <StoreBadges />
        </div>
      </motion.div>
    </section>
  )
}
