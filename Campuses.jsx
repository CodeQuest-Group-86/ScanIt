import { motion } from "framer-motion";

const campuses = [
  {
    name: "KNUST",
    full: "Kwame Nkrumah University of Science & Technology",
    location: "Kumasi",
    students: "80,000+",
  },
  {
    name: "UG",
    full: "University of Ghana",
    location: "Legon, Accra",
    students: "40,000+",
  },
  {
    name: "UCC",
    full: "University of Cape Coast",
    location: "Cape Coast",
    students: "20,000+",
  },
  {
    name: "UPSA",
    full: "University of Professional Studies",
    location: "Accra",
    students: "15,000+",
  },
];

const headingChars = "Launching on campus".split("");

const charVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: i * 0.035,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.92 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 220,
      damping: 16,
      delay: i * 0.1,
    },
  }),
};

const iconVariants = {
  hidden: { opacity: 0, rotate: -180, scale: 0.5 },
  visible: (i) => ({
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 14,
      delay: i * 0.1 + 0.15,
    },
  }),
};

// Generic campus SVG icon
function CampusIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-10 w-10"
      aria-hidden="true"
    >
      {/* Main building */}
      <rect x="10" y="22" width="28" height="20" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      {/* Roof / triangle */}
      <path d="M6 22 L24 8 L42 22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" opacity="0.08" />
      {/* Door */}
      <rect x="20" y="32" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
      {/* Left window */}
      <rect x="13" y="26" width="6" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      {/* Right window */}
      <rect x="29" y="26" width="6" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      {/* Flag pole */}
      <line x1="24" y1="8" x2="24" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M24 3 L30 5.5 L24 8Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export default function Campuses() {
  return (
    <section id="campuses" className="relative overflow-hidden bg-white py-28">
      {/* Radial dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(232,104,42,0.13) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5 }}
          transition={{ duration: 0.45 }}
          className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-[#e8682a]"
        >
          Campus rollout
        </motion.p>

        {/* Heading — char by char */}
        <h2 className="mb-4 text-center text-4xl font-black tracking-tight text-[#1e1410] md:text-5xl">
          {headingChars.map((char, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={charVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.4 }}
              className={`inline-block ${char === " " ? "mr-[0.3em]" : ""}`}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16 text-center text-lg text-[#7a6050] max-w-xl mx-auto"
        >
          We're starting with Ghana's largest universities — where fake goods hit students hardest.
        </motion.p>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {campuses.map((campus, i) => (
            <motion.div
              key={campus.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.2 }}
              whileHover="hover"
              className="group relative cursor-default rounded-2xl border-2 p-6 text-center transition-colors"
              style={{
                borderColor: "#e8d5c0",
                background: "#faf0e4",
              }}
            >
              {/* Glow border on hover via pseudo approach with motion */}
              <motion.div
                variants={{
                  hover: {
                    opacity: 1,
                    transition: { duration: 0.2 },
                  },
                }}
                initial={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  boxShadow:
                    "0 0 0 2px #e8682a, 0 0 20px rgba(232,104,42,0.3), 0 0 40px rgba(232,104,42,0.15)",
                }}
              />

              {/* Icon — spins in */}
              <motion.div
                custom={i}
                variants={iconVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.3 }}
                className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-[#e8682a]"
                style={{ background: "rgba(232,104,42,0.10)" }}
              >
                <CampusIcon />
              </motion.div>

              {/* Abbreviation */}
              <div className="relative z-10 mb-1 text-2xl font-black text-[#1e1410]">
                {campus.name}
              </div>

              {/* Full name */}
              <div className="relative z-10 mb-3 text-xs font-medium leading-snug text-[#7a6050]">
                {campus.full}
              </div>

              {/* Meta row */}
              <div className="relative z-10 flex items-center justify-center gap-3 text-xs text-[#7a6050]">
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M8 14s-5-4.686-5-8a5 5 0 0 1 10 0c0 3.314-5 8-5 8Z" />
                    <circle cx="8" cy="6" r="1.5" />
                  </svg>
                  {campus.location}
                </span>
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="8" cy="5" r="2.5" />
                    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
                  </svg>
                  {campus.students}
                </span>
              </div>

              {/* Bottom tag */}
              <motion.div
                variants={{
                  hover: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 280, damping: 18 },
                  },
                }}
                initial={{ opacity: 0, y: 8 }}
                className="relative z-10 mt-4"
              >
                <span
                  className="inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-[#e8682a]"
                  style={{ background: "rgba(232,104,42,0.10)" }}
                >
                  Coming soon
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-14 text-center"
        >
          <p className="mb-4 text-sm text-[#7a6050]">
            Is your campus not listed? Let us know.
          </p>
          <motion.button
            whileHover={{ scale: 1.04, backgroundColor: "#c4521a" }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                "0 0 0 0px rgba(232,104,42,0.5)",
                "0 0 0 12px rgba(232,104,42,0)",
                "0 0 0 0px rgba(232,104,42,0)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            className="rounded-full bg-[#e8682a] px-8 py-3.5 text-sm font-semibold text-white shadow-md"
            style={{ border: "none", cursor: "pointer" }}
          >
            Request your campus
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
