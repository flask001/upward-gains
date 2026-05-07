// src/components/PaymentMethods.jsx

import { motion } from "framer-motion";

const coins = [
  {
    name: "Bitcoin",
    icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg",
  },
  {
    name: "Ethereum",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
  },
  {
    name: "Solana",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.svg",
  },
  {
    name: "TRON",
    icon: "https://cryptologos.cc/logos/tron-trx-logo.svg",
  },
  {
    name: "Lido Staked Ether",
    icon: "https://cryptologos.cc/logos/lido-dao-ldo-logo.svg",
  },
  {
    name: "Dogecoin",
    icon: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg",
  },
  {
    name: "Cardano",
    icon: "https://cryptologos.cc/logos/cardano-ada-logo.svg",
  },
  {
    name: "Wrapped Bitcoin",
    icon: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg",
  },
  {
    name: "Chainlink",
    icon: "https://cryptologos.cc/logos/chainlink-link-logo.svg",
  },
  {
    name: "Litecoin",
    icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg",
  },
  {
    name: "Avalanche",
    icon: "https://cryptologos.cc/logos/avalanche-avax-logo.svg",
  },
  {
    name: "Shiba Inu",
    icon: "https://cryptologos.cc/logos/shiba-inu-shib-logo.svg",
  },
  {
    name: "Polkadot",
    icon: "https://cryptologos.cc/logos/polkadot-new-dot-logo.svg",
  },
  {
    name: "Uniswap",
    icon: "https://cryptologos.cc/logos/uniswap-uni-logo.svg",
  },
];

export default function PaymentMethods() {
  return (
    <section className="w-full py-12 bg-gradient-to-r from-black to-emerald-950 text-gray-200">
      
      <div className="max-w-7xl mx-auto px-4 text-center">

        {/* Top Label */}
        <p className="text-emerald-500 font-semibold tracking-wide uppercase">
          Payment Method
        </p>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-10">
          Fast and reliable withdrawal/deposit method
        </h2>

        {/* Coins */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 ">
          {coins.map((coin, index) => (
            <motion.div
              key={index}
              className="flex items-center  gap-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <img
                src={coin.icon}
                alt={coin.name}
                className="w-6 h-6 md:w-7 md:h-7"
              />
              <span className="text-sm md:text-base font-medium text-gray-300">
                {coin.name}
              </span>
            </motion.div>
          ))}
        </div>

      </div>

    </section>
  );
}