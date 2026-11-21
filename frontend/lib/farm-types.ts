export interface SavedField {
  id: string;
  name: string;
  crop_type: string;
  crop_variety: string;
  planting_date: string;
  area: number;
  area_unit: "acres" | "hectares";
  country: string;
  region: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  is_archived: boolean;
  updated_at: string;
}
export interface SavedImage {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  url: string | null;
}
export interface SavedObservation {
  id: string;
  field_id: string;
  observed_at: string;
  notes: string;
  images: SavedImage[];
}
export type FarmFeedback = { error?: string; message?: string; id?: string };
export const PHOTO_BUCKET = "crop-observations";
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const photoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
