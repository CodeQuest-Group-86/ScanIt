import { useRef } from "react";
import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Scan it",
    body: "Open ScanIt and point your camera at any product — packaged goods, electronics, cosmetics, anything. No barcode needed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9V6a2 2 0 0 1 2-2h3M3 15v3a2 2 0 0 0 2 2h3M21 9V6a2 2 0 0 0-2-2h-3M21 15v3a2 2 0 0 1-2 2h-3" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Verify it",
    body: "Our AI cross-references the product against a live database of genuine goods and known counterfeits across Ghana.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Decide with confidence",
    body: "Get the verdict, price range, seller hotlines, and cheaper alternatives — then buy smart.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

const headingWords = "How it works".split(" ");

const cardVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      delay: i * 0.15,
    },
  }),
};

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-32"
      style={{ background: "#0f0a07" }}
    >
      {/* Dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(232,104,42,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* Glow blobs */}
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-[-10%] top-[-5%] h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232,104,42,0.22) 0%, transparent 70%)",
          filter: "blur(64px)",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="pointer-events-none absolute bottom-[-8%] right-[-8%] h-[440px] w-[440px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(26,158,212,0.22) 0%, transparent 70%)",
          filter: "blur(64px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.6 }}
          transition={{ duration: 0.45 }}
          className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#e8682a]"
        >
          Simple as 1 – 2 – 3
        </motion.p>

        {/* Heading — word by word, no once:true */}
        <h2 className="mb-20 text-center text-4xl font-black tracking-tight text-white md:text-5xl">
          {headingWords.map((word, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={wordVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.5 }}
              className="mr-[0.3em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h2>

        {/* Steps */}
        <div className="relative flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-0">
          {/* Animated connector line (desktop only) */}
          <div
            className="pointer-events-none absolute hidden lg:block overflow-hidden"
            style={{
              top: "3.5rem",
              left: "calc(16.67% + 2rem)",
              right: "calc(16.67% + 2rem)",
              height: "2px",
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ amount: 0.5 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="h-full origin-left"
              style={{
                background: "linear-gradient(90deg, #e8682a 0%, #ff8c4a 50%, #e8682a 100%)",
                boxShadow: "0 0 10px rgba(232,104,42,0.6), 0 0 20px rgba(232,104,42,0.3)",
              }}
            />
          </div>

          {steps.map((step, i) => (
            <div
              key={step.num}
              className="flex flex-1 flex-col items-center text-center lg:px-8"
            >
              {/* Number circle with ping rings */}
              <div className="relative mb-8 flex h-16 w-16 items-center justify-center">
                {/* Outer ping ring */}
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{
                    scale: [1, 1.7, 1.9],
                    opacity: [0.65, 0.3, 0],
                  }}
                  viewport={{ amount: 0.5 }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.4,
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2px solid rgba(232,104,42,0.7)" }}
                />
                {/* Inner ping ring */}
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{
                    scale: [1, 1.4, 1.6],
                    opacity: [0.45, 0.2, 0],
                  }}
                  viewport={{ amount: 0.5 }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.4 + 0.35,
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2px solid rgba(232,104,42,0.5)" }}
                />
                {/* Circle face */}
                <div
                  className="relative z-10 flex h-full w-full items-center justify-center rounded-full text-lg font-black text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #e8682a 0%, #c4521a 100%)",
                    boxShadow: "0 4px 20px rgba(232,104,42,0.45)",
                  }}
                >
                  {step.num}
                </div>
              </div>

              {/* Card */}
              <motion.div
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.3 }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 18 } }}
                className="w-full max-w-xs rounded-2xl p-6 text-left"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(232,104,42,0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#e8682a]"
                  style={{ background: "rgba(232,104,42,0.12)" }}
                >
                  {step.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {step.body}
                </p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
