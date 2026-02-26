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
}

export interface Part {
  id: number;
  partNumber: string;
  partName: string;
  description: string;
  price: number;
  imagePath: string;
  categoryName: string;
}

export async function login(
  username: string,
  password: string,
  debug = false
): Promise<LoginResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (debug) {
    headers["X-Debug-Break"] = "true";
  }

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? 'Request failed');
  }

  return response.json();
}

// ===== VEHICLE MODELS =====
export async function getVehicleModels(): Promise<VehicleModel[]> {
  const response = await fetch("/api/vehiclemodels");
  if (!response.ok) throw new Error("Failed to fetch vehicle models");
  return response.json();
}

// ===== VEHICLE VARIANTS =====
export async function getVehicleVariants(modelId?: number): Promise<VehicleVariant[]> {
  const url = modelId ? `/api/vehiclevariants?modelId=${modelId}` : "/api/vehiclevariants";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch vehicle variants");
  return response.json();
}

// ===== VEHICLE COLOURS =====
export async function getVehicleColours(): Promise<VehicleColour[]> {
  const response = await fetch("/api/vehiclecolours");
  if (!response.ok) throw new Error("Failed to fetch vehicle colours");
  return response.json();
}

// ===== PARTS FILTERING =====
export async function getFilteredParts(
  modelId: number,
  variantId: number,
  colourId?: number
): Promise<Part[]> {
  const url = `/api/modelparts/filter?modelId=${modelId}&variantId=${variantId}${colourId ? `&colourId=${colourId}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch filtered parts");
  return response.json();
}

export async function getAllParts(): Promise<Part[]> {
  const response = await fetch("/api/parts");
  if (!response.ok) throw new Error("Failed to fetch parts");
  return response.json();
}