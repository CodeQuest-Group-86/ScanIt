import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'
import ScrollProgress from './ScrollProgress'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#campuses', label: 'On campus' },
]

function NavLink({ href, label }) {
  return (
    <a href={href} className="group relative text-sm font-medium text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-primary)]">
      {label}
      <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-[var(--color-primary)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </a>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md shadow-[0_1px_0_var(--color-border)]'
          : 'bg-transparent'
      }`}
    >
      <ScrollProgress />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <motion.a
          href="#top"
          aria-label="ScanIt home"
          whileHover={{ scale: 1.06, rotate: -3 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Logo size={34} />
        </motion.a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <NavLink {...l} />
            </li>
          ))}
        </ul>

        <motion.a
          href="#download"
          whileHover={{ scale: 1.06, boxShadow: '0 10px 22px -4px rgba(232,104,42,0.7)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_-4px_rgba(232,104,42,0.55)]"
        >
          Get the app
        </motion.a>
      </nav>
    </motion.header>
  )
}
