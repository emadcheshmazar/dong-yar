import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { FLASH_TOAST_COOKIE } from "@/lib/toast-types";
import type { ToastMessage, ToastType } from "@/lib/toast-types";

export async function setFlashToast(type: ToastType, message: string) {
  const jar = await cookies();
  const toast: ToastMessage = { id: randomUUID(), type, message };
  jar.set(FLASH_TOAST_COOKIE, encodeURIComponent(JSON.stringify(toast)), {
    path: "/",
    sameSite: "lax",
    maxAge: 30,
  });
}

export async function getFlashToast() {
  const raw = (await cookies()).get(FLASH_TOAST_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ToastMessage;
    if (!parsed.id || !parsed.message || !["success", "error"].includes(parsed.type)) return null;
    return parsed;
  } catch {
    return null;
  }
}
