import { motion } from "framer-motion";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    title: "AI Product Recognition",
    body: "No barcode? No problem. Our vision model identifies products from raw camera photos instantly.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    title: "Live Price Comparison",
    body: "Compare prices across vendors in Ghana Cedis (₵) — so you always know the fair market rate.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Authenticity Verification",
    body: "Instant counterfeit detection flags suspicious goods before you hand over your money.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.79 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.72 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.32-1.32a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
      </svg>
    ),
    title: "Seller Hotlines",
    body: "Call, WhatsApp, or SMS verified sellers directly from the scan result — no middleman.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: "Smart Recommendations",
    body: "Get cheaper nearby alternatives ranked by price, distance, and seller trust score.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.8}>
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
      </svg>
    ),
    title: "Saved Products",
    body: "Bookmark items to track price history and get notified when deals drop.",
  },
];

const headingWords = "Built to protect every purchase".split(" ");

const headingContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const headingWordVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: (col) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 22,
      delay: col * 0.12,
    },
  }),
};

export default function FeatureFall() {
  return (
    <section id="features" className="relative overflow-hidden bg-white py-28">
      {/* Floating background orbs */}
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232,104,42,0.10) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -30, 40, 0], y: [0, 20, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="pointer-events-none absolute -bottom-24 -right-24 h-[480px] w-[480px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(26,158,212,0.10) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5 }}
          transition={{ duration: 0.45 }}
          className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-[#e8682a]"
        >
          Features
        </motion.p>

        {/* Heading — word by word, no once:true */}
        <motion.h2
          variants={headingContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.4 }}
          className="mb-16 text-center text-4xl font-black tracking-tight text-[#1e1410] md:text-5xl"
        >
          {headingWords.map((word, i) => (
            <motion.span
              key={i}
              variants={headingWordVariants}
              className="mr-[0.3em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </motion.h2>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const col = i % 3;
            return (
              <motion.div
                key={feature.title}
                custom={col}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.2 }}
                whileHover="hover"
                className="group relative cursor-default overflow-hidden rounded-2xl border border-[#e8d5c0] bg-[#faf0e4] p-7 shadow-sm transition-shadow hover:shadow-xl"
              >
                {/* Shimmer strip on hover */}
                <motion.div
                  initial={{ x: "-120%", opacity: 0 }}
                  variants={{
                    hover: {
                      x: ["−120%", "220%"],
                      opacity: [0, 1, 0],
                      transition: { duration: 0.65, ease: "easeInOut" },
                    },
                  }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                    zIndex: 5,
                  }}
                />

                {/* Card content lifts on hover */}
                <motion.div
                  variants={{
                    hover: {
                      y: -4,
                      transition: { type: "spring", stiffness: 300, damping: 20 },
                    },
                  }}
                  className="relative z-10"
                >
                  {/* Icon with wiggle on hover */}
                  <motion.div
                    variants={{
                      hover: {
                        rotate: [0, -12, 10, -6, 4, 0],
                        transition: { duration: 0.5, ease: "easeInOut" },
                      },
                    }}
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-[#e8682a]"
                    style={{ background: "rgba(232,104,42,0.10)" }}
                  >
                    {feature.icon}
                  </motion.div>

                  <h3 className="mb-2 text-lg font-bold text-[#1e1410]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#7a6050]">
                    {feature.body}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
