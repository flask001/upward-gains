// src/components/FaqSection.jsx

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "I Can't Sign In To My Account?",
    answer:
      "Make sure your login credentials are correct. If the issue continues, reset your password or contact our 24/7 support team."
  },
  {
    question: "What Level Of Support Do You Offer?",
    answer:
      "We provide 24/7 investor support via live chat and support tickets to help you anytime."
  },
  {
    question: "What Is Copy Stop Loss?",
    answer:
      "Copy Stop Loss protects your balance by automatically stopping copied trades when losses reach your selected limit."
  },
  {
    question: "How Do I Withdraw My Profits?",
    answer:
      "Withdrawals are processed instantly. Simply go to your dashboard, choose withdraw, select your payment method and confirm."
  },
  {
    question: "How Secure Is My Investment?",
    answer:
      "We use advanced security systems, encrypted transactions and monitored trading strategies to protect investor accounts."
  },
  {
    question: "Can I Reinvest My Profits?",
    answer:
      "Yes. You can instantly reinvest your profits into any available investment plan directly from your dashboard."
  }
];

function FAQItem({ faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div id="faq"
      onClick={() => setOpen(!open)}
      className="bg-gray-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {faq.question}
        </h3>

        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xl text-gray-600"
        >
          <FiPlus />
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center mb-12">
          Most Common <span className="text-emerald-500">FAQ</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>

      </div>
    </section>
  );
}