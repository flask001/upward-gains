// src/components/WhyChooseUs.jsx
import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Headphones,
  ShieldCheck,
  Wallet,
  DollarSign,
  BadgeCheck,
} from "lucide-react";
import bgImage from "../assets/image/Abt2.jpg";

const features = [
  {
    title: "Real-Time Insights",
    desc: "Trade crypto, forex, and ETFs with live data anytime, anywhere.",
    icon: BarChart3,
  },
  {
    title: "24/7 Expert Support",
    desc: "Our professional team is always available to guide and assist you.",
    icon: Headphones,
  },
  {
    title: "Advanced Security",
    desc: "Top-level encryption and protection against unauthorized access.",
    icon: ShieldCheck,
  },
  {
    title: "Flexible Deposits",
    desc: "Fund your account using multiple secure payment methods.",
    icon: Wallet,
  },
  {
    title: "Instant Withdrawals",
    desc: "Fast and seamless withdrawals processed without delays.",
    icon: DollarSign,
  },
  {
    title: "Full Transparency",
    desc: "Track performance with clear statistics and execution reports.",
    icon: BadgeCheck,
  },
];

const FeatureCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={{
        y: -10,
        boxShadow: "0px 10px 30px rgba(16, 185, 129, 0.3)",
      }}
      whileTap={{
        scale: 0.97,
        boxShadow: "0px 10px 30px rgba(16, 185, 129, 0.3)",
      }}
      transition={{ type: "spring", stiffness: 200 }}
      className="bg-black/90 backdrop-blur-md rounded-2xl p-8 text-center transition cursor-pointer border-2 border-gray-900 h"
    >
      <motion.div
        whileHover={{ scale: 1.2, rotate: 8 }}
        whileTap={{ scale: 1.15, rotate: 5 }}
        className="flex justify-center mb-4"
      >
        <Icon className="w-10 h-10 text-emerald-500" />
      </motion.div>

      <h3 className="text-white text-xl font-semibold mb-3">
        {item.title}
      </h3>

      <p className="text-gray-400 text-sm leading-relaxed">
        {item.desc}
      </p>
    </motion.div>
  );
};

const WhyChooseUs = () => {
  return (
    <section className="relative py-20 px-6">
      
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Dark + Blur Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto">
        
        <h2 className="text-center text-3xl md:text-5xl font-bold text-emerald-50 mb-16">
          Why <span className="text-emerald-500">Choose Us</span>
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 ">
          {features.map((item, i) => (
            <FeatureCard key={i} item={item} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;