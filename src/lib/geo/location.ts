import { supabase } from "../supabase";

export type LocationOption = { id: number; name: string };

type ParentType = "region" | "province" | "municipality";

async function rpcLocationChildren(parentType: ParentType | null, parentId: number | null): Promise<LocationOption[] | null> {
  try {
    const { data, error } = await supabase.rpc("location_children", {
      parent_type: parentType,
      parent_id: parentId,
    });
    if (error || !Array.isArray(data)) return null;
    return data
      .map((row: any) => ({ id: Number(row?.id), name: String(row?.name ?? "").trim() }))
      .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.length > 0);
  } catch {
    return null;
  }
}

async function fallbackRegions(): Promise<LocationOption[]> {
  const { data, error } = await supabase.from("regions").select("id,name").order("name", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: any) => ({ id: Number(row?.id), name: String(row?.name ?? "").trim() }))
    .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.length > 0);
}

async function fallbackProvinces(regionId: number): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from("provinces")
    .select("id,name,region_id")
    .eq("region_id", regionId)
    .order("name", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: any) => ({ id: Number(row?.id), name: String(row?.name ?? "").trim() }))
    .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.length > 0);
}

async function fallbackMunicipalities(provinceId: number): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from("municipalities")
    .select("id,name,province_id")
    .eq("province_id", provinceId)
    .order("name", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: any) => ({ id: Number(row?.id), name: String(row?.name ?? "").trim() }))
    .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name.length > 0);
}

export async function getRegions(): Promise<LocationOption[]> {
  const rpc = await rpcLocationChildren(null, null);
  if (rpc && rpc.length > 0) return rpc;
  return fallbackRegions();
}

export async function getProvinces(regionId: number | null): Promise<LocationOption[]> {
  if (!regionId) return [];
  const rpc = await rpcLocationChildren("region", regionId);
  if (rpc && rpc.length > 0) return rpc;
  return fallbackProvinces(regionId);
}

export async function getMunicipalities(provinceId: number | null): Promise<LocationOption[]> {
  if (!provinceId) return [];
  const rpc = await rpcLocationChildren("province", provinceId);
  if (rpc && rpc.length > 0) return rpc;
  return fallbackMunicipalities(provinceId);
}

async function getLabelById(table: "regions" | "provinces" | "municipalities", id: number): Promise<string | null> {
  const { data, error } = await supabase.from(table).select("name").eq("id", id).maybeSingle();
  if (error) return null;
  const name = String((data as any)?.name ?? "").trim();
  return name || null;
}

export async function resolveItalianLocationLabels(input: {
  country?: string | null;
  regionId?: number | null;
  provinceId?: number | null;
  municipalityId?: number | null;
  regionLabel?: string | null;
  provinceLabel?: string | null;
  cityLabel?: string | null;
}) {
  const country = String(input.country ?? "").trim().toUpperCase();
  if (country !== "IT") {
    return {
      region: input.regionLabel ?? null,
      province: input.provinceLabel ?? null,
      city: input.cityLabel ?? null,
    };
  }

  let region = (input.regionLabel ?? "").trim() || null;
  let province = (input.provinceLabel ?? "").trim() || null;
  let city = (input.cityLabel ?? "").trim() || null;

  if (!region && input.regionId) region = await getLabelById("regions", input.regionId);
  if (!province && input.provinceId) province = await getLabelById("provinces", input.provinceId);
  if (!city && input.municipalityId) city = await getLabelById("municipalities", input.municipalityId);

  return { region, province, city };
}
