// colourMatrixApi.ts — types + calls for /api/colour-matrix (axios baseURL is "/api")
import axios from "axios";

export interface ColourMatrixInfo {
  id: number;
  modelId: number;
  modelName?: string | null;
  variantId?: number | null;
  variantName?: string | null;
  colourId?: number | null;
  colourName?: string | null;
  title: string;
  originalFileName: string;
  fileType: "xlsx" | "pdf" | string;
  fileSize: number;
  isActive: boolean;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface PreviewCell {
  text?: string;
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  size?: number;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  wrap?: boolean;
  colSpan?: number;
  rowSpan?: number;
  covered?: boolean;
  image?: number;
}
export interface PreviewRow { index: number; height?: number; cells?: (PreviewCell | null)[] }
export interface PreviewSheet { name: string; columnCount?: number; columnWidths?: number[]; rows?: PreviewRow[]; truncated?: boolean }
export interface WorkbookPreview { sheets?: PreviewSheet[] }

export const listColourMatrices = async (
  params: { modelId?: number; variantId?: number; colourId?: number; includeInactive?: boolean },
  signal?: AbortSignal,
): Promise<ColourMatrixInfo[]> => {
  const r = await axios.get<ColourMatrixInfo[]>("/colour-matrix", { params, signal });
  return Array.isArray(r.data) ? r.data : [];
};

export const fetchPreview = async (id: number, signal?: AbortSignal): Promise<WorkbookPreview> =>
  (await axios.get<WorkbookPreview>(`/colour-matrix/${id}/preview`, { signal })).data;

/** Files are fetched with the login token (so admins can also open inactive ones) and shown from a blob URL. */
export const fetchFileBlob = async (id: number, signal?: AbortSignal): Promise<Blob> =>
  (await axios.get<Blob>(`/colour-matrix/${id}/file`, { responseType: "blob", signal })).data;

export const fetchCellImage = async (id: number, index: number, signal?: AbortSignal): Promise<Blob> =>
  (await axios.get<Blob>(`/colour-matrix/${id}/image/${index}`, { responseType: "blob", signal })).data;

export const downloadColourMatrix = async (m: ColourMatrixInfo): Promise<void> => {
  const blob = await fetchFileBlob(m.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = m.originalFileName || `colour-matrix-${m.id}.${m.fileType}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const matrixScopeLabel = (m: ColourMatrixInfo): string =>
  [m.modelName, m.variantName ?? "All variants", m.colourName ?? "All colours"].filter(Boolean).join(" · ");
