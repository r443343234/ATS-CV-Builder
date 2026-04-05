import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toEnglishDigits(str: string | undefined | null): string {
  if (!str) return "";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
}

export function deepConvertDigits<T>(obj: T): T {
  if (typeof obj === 'string') {
    return toEnglishDigits(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepConvertDigits) as unknown as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = deepConvertDigits((obj as any)[key]);
    }
    return newObj as T;
  }
  return obj;
}

// Simple encryption for local storage protection
const SECRET_SALT = "ats-ai-cv-secure-v1";

export function encryptData(data: any): string {
  const json = JSON.stringify(data);
  // Add a simple checksum for integrity
  const checksum = json.length.toString(16);
  const payload = `${checksum}:${json}`;
  const encoded = btoa(encodeURIComponent(payload));
  // Simple XOR-like obfuscation
  return encoded.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
  ).join('');
}

export function decryptData(encrypted: string): any {
  try {
    const decoded = encrypted.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
    ).join('');
    const payload = decodeURIComponent(atob(decoded));
    const [checksum, json] = payload.split(/:(.*)/s);
    
    // Verify integrity
    if (json.length.toString(16) !== checksum) {
      throw new Error("Data integrity check failed");
    }
    
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decrypt data", e);
    return null;
  }
}

export function sanitizeInput(str: string): string {
  if (!str) return "";
  // Basic XSS prevention
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
