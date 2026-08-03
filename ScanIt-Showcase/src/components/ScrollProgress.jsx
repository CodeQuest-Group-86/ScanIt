import { motion, useScroll, useSpring } from 'framer-motion'

/** Thin gradient bar pinned under the navbar that fills as you scroll down the page. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[var(--color-primary-light)] via-[var(--color-primary)] to-[var(--color-accent)]"
    />
  )
}
