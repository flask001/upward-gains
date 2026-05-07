import { supabase } from "./supabaseClient";

export async function createWithdrawal({ amount, walletAddress }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not signed in") };

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { data: null, error: new Error("Invalid amount") };
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      user_id: user.id,
      amount: amt,
      wallet_address: walletAddress.trim(),
      status: "pending",
    })
    .select()
    .single();

  return { data, error };
}

export async function listWithdrawalsForUser() {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function listWithdrawalsAdmin({ userId, status } = {}) {
  let q = supabase
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) q = q.eq("user_id", userId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  return { data, error };
}

export async function approveWithdrawal(id) {
  const { error } = await supabase.rpc("approve_withdrawal", {
    p_withdrawal_id: id,
  });
  return { error };
}

export async function rejectWithdrawal(id) {
  const { error } = await supabase.rpc("reject_withdrawal", {
    p_withdrawal_id: id,
  });
  return { error };
}
