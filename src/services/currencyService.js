import { WALLET_LABEL_TO_COINGECKO_ID } from "../constants/wallets";

const COINGECKO_SIMPLE_PRICE =
  "https://api.coingecko.com/api/v3/simple/price";

let cache = { prices: null, exp: 0 };
const TTL_MS = 60_000;

/**
 * Fetches USD prices for bitcoin, ethereum, tether (shared cache).
 * @returns {Promise<{ bitcoin: number, ethereum: number, tether: number }>}
 */
export async function fetchUsdPrices() {
  const now = Date.now();
  if (cache.prices && now < cache.exp) {
    return cache.prices;
  }

  const url = new URL(COINGECKO_SIMPLE_PRICE);
  url.searchParams.set("ids", "bitcoin,ethereum,tether");
  url.searchParams.set("vs_currencies", "usd");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Price API error (${res.status})`);
  }

  const body = await res.json();
  const prices = {
    bitcoin: Number(body?.bitcoin?.usd),
    ethereum: Number(body?.ethereum?.usd),
    tether: Number(body?.tether?.usd),
  };

  if (![prices.bitcoin, prices.ethereum, prices.tether].every(Number.isFinite)) {
    throw new Error("Invalid price response");
  }

  cache = { prices, exp: now + TTL_MS };
  return prices;
}

/**
 * Converts a USD amount to crypto units for the selected wallet label.
 * USDT (ERC20/TRON): treated as ~1:1 with USD using tether price.
 */
export async function convertUsdToCrypto(amountUsd, walletLabel) {
  const id = WALLET_LABEL_TO_COINGECKO_ID[walletLabel];
  if (!id) {
    throw new Error("Unknown wallet for conversion");
  }

  const prices = await fetchUsdPrices();
  const priceUsd =
    id === "bitcoin"
      ? prices.bitcoin
      : id === "ethereum"
        ? prices.ethereum
        : prices.tether;

  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error("Bad USD price for asset");
  }

  const cryptoAmount = amountUsd / priceUsd;
  return { cryptoAmount, priceUsd, coingeckoId: id };
}

export function formatCryptoDisplay(amount, walletLabel) {
  const usdt = walletLabel === "ERC20" || walletLabel === "TRON";
  const eth = walletLabel === "Ethereum";
  const decimals = usdt ? 4 : eth ? 6 : 8;
  return amount.toFixed(decimals);
}
