/** Wallet labels in Invest Now UI — must match Supabase `payment_addresses.wallet_key` via {@link walletLabelToKey}. */
export const WALLET_OPTIONS = ["Bitcoin", "Ethereum", "ERC20", "TRON"];

export const WALLET_LABEL_TO_KEY = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
  ERC20: "erc20",
  TRON: "tron",
};

/** CoinGecko `ids` query param segment per wallet label (USDT uses same id for ERC20/TRON). */
export const WALLET_LABEL_TO_COINGECKO_ID = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
  ERC20: "tether",
  TRON: "tether",
};
