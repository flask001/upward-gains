import { WALLET_LABEL_TO_KEY } from "../constants/wallets";
import { supabase } from "./supabaseClient";

// #region agent log
function dbgInvoiceErr(hypothesisId, location, error, extra = {}) {
  if (!error) return;
  fetch("http://127.0.0.1:7921/ingest/027552b2-4ca1-44c1-be45-b3e8e159d63c", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "c682ed",
    },
    body: JSON.stringify({
      sessionId: "c682ed",
      hypothesisId,
      location,
      message: error.message ?? String(error),
      data: {
        code: error.code,
        details: error.details,
        hint: error.hint,
        ...extra,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

function generateInvoiceNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${ymd}-${rnd}`;
}

/**
 * Resolve deposit address for a wallet label (matches `payment_addresses.wallet_key`).
 */
export async function fetchPaymentAddressForWalletLabel(walletLabel) {
  const key = WALLET_LABEL_TO_KEY[walletLabel];
  if (!key) return { address: null, error: new Error("Invalid wallet") };

  const { data, error } = await supabase
    .from("payment_addresses")
    .select("address")
    .eq("wallet_key", key)
    .maybeSingle();

  if (error) return { address: null, error };
  return { address: data?.address ?? null, error: null };
}

/**
 * Insert a pending invoice (current user).
 */
export async function createPendingInvoice({
  planId,
  walletType,
  amountUsd,
  cryptoAmount,
  paymentAddress,
  invoiceNumber,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not signed in") };

  const num =
    invoiceNumber && invoiceNumber.trim()
      ? invoiceNumber.trim()
      : generateInvoiceNumber();

  const row = {
    user_id: user.id,
    plan_id: planId,
    wallet_type: walletType,
    amount_usd: amountUsd,
    crypto_amount: cryptoAmount,
    status: "pending",
    invoice_number: num,
    payment_address: paymentAddress,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(row)
    .select()
    .single();

  dbgInvoiceErr("H1", "invoiceService.js:createPendingInvoice", error, {
    op: "insert",
    keys: Object.keys(row),
  });

  return { data, error };
}

export async function getInvoiceById(id) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  dbgInvoiceErr("H2", "invoiceService.js:getInvoiceById", error, {
    op: "select_one",
  });

  return { data, error };
}

export async function listInvoicesForUser({ status } = {}) {
  let q = supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  dbgInvoiceErr("H2", "invoiceService.js:listInvoicesForUser", error, {
    op: "select_list",
    status: status ?? null,
  });
  return { data, error };
}

/**
 * Admin: all invoices with optional filters.
 */
export async function listInvoicesAdmin({ userId, status } = {}) {
  let q = supabase.from("invoices").select("*").order("created_at", {
    ascending: false,
  });

  if (userId) q = q.eq("user_id", userId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  dbgInvoiceErr("H2", "invoiceService.js:listInvoicesAdmin", error, {
    op: "select_admin",
  });
  return { data, error };
}

export async function approveInvoice(invoiceId) {
  const { error } = await supabase.rpc("approve_invoice", {
    p_invoice_id: invoiceId,
  });
  dbgInvoiceErr("H3", "invoiceService.js:approveInvoice.rpc", error, {
    op: "approve_invoice",
  });
  return { error };
}

export async function rejectInvoice(invoiceId) {
  const { error } = await supabase.rpc("reject_invoice", {
    p_invoice_id: invoiceId,
  });
  return { error };
}

export async function adminCreateInvoice({
  userId,
  planId,
  walletType,
  amountUsd,
  cryptoAmount,
  paymentAddress,
}) {
  const { data, error } = await supabase.rpc("admin_create_invoice", {
    p_user_id: userId,
    p_plan_id: planId,
    p_wallet_type: walletType,
    p_amount_usd: amountUsd,
    p_crypto_amount: cryptoAmount,
    p_payment_address: paymentAddress ?? null,
  });

  dbgInvoiceErr("H3", "invoiceService.js:adminCreateInvoice.rpc", error, {
    op: "admin_create_invoice",
  });

  return { data, error };
}

export async function countInvoicesByUserAdmin() {
  const { data, error } = await supabase.from("invoices").select("user_id");

  dbgInvoiceErr("H2", "invoiceService.js:countInvoicesByUserAdmin", error, {
    op: "select_user_ids",
  });

  if (error) return { counts: {}, error };

  const counts = {};
  for (const row of data ?? []) {
    const u = row.user_id;
    counts[u] = (counts[u] ?? 0) + 1;
  }
  return { counts, error: null };
}
