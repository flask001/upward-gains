import { convertUsdToCrypto } from "./currencyService";
import {
  createPendingInvoice,
  fetchPaymentAddressForWalletLabel,
} from "./invoiceService";

/**
 * Full deposit flow: live conversion, resolve payment address, insert pending invoice.
 */
export async function createDepositInvoice({
  planId,
  walletLabel,
  amountUsd,
}) {
  if (!planId || !walletLabel) {
    return { data: null, error: new Error("Plan and wallet are required") };
  }

  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { data: null, error: new Error("Invalid amount") };
  }

  let cryptoAmount;
  try {
    const conv = await convertUsdToCrypto(amount, walletLabel);
    cryptoAmount = conv.cryptoAmount;
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }

  const { address, error: addrError } = await fetchPaymentAddressForWalletLabel(
    walletLabel
  );

  if (addrError) return { data: null, error: addrError };
  if (!address) {
    return {
      data: null,
      error: new Error(
        "No payment address for this wallet. Add a row in payment_addresses in Supabase."
      ),
    };
  }

  return createPendingInvoice({
    planId,
    walletType: walletLabel,
    amountUsd: amount,
    cryptoAmount,
    paymentAddress: address,
  });
}
