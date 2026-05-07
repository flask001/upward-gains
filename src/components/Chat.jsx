// src/components/CryptoMarketFinal.jsx

import React, { useEffect, useState, useRef, useMemo } from "react";

const formatNumber = (num) => {
  if (!num) return "-";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toLocaleString();
};

const formatPrice = (price) =>
  price
    ? `$${Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "-";

const getColor = (val) => (val >= 0 ? "text-green-400" : "text-red-500");

export default function CryptoMarketFinal() {
  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [priceFlash, setPriceFlash] = useState({});

  const cache = useRef({});

  const fetchSnapshot = async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      );
      const data = await res.json();

      cache.current[limit] = data;
      setCoins(data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateCoinPrice = (symbol, newPrice) => {
    setCoins((prev) =>
      prev.map((c) => {
        if (c.symbol === symbol.toLowerCase()) {
          const oldPrice = c.current_price;

          if (oldPrice !== newPrice) {
            setPriceFlash((f) => ({ ...f, [c.id]: true }));

            setTimeout(() => {
              setPriceFlash((f) => ({ ...f, [c.id]: false }));
            }, 300);
          }

          return { ...c, current_price: newPrice };
        }
        return c;
      })
    );
  };

  useEffect(() => {
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateCoinPrice("btc", parseFloat(data.p));
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (cache.current[limit]) {
      setCoins(cache.current[limit]);
    }

    fetchSnapshot();

    const interval = setInterval(fetchSnapshot, 10000);
    return () => clearInterval(interval);
  }, [limit]);

  const filtered = useMemo(() => {
    return coins.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [coins, search]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <h1 className="text-3xl md:text-5xl font-bold">
          COIN <span className="text-emerald-400">LIVE</span> MARKET
        </h1>

        <div className="flex gap-3 flex-wrap">
          <input
            className="bg-emerald-950 border border-emerald-800 px-3 py-2 rounded"
            placeholder="Search coin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-800">
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Mkt Cap</th>
              <th>Volume</th>
              <th>% 24h</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-emerald-800 hover:bg-emerald-900 transition"
              >
                <td className="flex items-center gap-2 p-2">
                  <img src={c.image} className="w-6 h-6" />
                  {c.name}
                </td>

                <td
                  className={`transition-all duration-300 ${
                    priceFlash[c.id] ? "text-emerald-400 scale-110" : ""
                  }`}
                >
                  {formatPrice(c.current_price)}
                </td>

                <td>{formatNumber(c.market_cap)}</td>

                <td>{formatNumber(c.total_volume)}</td>

                <td className={getColor(c.price_change_percentage_24h)}>
                  {c.price_change_percentage_24h?.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-gradient-to-r from-black to-emerald-950 p-4 rounded-xl border border-gray-800"
          >
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <img src={c.image} className="w-6 h-6" />
                <span>{c.name}</span>
              </div>

              <span className={getColor(c.price_change_percentage_24h)}>
                {c.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>

            <div className="mt-2 text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Price</span>
                <span>{formatPrice(c.current_price)}</span>
              </div>

              <div className="flex justify-between">
                <span>Mkt Cap</span>
                <span>{formatNumber(c.market_cap)}</span>
              </div>

              <div className="flex justify-between">
                <span>Volume</span>
                <span>{formatNumber(c.total_volume)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}