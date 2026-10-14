import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import { newSecret } from "./id.js";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** API keys look like `idk_<40 chars>`; only the hash is stored. */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `idk_${newSecret()}`;
  return { key, hash: sha256(key), prefix: key.slice(0, 10) };
}

export function sign(payload: string): string {
  return createHmac("sha256", env.IDESK_SECRET).update(payload).digest("base64url");
}

export function makeSessionToken(ttlMs = 30 * 24 * 3600 * 1000): string {
  const payload = `owner.${Date.now() + ttlMs}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}
