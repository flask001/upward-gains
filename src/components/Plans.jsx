// src/components/PricingPlans.jsx
import React from "react";
import { motion } from "framer-motion";
import { Rocket, Gift, Gem } from "lucide-react";

export const plans = [
  {
    name: "GOLD PLAN",
    Roi: "ROI After 1 day",
    roi: "20%",
    min: "$500",
    max: "$1000",
    period: "5 Day",
    commission: "5%",
    icon: Rocket,
  },
  {
    name: "SILVER",
    Roi: "ROI After 1 day",
    roi: "25%",
    min: "$1000",
    max: "$50000",
    period: "4 Days",
    commission: "10%",
    icon: Gift,
  },
  {
    name: "DIAMOND",
    Roi: "ROI After 1 day",
    roi: "50%",
    min: "$100000",
    max: "$1000000",
    period: "3 Days",
    commission: "25%",
    icon: Gem,
  },
];

const PricingCard = ({ plan, index }) => {
  const Icon = plan.icon;

  // Icon colors
  const iconColorMap = {
    "GOLD PLAN": "text-yellow-400",
    SILVER: "text-gray-300",
    DIAMOND: "text-cyan-400",
  };

  const iconColor = iconColorMap[plan.name] || "text-emerald-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      whileHover={{
        scale: 1.05,
        boxShadow: "0px 0px 30px rgba(5, 150, 105, 0.4)",
      }}
     id="investment-plans" className="relative bg-black text-white rounded-2xl p-8 border border-gray-800 flex flex-col justify-between overflow-hidden"
    >
      {/* Hover Border */}
      <div className="absolute inset-0 rounded-2xl border border-transparent hover:border-emerald-600 transition duration-300" />

      <div>
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: 10, scale: 1.2 }}
          className="flex justify-center mb-4"
        >
          <Icon size={50} className={iconColor} />
        </motion.div>

        {/* Plan Name */}
        <h2 className="text-2xl font-bold text-emerald-600 text-center mb-4 tracking-wide">
          {plan.name}
        </h2>

        {/* ROI */}
        <p className="text-center text-4xl font-bold text-white mb-2">
          {plan.roi}
        </p>

        <p className="text-center text-gray-400 mb-6">
          {plan.Roi}
        </p>

        {/* Details */}
        <div className="space-y-3 text-sm text-center">
          <p>
            <span className="text-emerald-600 font-semibold">Min:</span>{" "}
            {plan.min}
          </p>

          <p>
            <span className="text-emerald-600 font-semibold">Max:</span>{" "}
            {plan.max}
          </p>

          <p>
            <span className="text-emerald-600 font-semibold">Period:</span>{" "}
            {plan.period}
          </p>

          <p>
            <span className="text-emerald-600 font-semibold">
              Withdraw:
            </span>{" "}
            Instantly
          </p>

          <p>
            <span className="text-emerald-600 font-semibold">
              Principal:
            </span>{" "}
            Included
          </p>

          <p>
            <span className="text-emerald-600 font-semibold">
              Ref Commission:
            </span>{" "}
            {plan.commission}
          </p>
        </div>
      </div>

      {/* Button */}
      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: "0px 0px 20px rgba(5, 150, 105, 0.5)",
        }}
        whileTap={{ scale: 0.95 }}
        className="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition duration-300"
      >
        ORDER NOW
      </motion.button>
    </motion.div>
  );
};

const PricingPlans = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-black to-emerald-950 px-4 py-20">
      
      {/* Section Title */}
      <div className="text-center mb-14">
        <h1 className="text-4xl md:text-4xl font-bold text-emerald-500 mb-4">
          Investment  <span className="text-white">Plans</span>
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Choose a secure and profitable investment package designed
          for steady growth, instant withdrawals, and blockchain-powered
          financial opportunities.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-8 w-full max-w-6xl mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <PricingCard key={i} plan={plan} index={i} />
        ))}
      </div>
    </div>
  );
};

export default PricingPlans;