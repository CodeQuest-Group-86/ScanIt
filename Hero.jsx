import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import PhoneMockup from "./PhoneMockup";
import StoreBadges from "./StoreBadges";

const words = ["Know", "it", "real", "—", "before", "you", "buy", "it."];

export default function Hero() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const blob1Y = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden flex items-center"
      style={{
        background: "linear-gradient(135deg, #fff6ec 0%, #fdf3e7 50%, #f5e8d5 100%)",
      }}
    >
      {/* Center breathing orb */}
      <motion.div
        animate={{
          opacity: [0.22, 0.42, 0.22],
          scale: [1, 1.14, 1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(232,104,42,0.18) 0%, rgba(232,104,42,0.04) 60%, transparent 100%)",
          filter: "blur(60px)",
        }}
      />

      {/* Blob 1 — top left with scroll parallax */}
      <motion.div
        style={{ y: blob1Y }}
        animate={{ x: [0, 30, -20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(232,104,42,0.22) 0%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      {/* Blob 2 — bottom right with scroll parallax */}
      <motion.div
        style={{ y: blob2Y }}
        animate={{ x: [0, -25, 15, 0], scale: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(26,158,212,0.18) 0%, transparent 70%)",
          filter: "blur(56px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-16 lg:gap-8 w-full">
        {/* Left column */}
        <div className="flex-1 max-w-xl">
          {/* Badge with shimmer */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8d5c0] bg-white/70 px-4 py-1.5 text-sm font-medium text-[#e8682a] backdrop-blur-sm overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#e8682a]" />
              Built for Ghana's market
            </span>
            {/* Shimmer sweep */}
            <motion.span
              animate={{ x: ["-120%", "220%"] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 2.8,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute inset-0 z-20 skew-x-[-20deg]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)",
                width: "50%",
              }}
            />
          </motion.div>

          {/* Headline — word by word stagger */}
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-[#1e1410] lg:text-6xl xl:text-7xl">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: i * 0.09,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`inline-block mr-[0.25em] ${
                  word === "—" ? "text-[#e8682a]" : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.55, ease: "easeOut" }}
            className="mb-8 text-lg leading-relaxed text-[#7a6050]"
          >
            Point your phone at any product. ScanIt tells you if it's genuine,
            how much it should cost, and where to buy it for less — in seconds.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <motion.button
              animate={{
                boxShadow: [
                  "0 0 0 0px rgba(232,104,42,0.55)",
                  "0 0 0 14px rgba(232,104,42,0)",
                  "0 0 0 0px rgba(232,104,42,0)",
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              whileHover={{ scale: 1.04, backgroundColor: "#c4521a" }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-[#e8682a] px-8 py-4 text-base font-semibold text-white shadow-lg"
              style={{ border: "none", cursor: "pointer" }}
            >
              Join the waitlist
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-full border border-[#e8d5c0] bg-white/60 px-8 py-4 text-base font-medium text-[#1e1410] backdrop-blur-sm"
              style={{ cursor: "pointer" }}
            >
              See how it works
              <span className="text-[#e8682a]">→</span>
            </motion.button>
          </motion.div>

          {/* Store badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35, duration: 0.6 }}
            className="mt-8"
          >
            <StoreBadges />
          </motion.div>
        </div>

        {/* Right column — floating phone */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex justify-center lg:justify-end"
        >
          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <PhoneMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
