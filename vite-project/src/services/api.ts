export interface LoginResponse {
  username: string;
  token: string;
}

export interface VehicleModel {
  id: number;
  modelName: string;
}

export interface VehicleVariant {
  id: number;
  variantName: string;
  modelId: number;
}

export interface VehicleColour {
  id: number;
  colourName: string;
  modelId?: number | null;
  variantId?: number | null;
  imagePath?: string | null;
}

export interface VehicleImage {
  imagePath: string;
  modelName?: string;
  variantName?: string;
  colourName?: string;
  modelId?: number;
  variantId?: number;
  colourId?: number;
}

export interface Assembly {
  id: number;
  assemblyName: string;
  imagePath?: string | null;
  modelId?: number
}

export interface Part {
  id: number;
  partNumber: string;
  partName: string;
  imageNumber: string;
  remarks?: string
  description: string;
  price: number;
  imagePath: string;
  categoryName: string;
  stockQuantity: number;
  modelId?: number | null;
  assemblyId?: number | null;
  subParts?: Part[];
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return response.json();
}

export async function getVehicleModels(): Promise<VehicleModel[]> {

  const response = await fetch("/api/vehiclemodels");

  if (!response.ok) throw new Error("Failed to fetch vehicle models");

  return response.json();
}

export async function getVehicleVariants(
  modelId?: number
): Promise<VehicleVariant[]> {

  const url = modelId
    ? `/api/vehiclevariants?modelId=${modelId}`
    : "/api/vehiclevariants";

  const response = await fetch(url);

  if (!response.ok) throw new Error("Failed to fetch vehicle variants");

  return response.json();
}

export async function getVehicleColours(): Promise<VehicleColour[]> {

  const response = await fetch("/api/vehiclecolours");

  if (!response.ok) throw new Error("Failed to fetch vehicle colours");

  return response.json();
}

export async function getFilteredParts(
  modelId: number,
  variantId: number,
  colourId?: number
): Promise<Part[]> {

  const url = `/api/modelparts/filter?modelId=${modelId}&variantId=${variantId}${
    colourId ? `&colourId=${colourId}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) throw new Error("Failed to fetch filtered parts");

  return response.json();
}

export async function getAssembliesByModel(modelId: number): Promise<string[]> {

  const response = await fetch(`/api/assemblies/images/${modelId}`)

  if (!response.ok)
    throw new Error("Failed to fetch assembly images")

  return response.json()
}

export async function getAllParts(): Promise<Part[]> {

  const response = await fetch("/api/parts");

  if (!response.ok) throw new Error("Failed to fetch parts");

  return response.json();
}

/* ================= UPDATE PART REMARK ================= */

export async function updatePartRemark(
  partId: number,
  remark: string
) {

  const token = localStorage.getItem("token")

  const response = await fetch(
    `/api/parts/update-remark/${partId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ remark })
    }
  )

  if (!response.ok)
    throw new Error("Failed to update remark")

  return response.json()

}

// ===== VEHICLE IMAGE BY MODEL =====
export async function getVehicleImage(
  modelId: number,
  variantId: number,
  colourId: number
): Promise<VehicleImage> {
  return {
    imagePath: `/api/vehiclecolours/image?modelId=${modelId}&variantId=${variantId}&colourId=${colourId}`,
    modelId,
    variantId,
    colourId
  };
}


// ===== VEHICLE IMAGE BY VIN =====
interface VehicleByVinResponse {
  vehicle?: {
    modelId?: number | null;
    variantId?: number | null;
    colourId?: number | null;
    model?: {
      modelName?: string | null;
    } | null;
    variant?: {
      variantName?: string | null;
    } | null;
    colour?: {
      colourName?: string | null;
    } | null;
  } | null;
}

export async function getVehicleImageByVin(
  vin: string
): Promise<VehicleImage> {

  const response = await fetch(
    `/api/vehicles/search-by-vin/${encodeURIComponent(vin)}`
  );

  if (!response.ok) throw new Error("Failed to fetch vehicle image by VIN");

  const data: VehicleByVinResponse = await response.json();
  const vehicle = data.vehicle;

  const modelId = vehicle?.modelId ?? undefined;
  const variantId = vehicle?.variantId ?? undefined;
  const colourId = vehicle?.colourId ?? undefined;

  if (
    modelId == null ||
    variantId == null ||
    colourId == null
  ) {
    throw new Error("Vehicle details are incomplete");
  }

  return {
    imagePath: `/api/vehiclecolours/image?modelId=${modelId}&variantId=${variantId}&colourId=${colourId}`,
    modelId,
    variantId,
    colourId,
    modelName: vehicle?.model?.modelName ?? undefined,
    variantName: vehicle?.variant?.variantName ?? undefined,
    colourName: vehicle?.colour?.colourName ?? undefined
  };
}
