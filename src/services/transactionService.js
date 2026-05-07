import { supabase } from "./supabaseClient";

export async function listTransactionsForUser({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
}

export async function listTransactionsAdmin({ userId, limit = 200 } = {}) {
  let q = supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q;
  return { data, error };
}
