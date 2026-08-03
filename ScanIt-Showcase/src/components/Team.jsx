import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TEAM = [
  {
    name: 'Ama Mensah',
    role: 'Founder & CEO',
    bio: 'Obsessed with building products that protect everyday Ghanaians from counterfeit goods. Former product lead at a fintech startup in Accra.',
    initials: 'AM',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    color: '#e8682a',
    socials: [
      { type: 'github',   href: 'https://github.com/',        angle: 315 },
      { type: 'linkedin', href: 'https://linkedin.com/in/',   angle: 45  },
      { type: 'email',    href: 'mailto:ama@scanit.app',      angle: 135 },
      { type: 'snapchat', href: 'https://snapchat.com/add/',  angle: 225 },
    ],
  },
  {
    name: 'Kofi Asante',
    role: 'Lead Engineer',
    bio: 'Full-stack developer who turns camera frames into real-time price intelligence. Loves Rust, React Native, and a good jollof debate.',
    initials: 'KA',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    color: '#1a9ed4',
    socials: [
      { type: 'github',   href: 'https://github.com/',       angle: 315 },
      { type: 'linkedin', href: 'https://linkedin.com/in/',  angle: 45  },
      { type: 'email',    href: 'mailto:kofi@scanit.app',    angle: 135 },
    ],
  },
  {
    name: 'Abena Osei',
    role: 'AI / ML Engineer',
    bio: 'Trained the vision models that identify products without a barcode in sight. PhD candidate in computer vision at KNUST.',
    initials: 'AO',
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
    color: '#16a34a',
    socials: [
      { type: 'github',   href: 'https://github.com/',       angle: 315 },
      { type: 'linkedin', href: 'https://linkedin.com/in/',  angle: 45  },
      { type: 'email',    href: 'mailto:abena@scanit.app',   angle: 135 },
    ],
  },
  {
    name: 'Kwame Darko',
    role: 'Product Designer',
    bio: "Crafts every pixel to feel native to Ghana's vibrant market culture. Previously designed for mobile-first apps across West Africa.",
    initials: 'KD',
    photo: 'https://randomuser.me/api/portraits/men/75.jpg',
    color: '#d97706',
    socials: [
      { type: 'linkedin', href: 'https://linkedin.com/in/',   angle: 315 },
      { type: 'snapchat', href: 'https://snapchat.com/add/',  angle: 45  },
      { type: 'email',    href: 'mailto:kwame@scanit.app',    angle: 135 },
    ],
  },
  {
    name: 'Efua Boateng',
    role: 'Growth & Partnerships',
    bio: 'Connects ScanIt with vendors, campuses, and communities across Ghana. Built our first 10 university partnerships in 3 months.',
    initials: 'EB',
    photo: 'https://randomuser.me/api/portraits/women/90.jpg',
    color: '#7c3aed',
    socials: [
      { type: 'linkedin', href: 'https://linkedin.com/in/',   angle: 315 },
      { type: 'snapchat', href: 'https://snapchat.com/add/',  angle: 45  },
      { type: 'email',    href: 'mailto:efua@scanit.app',     angle: 135 },
    ],
  },
]

/* ── social icons ── */
const ICONS = {
  github: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  ),
  linkedin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  snapchat: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.173.084.298.084.235-.001.487-.092.69-.179.062-.026.127-.053.193-.073a1.8 1.8 0 0 1 .538-.083c.37 0 .739.1 1.028.283.282.18.44.42.44.668 0 .37-.317.7-.945.984-.103.047-.218.092-.344.136-.652.23-1.496.528-1.677 1.513-.046.255-.02.494.021.673l.003.01c.08.232.215.476.387.7l.034.044c.17.222.38.44.614.624.413.326.867.54 1.376.54.108 0 .22-.013.331-.036.284-.057.572-.2.822-.398.08.215.125.444.125.678-.001.254-.069.49-.2.695-.199.31-.519.547-.91.699-.124.048-.25.087-.37.118l-.054.014c-.23.057-.5.114-.778.168-.27.052-.543.112-.79.202-.156.057-.313.12-.445.222-.38.292-.46.74-.534 1.142-.014.078-.028.153-.045.225-.025.114-.07.233-.128.341-.045.085-.098.164-.167.235a1.34 1.34 0 0 1-.42.284c-.205.082-.443.12-.7.12-.26 0-.534-.04-.794-.12-.293-.088-.575-.22-.83-.37a5.28 5.28 0 0 0-2.697-.72 5.35 5.35 0 0 0-2.697.72c-.255.15-.537.282-.83.37-.26.08-.534.12-.794.12-.257 0-.495-.038-.7-.12a1.34 1.34 0 0 1-.42-.284 1.14 1.14 0 0 1-.167-.235 1.612 1.612 0 0 1-.128-.341c-.017-.072-.031-.147-.045-.225-.074-.402-.154-.85-.534-1.142-.132-.102-.289-.165-.445-.222-.247-.09-.52-.15-.79-.202-.278-.054-.548-.111-.778-.168l-.054-.014a3.63 3.63 0 0 1-.37-.118c-.391-.152-.711-.389-.91-.699-.131-.205-.199-.441-.2-.695 0-.234.045-.463.125-.678.25.198.538.341.822.398.111.023.223.036.331.036.509 0 .963-.214 1.376-.54.234-.184.444-.402.614-.624l.034-.044c.172-.224.307-.468.387-.7l.003-.01c.041-.179.067-.418.021-.673-.181-.985-1.025-1.283-1.677-1.513a5.062 5.062 0 0 1-.344-.136C3.317 9.7 3 9.37 3 9c0-.248.158-.488.44-.668.289-.183.658-.283 1.028-.283.183 0 .364.028.538.083.066.02.131.047.193.073.203.087.455.18.69.179.125 0 .223-.039.298-.084-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.853 1.07 11.21.794 12.206.794Z" />
    </svg>
  ),
  email: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
}

const SOCIAL_COLOR = {
  github:   { bg: '#24292e', fg: '#fff' },
  linkedin: { bg: '#0077b5', fg: '#fff' },
  snapchat: { bg: '#FFFC00', fg: '#000' },
  email:    { bg: '#e8682a', fg: '#fff' },
}

/* ── floating social icon, positioned around the circle via angle ── */
function FloatingSocial({ social, circleSize, isHovered }) {
  const [tip, setTip] = useState(false)
  const R = circleSize / 2 + 18           // orbit radius (just outside the circle edge)
  const rad = (social.angle * Math.PI) / 180
  const tx = Math.cos(rad) * R
  const ty = Math.sin(rad) * R
  const { bg, fg } = SOCIAL_COLOR[social.type] || { bg: '#555', fg: '#fff' }

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.a
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.type}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, scale: 1, x: tx, y: ty }}
          exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.85 }}
          onHoverStart={() => setTip(true)}
          onHoverEnd={() => setTip(false)}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            marginTop: -18, marginLeft: -18,
            width: 36, height: 36,
            borderRadius: '50%',
            background: bg, color: fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${bg}88`,
            textDecoration: 'none',
            zIndex: 10,
            cursor: 'pointer',
          }}
        >
          {ICONS[social.type]}

          {/* tooltip */}
          <AnimatePresence>
            {tip && (
              <motion.span
                initial={{ opacity: 0, y: 4, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.8 }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%', transform: 'translateX(-50%)',
                  background: '#1e1410', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 6,
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                }}
              >
                {social.type}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.a>
      )}
    </AnimatePresence>
  )
}

/* ── the large circle photo ── */
const CIRCLE = 220

function MemberCircle({ member }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      style={{
        position: 'relative',
        width: CIRCLE, height: CIRCLE,
        flexShrink: 0,
        cursor: 'pointer',
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      {/* outer glow */}
      <motion.div
        style={{
          position: 'absolute', inset: -16,
          borderRadius: '50%',
          background: member.color,
          filter: 'blur(28px)',
          opacity: 0,
          zIndex: 0,
        }}
        animate={{ opacity: hovered ? 0.4 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* spinning color ring */}
      <motion.div
        style={{
          position: 'absolute', inset: -5,
          borderRadius: '50%',
          background: `conic-gradient(${member.color}, transparent 60%, ${member.color})`,
          opacity: hovered ? 1 : 0.35,
          zIndex: 1,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* white gap */}
      <div style={{
        position: 'absolute', inset: -2,
        borderRadius: '50%',
        background: '#fff',
        zIndex: 2,
      }} />

      {/* photo */}
      <div style={{
        position: 'absolute', inset: 4,
        borderRadius: '50%',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${member.color}cc, ${member.color}66)`,
        zIndex: 3,
      }}>
        <img
          src={member.photo}
          alt={member.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(15%)' }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* orbiting social icons — appear on hover */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
        {member.socials.map((s) => (
          <FloatingSocial
            key={s.type}
            social={s}
            circleSize={CIRCLE}
            isHovered={hovered}
          />
        ))}
      </div>
    </motion.div>
  )
}

/* ── single member row (alternating) ── */
function MemberRow({ member, index }) {
  const isLeft = index % 2 === 0   // photo left on even, right on odd

  const textBlock = (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? 50 : -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ amount: 0.35 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        flex: 1,
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isLeft ? 'flex-start' : 'flex-end',
        textAlign: isLeft ? 'left' : 'right',
      }}
    >
      {/* role */}
      <motion.span
        initial={{ opacity: 0, y: -6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.3 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        style={{
          fontSize: 11, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: member.color,
          marginBottom: 8,
        }}
      >
        {member.role}
      </motion.span>

      {/* name */}
      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.3 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        style={{
          margin: 0,
          fontSize: 'clamp(24px, 3vw, 34px)',
          fontWeight: 900,
          letterSpacing: '-0.025em',
          color: 'var(--color-ink)',
          lineHeight: 1.05,
        }}
      >
        {member.name}
      </motion.h3>

      {/* divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          width: 48, height: 3,
          background: member.color,
          borderRadius: 2,
          margin: '14px 0',
          transformOrigin: isLeft ? 'left' : 'right',
        }}
      />

      {/* bio */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.7,
          color: 'var(--color-ink-secondary)',
          maxWidth: 340,
        }}
      >
        {member.bio}
      </motion.p>

      {/* static social row for mobile / non-hover */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        marginTop: 22,
        justifyContent: isLeft ? 'flex-start' : 'flex-end',
      }}>
        {member.socials.map((s) => {
          const { bg, fg } = SOCIAL_COLOR[s.type] || {}
          return (
            <motion.a
              key={s.type}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2, y: -3 }}
              whileTap={{ scale: 0.88 }}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: bg, color: fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${bg}55`,
                textDecoration: 'none', flexShrink: 0,
              }}
              aria-label={s.type}
            >
              {ICONS[s.type]}
            </motion.a>
          )
        })}
      </div>
    </motion.div>
  )

  const photoBlock = (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ amount: 0.35 }}
      transition={{ type: 'spring', stiffness: 100, damping: 14 }}
      style={{ flexShrink: 0 }}
    >
      <MemberCircle member={member} />
    </motion.div>
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'clamp(40px, 6vw, 80px)',
      padding: '20px 0',
    }}>
      {isLeft ? photoBlock : textBlock}
      {isLeft ? textBlock : photoBlock}
    </div>
  )
}

/* ── divider between rows ── */
function RowDivider({ color }) {
  return (
    <motion.div
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ amount: 0.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        width: 2, height: 80,
        margin: '0 auto',
        background: `linear-gradient(to bottom, ${color}80, transparent)`,
        borderRadius: 2,
        transformOrigin: 'top',
      }}
    />
  )
}

/* ── section ── */
export default function Team() {
  return (
    <section
      id="team"
      style={{
        background: 'var(--color-surface)',
        padding: '100px 0 120px',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

        {/* heading */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--color-primary)',
            }}
          >
            The people behind the scan
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            style={{
              margin: '12px 0 0',
              fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 900, letterSpacing: '-0.025em',
              color: 'var(--color-ink)', lineHeight: 1.1,
            }}
          >
            Meet the team
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{
              marginTop: 14, fontSize: 16,
              color: 'var(--color-ink-secondary)',
              maxWidth: 420, margin: '14px auto 0',
              lineHeight: 1.65,
            }}
          >
            A small team of builders passionate about protecting every purchase in Ghana.
          </motion.p>
        </div>

        {/* vertical member list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TEAM.map((member, i) => (
            <div key={member.name}>
              <MemberRow member={member} index={i} />
              {i < TEAM.length - 1 && (
                <RowDivider color={TEAM[i + 1].color} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
