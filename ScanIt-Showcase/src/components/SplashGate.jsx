import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { LogoMark } from './Logo'

const THUMB = 56
const TRACK_W = 280
const MAX_X = TRACK_W - THUMB   // 224 — fixed, so useTransform inputs never change

function rand(min, max) {
  return min + Math.random() * (max - min)
}

// Seeded once outside the component so particles are stable across re-renders
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size:   rand(3, 7),
  left:   rand(8, 92),
  top:    rand(15, 85),
  drift:  rand(-40, 40),
  rise:   rand(60, 120),
  dur:    rand(3, 6),
  delay:  rand(0, 5),
  rDelay: rand(1, 4),
}))

function Particle({ p }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        width:  p.size,
        height: p.size,
        left:   `${p.left}%`,
        top:    `${p.top}%`,
        background: 'var(--color-primary)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.5, 0], scale: [0, 1, 0], x: p.drift, y: -p.rise }}
      transition={{
        duration:    p.dur,
        delay:       p.delay,
        repeat:      Infinity,
        repeatDelay: p.rDelay,
        ease:        'easeOut',
      }}
    />
  )
}

export default function SplashGate() {
  const [sliderVisible, setSliderVisible] = useState(false)
  const [exiting, setExiting]             = useState(false)
  const [gone, setGone]                   = useState(false)

  const x        = useMotionValue(0)
  // Use the fixed MAX_X constant — inputs never change, so this is always valid
  const fillW    = useTransform(x, [0, MAX_X], [0, MAX_X])
  const hintAlpha = useTransform(x, [0, MAX_X * 0.3], [1, 0])

  // Lock scroll while visible
  useEffect(() => {
    if (!gone) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [gone])

  // Show slider after logo settles
  useEffect(() => {
    const t = setTimeout(() => setSliderVisible(true), 1800)
    return () => clearTimeout(t)
  }, [])

  function snapAndExit() {
    // manually drive thumb to end, then wipe screen
    x.set(MAX_X)
    setExiting(true)
    setTimeout(() => setGone(true), 750)
  }

  function onDragEnd() {
    const cur = x.get()
    if (cur >= MAX_X * 0.75) {
      snapAndExit()
    } else {
      // spring back to start
      x.set(0)
    }
  }

  if (gone) return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#0d0b08',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      animate={exiting ? { clipPath: 'circle(0% at 50% 50%)' } : { clipPath: 'circle(150% at 50% 50%)' }}
      transition={exiting ? { duration: 0.7, ease: [0.76, 0, 0.24, 1] } : { duration: 0 }}
    >
      {/* dark radial bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 10%, #2e1a08 0%, #120e09 60%, transparent 100%)',
        }}
      />

      {/* ambient particles */}
      {PARTICLES.map((p) => <Particle key={p.id} p={p} />)}

      {/* big orange glow */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{ width: 500, height: 500, background: 'rgba(232,104,42,0.18)', filter: 'blur(100px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* blue accent glow */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{ width: 280, height: 280, background: 'rgba(26,158,212,0.12)', filter: 'blur(80px)' }}
        animate={{ x: [-30, 30, -30], y: [20, -20, 20] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* scan line sweeping across logo area */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: '50%',
          translateX: '-50%',
          top: 'calc(50% - 110px)',
          width: 200,
          height: 1,
          background: 'linear-gradient(to right, transparent, var(--color-accent), transparent)',
        }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 80, opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.8, delay: 0.8, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' }}
      />

      {/* ── LOGO ── */}
      <motion.div
        className="relative z-10"
        initial={{ y: -160, opacity: 0, rotate: -10, scale: 0.75 }}
        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.1 }}
      >
        {/* glow behind icon */}
        <motion.div
          className="absolute rounded-[22%]"
          style={{
            width: 108, height: 108, top: -4, left: -4,
            background: 'rgba(232,104,42,0.35)',
            filter: 'blur(20px)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <LogoMark size={100} />
      </motion.div>

      {/* ── WORDMARK + TAGLINE ── */}
      <motion.div
        className="relative z-10 mt-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
          Scan<span style={{ color: 'var(--color-primary-light)' }}>It</span>
        </h1>
        <motion.p
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 8 }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden:   {},
            visible:  { transition: { staggerChildren: 0.04, delayChildren: 0.85 } },
          }}
        >
          {"Know it's real before you buy it.".split('').map((ch, i) => (
            <motion.span
              key={i}
              variants={{
                hidden:  { opacity: 0, y: 6 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </motion.p>
      </motion.div>

      {/* ── SLIDER ── */}
      <AnimatePresence>
        {sliderVisible && !exiting && (
          <motion.div
            key="slider"
            style={{ width: TRACK_W, position: 'relative', zIndex: 10, marginTop: 56 }}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {/* "Slide to explore" label */}
            <motion.p
              style={{
                opacity: hintAlpha,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                marginBottom: 10,
              }}
            >
              Slide to explore
            </motion.p>

            {/* track */}
            <div
              style={{
                position: 'relative',
                height: THUMB,
                width: TRACK_W,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              {/* orange fill */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0, left: 0,
                  width: fillW,
                  background: 'linear-gradient(to right, var(--color-primary-dark), var(--color-primary), var(--color-primary-light))',
                  borderRadius: 999,
                }}
              />

              {/* shimmer sweep */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  width: 80,
                  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)',
                  pointerEvents: 'none',
                }}
                animate={{ x: [-80, TRACK_W + 80] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
              />

              {/* "Continue →" label */}
              <motion.div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8,
                  pointerEvents: 'none',
                  opacity: hintAlpha,
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Continue
                </span>
                {/* bouncing chevrons */}
                {[0, 0.15, 0.3].map((d) => (
                  <motion.span
                    key={d}
                    style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1 }}
                    animate={{ x: [0, 4, 0], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: d }}
                  >
                    ›
                  </motion.span>
                ))}
              </motion.div>

              {/* draggable thumb */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: MAX_X }}
                dragElastic={0.02}
                dragMomentum={false}
                onDragEnd={onDragEnd}
                style={{
                  x,
                  position: 'absolute',
                  top: 0, left: 0,
                  width: THUMB, height: THUMB,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  touchAction: 'none',
                  zIndex: 10,
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92, cursor: 'grabbing' }}
              >
                <motion.svg
                  width="22" height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </motion.svg>
              </motion.div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 10 }}>
              swipe right to continue →
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom label */}
      <motion.p
        style={{
          position: 'absolute', bottom: 32,
          fontSize: 10, fontWeight: 500,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.18)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        Ghana&apos;s AI Product Scanner
      </motion.p>
    </motion.div>
  )
}
