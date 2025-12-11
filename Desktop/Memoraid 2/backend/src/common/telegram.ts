import { createHmac } from "crypto";

export function verifyInitData(initData: string, botToken: string) {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const check = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return check === hash;
}

export function parseInitData(initData: string) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return { user };
  } catch {
    return null;
  }
}

