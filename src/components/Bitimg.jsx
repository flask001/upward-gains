// src/components/CryptoSlider.jsx

import { useEffect, useRef, useState } from "react";

const coins = [
  { id: "bitcoin", symbol: "btcusdt", name: "Bitcoin", icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg" },
  { id: "ethereum", symbol: "ethusdt", name: "Ethereum", icon: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
  { id: "solana", symbol: "solusdt", name: "Solana", icon: "https://cryptologos.cc/logos/solana-sol-logo.svg" },
  { id: "tron", symbol: "trxusdt", name: "TRON", icon: "https://cryptologos.cc/logos/tron-trx-logo.svg" },
  { id: "dogecoin", symbol: "dogeusdt", name: "Dogecoin", icon: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg" },
  { id: "cardano", symbol: "adausdt", name: "Cardano", icon: "https://cryptologos.cc/logos/cardano-ada-logo.svg" },
  { id: "chainlink", symbol: "linkusdt", name: "Chainlink", icon: "https://cryptologos.cc/logos/chainlink-link-logo.svg" },
  { id: "litecoin", symbol: "ltcusdt", name: "Litecoin", icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg" },
  { id: "avalanche-2", symbol: "avaxusdt", name: "Avalanche", icon: "https://cryptologos.cc/logos/avalanche-avax-logo.svg" },
  { id: "shiba-inu", symbol: "shibusdt", name: "Shiba Inu", icon: "https://cryptologos.cc/logos/shiba-inu-shib-logo.svg" },
  { id: "polkadot", symbol: "dotusdt", name: "Polkadot", icon: "https://cryptologos.cc/logos/polkadot-new-dot-logo.svg" },
  { id: "uniswap", symbol: "uniusdt", name: "Uniswap", icon: "https://cryptologos.cc/logos/uniswap-uni-logo.svg" },
];

export default function CryptoSlider() {
  const sliderRef = useRef(null);
  const wsRef = useRef(null);
  const [market, setMarket] = useState({});

  /* slider animation (your original code) */
  useEffect(() => {
    const slider = sliderRef.current;
    let scrollAmount = 0;

    const slide = () => {
      scrollAmount += 0.35;
      slider.scrollLeft = scrollAmount;

      if (scrollAmount >= slider.scrollWidth / 2) scrollAmount = 0;

      requestAnimationFrame(slide);
    };

    slide();
  }, []);

  /* initial price fetch */
  useEffect(() => {
    const fetchInitial = async () => {
      const ids = coins.map((c) => c.id).join(",");

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );

      const data = await res.json();

      const formatted = {};
      coins.forEach((c) => {
        if (data[c.id]) {
          formatted[c.symbol] = {
            price: data[c.id].usd,
            change: data[c.id].usd_24h_change,
          };
        }
      });

      setMarket(formatted);
    };

    fetchInitial();
  }, []);

  /* realtime websocket */
  useEffect(() => {
    const streams = coins.map((c) => `${c.symbol}@ticker`).join("/");

    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const data = msg.data;

      setMarket((prev) => ({
        ...prev,
        [data.s.toLowerCase()]: {
          price: parseFloat(data.c),
          change: parseFloat(data.P),
        },
      }));
    };

    return () => ws.close();
  }, []);

  return (
    <section className="w-full py-0 bg-gradient-to-r from-black via-black to-emerald-950 overflow-hidden">
      <div
        ref={sliderRef}
        className="flex gap-10 overflow-x-hidden whitespace-nowrap px-6"
      >
        {[...coins, ...coins].map((coin, index) => {
          const data = market[coin.symbol];
          const price = data?.price;
          const change = data?.change;

          return (
            <div
              key={index}
              className="flex items-center gap-2 min-w-max px-4 py-2 rounded-xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:bg-white/30 hover:shadow-[0_0_20px_rgba(255,180,0,0.6)] cursor-pointer"
            >
              <img src={coin.icon} alt={coin.name} className="w-7 h-7" />

              <span className="text-sm md:text-base font-medium text-gray-400">
                {coin.name}
              </span>

              {price && (
                <span className="text-xs text-gray-300">
                  ${price.toLocaleString()}
                </span>
              )}

              {change && change !== 0 && (
                <span
                  className={`text-xs font-semibold ${
                    change > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {change > 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}