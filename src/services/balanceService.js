import { supabase } from "./supabaseClient";

export async function getBalance(userId) {
  if (!userId) return { balance: 0, error: null };

  const { data, error } = await supabase
    .from("balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { balance: null, error };
  return { balance: Number(data?.balance ?? 0), error: null };
}
