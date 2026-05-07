// src/components/Features.jsx
import React from "react";
import { motion } from "framer-motion";

const features = [
  {
    title: "Active Support",
    desc: "Get quick support from our team, we are always available to help you.",
    icon: (
      <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="8" cy="12" r="2" />
        <path d="M16 10h2M16 14h2" />
      </svg>
    ),
  },
  {
    title: "Unlimited withdraw",
    desc: "You can take profit from your investment without restrictions.",
    icon: (
      <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 3v18M7 8h10M7 16h10" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "Transfer",
    desc: "You can recieve bitcoin from other wallets.",
    icon: (
      <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M7 7h10v10H7z" />
        <path d="M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const FeatureCard = ({ item }) => {
  return (
    <motion.div
      whileHover={{
        y: -8,
        boxShadow: "0px 10px 30px rgba(16, 185, 129, 0.3)",
      }}
      transition={{ type: "spring", stiffness: 200 }}
      className="flex gap-4 items-start cursor-pointer"
    >
      {/* Icon + line */}
      <div className="flex flex-col items-center">
        <motion.div
          whileHover={{ scale: 1.2, rotate: 10 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {item.icon}
        </motion.div>

        <div className="w-[2px] h-16 bg-gradient-to-b from-emerald-500 to-transparent mt-4" />
      </div>

      {/* Text */}
      <div>
        <h3 className="text-white text-xl font-semibold mb-2">
          {item.title}
        </h3>
        <p className="text-gray-300 text-sm leading-relaxed max-w-xs">
          {item.desc}
        </p>
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section className="bg-gradient-to-r from-[#000000] via-black to-emerald-950 py-16 px-6">
      <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-3">
        {features.map((item, i) => (
          <FeatureCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
};

export default Features;