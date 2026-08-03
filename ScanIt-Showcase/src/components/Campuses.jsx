import { motion } from 'framer-motion'

function GenericCampusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8">
      <path d="M12 3 2 8l10 5 10-5-10-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V16c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 8v6" strokeLinecap="round" />
    </svg>
  )
}

const CAMPUSES = [
  { abbr: 'KNUST', name: 'Kwame Nkrumah University of Science and Technology' },
  { abbr: 'UG',    name: 'University of Ghana'                                 },
  { abbr: 'UCC',   name: 'University of Cape Coast'                            },
  { abbr: 'UPSA',  name: 'University of Professional Studies, Accra'           },
]

const HEADING = 'Popular with students at'

export default function Campuses() {
  return (
    <section id="campuses" className="relative overflow-hidden bg-white py-24">
      {/* dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(232,104,42,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          maskImage:       'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
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
            Already on campus
          </motion.span>

          {/* char-by-char heading */}
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {HEADING.split('').map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, rotateX: -60, y: 10 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ delay: i * 0.028, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block', transformOrigin: 'bottom' }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {CAMPUSES.map((c, i) => (
            <motion.div
              key={c.abbr}
              initial={{ opacity: 0, y: 40, scale: 0.85 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ amount: 0.4 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
              className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-7 text-center"
            >
              {/* hover glow border */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
                style={{ boxShadow: '0 0 0 1.5px var(--color-primary), 0 12px 32px -8px rgba(232,104,42,0.25)' }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.22 }}
              />

              {/* icon — spins in */}
              <motion.div
                initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
                whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                viewport={{ amount: 0.5 }}
                transition={{ type: 'spring', stiffness: 160, damping: 14, delay: i * 0.1 + 0.1 }}
                whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
              >
                <GenericCampusIcon />
              </motion.div>

              <div>
                <div className="text-base font-extrabold text-[var(--color-ink)]">{c.abbr}</div>
                <div className="mt-0.5 text-xs leading-snug text-[var(--color-ink-secondary)]">{c.name}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
