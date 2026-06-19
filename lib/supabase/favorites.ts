import { SupabaseError } from "@/lib/errors";
import type { Property } from "@/types";
import { getServerSupabase } from "./server";

export async function listFavorites(userId: string | null): Promise<Property[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select("property_data")
    .eq("user_id", userId ?? "anon")
    .order("created_at", { ascending: false });
  if (error) throw new SupabaseError("listFavorites failed", { cause: error });
  return (data ?? []).map((r) => r.property_data as Property);
}

export async function saveFavorite(userId: string | null, property: Property) {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("favorites").upsert(
    {
      user_id: userId ?? "anon",
      property_id: property.propertyCode,
      property_data: property,
    },
    { onConflict: "user_id,property_id" }
  );
  if (error) throw new SupabaseError("saveFavorite failed", { cause: error });
}

export async function removeFavorite(userId: string | null, propertyCode: string) {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId ?? "anon")
    .eq("property_id", propertyCode);
  if (error) throw new SupabaseError("removeFavorite failed", { cause: error });
}
