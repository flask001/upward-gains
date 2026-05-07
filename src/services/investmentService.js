import { supabase } from "./supabaseClient";

export async function listInvestmentsForUser() {
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
}

/** Runs SQL batch profit job (admin JWT or scheduled job). */
export async function applyDailyProfits() {
  const { data, error } = await supabase.rpc("apply_daily_profits");
  return { count: data, error };
}
