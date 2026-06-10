import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { PersonType } from "@prisma/client";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "daria_dong_session";

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

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getCurrentPerson() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [personId, signature] = raw.split(".");
  if (!personId || !signature || !verifySignedValue(personId, signature)) {
    return null;
  }
  return prisma.person.findFirst({
    where: { id: personId, type: PersonType.MEMBER, isActive: true },
  });
}

export async function requirePerson() {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");
  return person;
}
