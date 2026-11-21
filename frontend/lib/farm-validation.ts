import { MAX_PHOTO_BYTES, photoExtensions } from "./farm-types";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    !value.startsWith("0000")
  );
}
export function formText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
export function validatePhoto(file: File) {
  if (!Object.hasOwn(photoExtensions, file.type))
    return "Choose a JPEG, PNG, or WebP image.";
  if (file.size < 1 || file.size > MAX_PHOTO_BYTES)
    return "Each image must be nonempty and at most 10 MB.";
  return "";
}
export async function verifyPhoto(file: File) {
  const error = validatePhoto(file);
  if (error) return error;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value);
  const matches =
    file.type === "image/jpeg"
      ? starts([255, 216, 255])
      : file.type === "image/png"
        ? starts([137, 80, 78, 71, 13, 10, 26, 10])
        : starts([82, 73, 70, 70]) && starts([87, 69, 66, 80], 8);
  return matches
    ? ""
    : "The file contents do not match the selected image format.";
}
