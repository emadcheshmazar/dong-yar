import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { PersonType } from "@prisma/client";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "daria_dong_session";
const ADMIN_COOKIE_NAME = "daria_dong_admin";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function verifySignedValue(payload: string, signature: string) {
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifySharedPassword(password: string) {
  const hash = process.env.APP_SHARED_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);
  return password === (process.env.APP_SHARED_PASSWORD || "dong123456");
}

export async function verifyAdminPassword(password: string) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);
  return password === (process.env.ADMIN_PASSWORD || process.env.APP_SHARED_PASSWORD || "dong123456");
}

export async function createSession(personId: string) {
  const jar = await cookies();
  const payload = personId;
  jar.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function createAdminSession() {
  const jar = await cookies();
  const payload = "admin";
  jar.set(ADMIN_COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
}

export async function getCurrentPerson(groupSlug?: string) {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [personId, signature] = raw.split(".");
  if (!personId || !signature || !verifySignedValue(personId, signature)) {
    return null;
  }
  return prisma.person.findFirst({
    where: {
      id: personId,
      type: PersonType.MEMBER,
      isActive: true,
      ...(groupSlug ? { group: { slug: groupSlug, isActive: true } } : {}),
    },
    include: { group: true },
  });
}

export async function requirePerson(groupSlug: string) {
  const person = await getCurrentPerson(groupSlug);
  if (!person) redirect(`/${groupSlug}/login`);
  return person;
}

export async function getCurrentAdmin() {
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!raw) return false;
  const [payload, signature] = raw.split(".");
  return payload === "admin" && !!signature && verifySignedValue(payload, signature);
}

export async function requireAdmin() {
  const ok = await getCurrentAdmin();
  if (!ok) redirect("/admin/login");
}
