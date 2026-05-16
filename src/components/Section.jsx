import { motion } from "framer-motion";
import Abt1 from "../assets/image/Abt1.jpg";
import Abt2 from "../assets/image/Abt2.jpg";

export default function AboutSection() {
  return (
    <section id="about" className="bg-gray-100 py-14 sm:py-16 px-4 sm:px-6 md:px-30 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-20 items-center">
        
        {/* Images */}
        <div className="relative flex justify-left md:block">

          {/* First Image */}
          <motion.img
            src={Abt1}
            alt="Finance"
            className="rounded-2xl shadow-lg w-[70%] sm:w-[70%] md:w-3/4 object-cover relative z-10"
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          />

          {/* Second Image */}
          <motion.img
            src={Abt2}
            alt="Trading"
            className="
              rounded-2xl shadow-xl
              w-[70%] sm:w-[70%] md:w-4/5
              object-cover
              absolute
              top-14 left-20
              sm:top-28 sm:left-140
              md:top-24 md:left-24
              z-20
            "
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9 }}
            viewport={{ once: true }}
          />
        </div>

        {/* Text */}
        <motion.div
          className="text-left md:text-left"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          {/* Title */}
          <h2 className="text-3xl sm:text-3xl md:text-4xl font-bold mb-0 leading-tight">
            <span className="text-emerald-600">About</span>{" "}
            <span className="text-gray-900">Upwards-Gains</span>
          </h2>

           {/* Content */}
          <div className="space-y-4 text-gray-800 text-sm sm:text-base leading-relaxed max-w-xl mx-auto md:mx-0">
            <p className="">
     A modern investment platform built for clarity, strategy, and
              sustainable financial growth.
          
              Upwards-Gains combines advanced financial tools with a user-first
              approach to help individuals navigate investment opportunities
              with confidence. Our platform is designed to simplify complex
              strategies while maintaining full transparency.
            </p>

            <p>
              We focus on delivering structured growth opportunities backed by
              data-driven insights—not unrealistic promises. Every feature is
              built to support smarter decision-making and long-term thinking.
            </p>

            <p>
              Whether you're exploring your first steps or refining your
              portfolio, Upwards-Gains equips you with the tools, clarity, and
              control needed to move forward with purpose.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}