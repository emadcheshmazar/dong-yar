"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  EmailVerificationPurpose,
  ExpenseStatus,
  MembershipRequestStatus,
  PaymentStatus,
  PersonType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  createAdminSession,
  createGroupAdminSession,
  createSession,
  createUserSession,
  getCurrentAdmin,
  requireUser,
  requireAdmin,
  requireGroupAdmin,
  requirePerson,
  verifyAdminPassword,
  verifyPersonPassword,
  verifySharedPassword,
  verifyUserPassword,
  destroyAllSessions,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { setFlashToast } from "@/lib/flash-toast";
import { calculatePayerShare, calculateShare, parseInputDate } from "@/lib/utils";
import {
  accountGroupSchema,
  adminLoginSchema,
  emailVerificationRequestSchema,
  expenseSchema,
  groupAdminLoginSchema,
  groupLookupSchema,
  groupSchema,
  loginSchema,
  membershipRequestSchema,
  membershipReviewSchema,
  personSchema,
  userLoginSchema,
  userSignupSchema,
} from "@/lib/validations";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeJoinCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function generateEmailCode() {
  return randomInt(100000, 1000000).toString();
}

function hashVerificationCode(email: string, purpose: EmailVerificationPurpose, code: string) {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return createHash("sha256").update(`${normalizeEmail(email)}:${purpose}:${code}:${secret}`).digest("hex");
}

function generateJoinCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const joinCode = generateJoinCode();
    const existing = await prisma.group.findUnique({ where: { joinCode }, select: { id: true } });
    if (!existing) return joinCode;
  }
  return `${generateJoinCode()}${randomInt(10, 99)}`;
}

function baseUsername(name: string, email: string) {
  const emailPrefix = email.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "-") || "user";
  const normalizedName = name.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "");
  return (normalizedName || emailPrefix).slice(0, 32);
}

async function generateUniqueUsername(groupId: string, name: string, email: string) {
  const base = baseUsername(name, email);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const username = attempt === 0 ? base : `${base}-${randomInt(10, 999)}`;
    const existing = await prisma.person.findFirst({ where: { groupId, username }, select: { id: true } });
    if (!existing) return username;
  }
  return `${base}-${randomBytes(2).toString("hex")}`;
}

function formStringArray(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

async function verifyEmailCode(email: string, purpose: EmailVerificationPurpose, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const verification = await prisma.emailVerificationCode.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!verification || verification.expiresAt < new Date()) {
    return { ok: false as const, message: "کد تایید منقضی شده یا پیدا نشد." };
  }
  if (verification.attempts >= 5) {
    return { ok: false as const, message: "تعداد تلاش برای این کد تمام شده. دوباره کد بگیر." };
  }
  const expected = hashVerificationCode(normalizedEmail, purpose, code);
  if (verification.codeHash !== expected) {
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, message: "کد تایید درست نیست." };
  }
  return { ok: true as const, verification };
}

async function getGroupForSlug(slug: string, includeInactive = false) {
  return prisma.group.findFirst({
    where: {
      slug: normalizeSlug(slug),
      ...(includeInactive ? {} : { isActive: true }),
    },
  });
}

async function resolveGroupByIdentifier(identifier: string, includeInactive = false) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const byJoinCode = await prisma.group.findFirst({
    where: {
      joinCode: normalizeJoinCode(trimmed),
      ...(includeInactive ? {} : { isActive: true }),
    },
  });
  if (byJoinCode) return byJoinCode;

  const bySlug = await getGroupForSlug(trimmed, includeInactive);
  if (bySlug) return bySlug;

  return prisma.group.findFirst({
    where: {
      name: { equals: trimmed, mode: "insensitive" },
      ...(includeInactive ? {} : { isActive: true }),
    },
  });
}

async function requireGroupManager(groupSlug: string) {
  const centralAdmin = await getCurrentAdmin();
  const group = await getGroupForSlug(groupSlug, Boolean(centralAdmin));
  if (!group) {
    await setFlashToast("error", "گروه پیدا نشد یا فعال نیست.");
    redirect(centralAdmin ? "/admin" : "/");
  }
  if (centralAdmin) return { group, centralAdmin: true, groupAdminId: null as string | null };
  const groupAdmin = await requireGroupAdmin(group.slug);
  return { group: groupAdmin.group, centralAdmin: false, groupAdminId: groupAdmin.id };
}

function managerPath(groupSlug: string, managerScope: string) {
  return managerScope === "group" ? `/${groupSlug}/admin` : `/admin/groups/${groupSlug}`;
}

function stateError(message: string) {
  return { error: message, toast: { type: "error" as const, message } };
}

function validationMessage(fallback: string, error?: { issues?: { message?: string }[] }) {
  return error?.issues?.[0]?.message ?? fallback;
}

function revalidateGroupAdminPages(groupSlug: string) {
  revalidatePath(`/admin/groups/${groupSlug}`);
  revalidatePath(`/${groupSlug}/admin`);
}

export async function sendEmailCodeAction(_: unknown, formData: FormData) {
  const parsed = emailVerificationRequestSchema.safeParse({
    email: formData.get("email"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return stateError(validationMessage("ایمیل درست نیست.", parsed.error));

  const code = generateEmailCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const email = normalizeEmail(parsed.data.email);
  const purpose = parsed.data.purpose as EmailVerificationPurpose;

  if (purpose === EmailVerificationPurpose.USER_SIGNUP) {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return stateError("این ایمیل قبلاً ثبت شده. از بخش ورود استفاده کن.");
    }
  }

  await prisma.emailVerificationCode.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.emailVerificationCode.create({
    data: {
      email,
      purpose,
      codeHash: hashVerificationCode(email, purpose, code),
      expiresAt,
    },
  });

  try {
    const result = await sendVerificationEmail({ email, code, purpose });
    const message = result.delivered ? "کد تایید به ایمیلت ارسال شد." : result.devMessage;
    return { success: true, toast: { type: "success" as const, message: message ?? "کد تایید ساخته شد." }, devCode: result.delivered ? null : code };
  } catch {
    return stateError("ارسال ایمیل انجام نشد. تنظیمات SMTP را بررسی کن.");
  }
}

export async function signupUserAction(_: unknown, formData: FormData) {
  const parsed = userSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code"),
    joinCode: formData.get("joinCode")?.toString() || undefined,
  });
  if (!parsed.success) return stateError(validationMessage("اطلاعات ثبت‌نام درست نیست.", parsed.error));

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return stateError("این ایمیل قبلاً ثبت شده. از بخش ورود استفاده کن.");

  const joinCode = parsed.data.joinCode ? normalizeJoinCode(parsed.data.joinCode) : "";
  const group = joinCode
    ? await prisma.group.findUnique({ where: { joinCode }, select: { id: true, name: true, slug: true, isActive: true } })
    : null;
  if (joinCode && (!group || !group.isActive)) {
    return stateError("کد دعوت گروه معتبر نیست.");
  }

  const verification = await verifyEmailCode(email, EmailVerificationPurpose.USER_SIGNUP, parsed.data.code);
  if (!verification.ok) return stateError(verification.message);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let personId: string | null = null;
  let redirectPath = "/account";
  const newPersonUsername = group ? await generateUniqueUsername(group.id, parsed.data.name, email) : null;
  try {
    const user = await prisma.$transaction(async (tx) => {
      const verifiedUser = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.emailVerificationCode.update({
        where: { id: verification.verification.id },
        data: { consumedAt: new Date() },
      });
      if (group) {
        const existingPerson = await tx.person.findFirst({
          where: { groupId: group.id, userId: verifiedUser.id, type: PersonType.MEMBER },
          select: { id: true },
        });
        if (existingPerson) {
          personId = existingPerson.id;
        } else {
          const person = await tx.person.create({
            data: {
              groupId: group.id,
              userId: verifiedUser.id,
              name: parsed.data.name,
              username: newPersonUsername,
              type: PersonType.MEMBER,
              isActive: true,
            },
            select: { id: true },
          });
          personId = person.id;
        }
        redirectPath = `/${group.slug}/dashboard`;
      }
      return verifiedUser;
    });
    await createUserSession(user.id);
    if (personId) await createSession(personId);
  } catch {
    return stateError("ثبت‌نام انجام نشد. دوباره تلاش کن.");
  }

  await setFlashToast("success", group ? `ثبت‌نام انجام شد و عضو گروه ${group.name} شدی.` : "ثبت‌نام انجام شد.");
  redirect(redirectPath);
}

export async function userLoginAction(_: unknown, formData: FormData) {
  const parsed = userLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return stateError(validationMessage("ورود ناموفق بود.", parsed.error));

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, passwordHash: true },
  });
  if (!user) return stateError("این ایمیل ثبت نشده. اول ثبت‌نام کن.");

  const ok = await verifyUserPassword(parsed.data.password, user.passwordHash);
  if (!ok) return stateError("رمز ورود درست نیست.");

  await createUserSession(user.id);
  await setFlashToast("success", `${user.name} خوش آمدی.`);
  redirect("/account");
}

export async function createAccountGroupAction(formData: FormData) {
  const user = await requireUser();
  const parsed = accountGroupSchema.safeParse({
    name: formData.get("name"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
  });
  if (!parsed.success) {
    await setFlashToast("error", validationMessage("اطلاعات گروه درست نیست.", parsed.error));
    revalidatePath("/account");
    return;
  }

  const existingGroup = await getGroupForSlug(parsed.data.slug, true);
  if (existingGroup) {
    await setFlashToast("error", "این شناسه گروه قبلا استفاده شده.");
    revalidatePath("/account");
    return;
  }

  let createdGroup;
  let adminPersonId: string | null = null;
  try {
    const joinCode = await generateUniqueJoinCode();
    createdGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          joinCode,
          isActive: true,
        },
      });
      const person = await tx.person.create({
        data: {
          groupId: group.id,
          userId: user.id,
          name: user.name,
          username: baseUsername(user.name, user.email),
          type: PersonType.MEMBER,
          isGroupAdmin: true,
          isActive: true,
        },
        select: { id: true },
      });
      adminPersonId = person.id;
      return group;
    });
    if (adminPersonId) await createGroupAdminSession(adminPersonId);
  } catch {
    await setFlashToast("error", "ساخت گروه انجام نشد.");
    revalidatePath("/account");
    return;
  }

  await setFlashToast("success", `گروه ${createdGroup.name} ساخته شد و تو ادمین آن شدی.`);
  redirect(`/${createdGroup.slug}/admin`);
}

export async function submitMembershipRequestAction(formData: FormData) {
  const user = await requireUser();
  const parsed = membershipRequestSchema.safeParse({
    groupIdentifier: String(formData.get("groupIdentifier") ?? ""),
  });
  if (!parsed.success) {
    await setFlashToast("error", validationMessage("اطلاعات گروه درست نیست.", parsed.error));
    revalidatePath("/account");
    return;
  }
  const group = await resolveGroupByIdentifier(parsed.data.groupIdentifier);
  if (!group || !group.isActive) {
    await setFlashToast("error", "گروهی با این کد، شناسه یا نام پیدا نشد.");
    revalidatePath("/account");
    return;
  }
  const existingPerson = await prisma.person.findFirst({
    where: { groupId: group.id, userId: user.id, type: PersonType.MEMBER, isActive: true },
    select: { id: true },
  });
  if (existingPerson) {
    await setFlashToast("success", `تو همین حالا عضو گروه ${group.name} هستی.`);
    redirect(`/${group.slug}/dashboard`);
  }
  await prisma.membershipRequest.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: {
      status: MembershipRequestStatus.PENDING,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedByPersonId: null,
    },
    create: {
      userId: user.id,
      groupId: group.id,
      status: MembershipRequestStatus.PENDING,
    },
  });
  await setFlashToast("success", `درخواست عضویت برای گروه ${group.name} ثبت شد.`);
  revalidatePath("/account");
}

export async function enterMembershipAction(formData: FormData) {
  const user = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const person = await prisma.person.findFirst({
    where: { id: personId, userId: user.id, type: PersonType.MEMBER, isActive: true, group: { isActive: true } },
    include: { group: true },
  });
  if (!person) {
    await setFlashToast("error", "عضویت فعال پیدا نشد.");
    redirect("/account");
  }
  await createSession(person.id);
  await setFlashToast("success", `وارد گروه ${person.group.name} شدی.`);
  redirect(`/${person.group.slug}/dashboard`);
}

export async function enterGroupAdminAction(formData: FormData) {
  const user = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      userId: user.id,
      type: PersonType.MEMBER,
      isGroupAdmin: true,
      isActive: true,
      group: { isActive: true },
    },
    include: { group: true },
  });
  if (!person) {
    await setFlashToast("error", "دسترسی ادمین این گروه پیدا نشد.");
    redirect("/account");
  }
  await createGroupAdminSession(person.id);
  await setFlashToast("success", `وارد پنل مدیریت گروه ${person.group.name} شدی.`);
  redirect(`/${person.group.slug}/admin`);
}

export async function selectGroupAction(_: unknown, formData: FormData) {
  const parsed = groupLookupSchema.safeParse({
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
  });
  if (!parsed.success) return stateError(validationMessage("نام گروه درست نیست.", parsed.error));
  const group = await getGroupForSlug(parsed.data.groupSlug);
  if (!group) return stateError("این گروه وجود ندارد یا فعال نیست.");
  await setFlashToast("success", `گروه ${group.name} پیدا شد.`);
  redirect("/login");
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return stateError(validationMessage("ورود ناموفق بود.", parsed.error));
  const group = await getGroupForSlug(parsed.data.groupSlug ?? "");
  if (!group) return stateError("این گروه وجود ندارد یا فعال نیست.");
  const person = await prisma.person.findFirst({
    where: {
      groupId: group.id,
      username: parsed.data.username,
      type: PersonType.MEMBER,
      isActive: true,
    },
  });
  if (!person) return stateError("این نام کاربری برای این گروه پیدا نشد.");
  const ok = person.passwordHash
    ? await verifyPersonPassword(parsed.data.password, person.passwordHash)
    : await verifySharedPassword(parsed.data.password);
  if (!ok) return stateError("رمز ورود درست نیست.");
  await createSession(person.id);
  await setFlashToast("success", `${person.name} خوش آمدی.`);
  redirect(`/${group.slug}/dashboard`);
}

export async function adminLoginAction(_: unknown, formData: FormData) {
  const parsed = adminLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return stateError(validationMessage("ورود ادمین ناموفق بود.", parsed.error));
  const ok = await verifyAdminPassword(parsed.data.password);
  if (!ok) return stateError("رمز ادمین درست نیست.");
  await createAdminSession();
  await setFlashToast("success", "ورود به پنل ادمین موفق بود.");
  redirect("/admin");
}

export async function groupAdminLoginAction(_: unknown, formData: FormData) {
  const parsed = groupAdminLoginSchema.safeParse({
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return stateError(validationMessage("ورود ادمین گروه ناموفق بود.", parsed.error));
  const group = await getGroupForSlug(parsed.data.groupSlug);
  if (!group) return stateError("این گروه وجود ندارد یا فعال نیست.");
  const person = await prisma.person.findFirst({
    where: {
      groupId: group.id,
      username: parsed.data.username,
      type: PersonType.MEMBER,
      isGroupAdmin: true,
      isActive: true,
    },
  });
  if (!person) return stateError("این ادمین برای گروه پیدا نشد.");
  const ok = person.passwordHash
    ? await verifyPersonPassword(parsed.data.password, person.passwordHash)
    : await verifySharedPassword(parsed.data.password);
  if (!ok) return stateError("رمز ادمین گروه درست نیست.");
  await createGroupAdminSession(person.id);
  await setFlashToast("success", `${person.name} وارد پنل ادمین ${group.name} شد.`);
  redirect(`/${group.slug}/admin`);
}

export async function upsertGroupAction(formData: FormData) {
  await requireAdmin();
  const parsedResult = groupSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
    isActive: formData.get("isActive") === "on",
    adminName: formData.get("adminName")?.toString() || undefined,
    adminUsername: formData.get("adminUsername")?.toString() || undefined,
    adminPassword: formData.get("adminPassword")?.toString() || undefined,
  });
  if (!parsedResult.success) {
    await setFlashToast("error", validationMessage("اطلاعات گروه درست نیست.", parsedResult.error));
    revalidatePath("/admin");
    return;
  }
  const parsed = parsedResult.data;
  const data = {
    name: parsed.name,
    slug: parsed.slug,
    isActive: parsed.isActive ?? true,
  };
  if (parsed.id) {
    try {
      await prisma.group.update({ where: { id: parsed.id }, data });
    } catch {
      await setFlashToast("error", "ویرایش گروه انجام نشد.");
      revalidatePath("/admin");
      return;
    }
    await setFlashToast("success", `گروه ${data.name} ویرایش شد.`);
    revalidatePath("/admin");
    redirect(`/admin/groups/${data.slug}`);
  }
  if (!parsed.adminName || !parsed.adminUsername || !parsed.adminPassword) {
    await setFlashToast("error", "برای ساخت گروه باید نام، نام کاربری و رمز ادمین گروه را وارد کنید.");
    revalidatePath("/admin");
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.adminPassword, 12);
  let group;
  try {
    const joinCode = await generateUniqueJoinCode();
    group = await prisma.group.create({
      data: {
        ...data,
        joinCode,
        people: {
          create: {
            name: parsed.adminName,
            username: parsed.adminUsername,
            passwordHash,
            type: PersonType.MEMBER,
            isGroupAdmin: true,
            isActive: true,
          },
        },
      },
    });
  } catch {
    await setFlashToast("error", "ساخت گروه انجام نشد. شناسه یا نام کاربری را بررسی کن.");
    revalidatePath("/admin");
    return;
  }
  await setFlashToast("success", `گروه ${group.name} ساخته شد.`);
  revalidatePath("/admin");
  redirect(`/admin/groups/${group.slug}`);
}

export async function logoutAllAction() {
  await destroyAllSessions();
  await setFlashToast("success", "با موفقیت خارج شدی.");
  redirect("/login");
}

export async function reviewMembershipRequestAction(formData: FormData) {
  const parsed = membershipReviewSchema.safeParse({
    requestId: formData.get("requestId"),
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    await setFlashToast("error", validationMessage("درخواست عضویت درست نیست.", parsed.error));
    return;
  }

  const { group, groupAdminId } = await requireGroupManager(parsed.data.groupSlug);
  const request = await prisma.membershipRequest.findFirst({
    where: { id: parsed.data.requestId, groupId: group.id },
    include: { user: true },
  });
  if (!request || request.status !== MembershipRequestStatus.PENDING) {
    await setFlashToast("error", "درخواست عضویت pending پیدا نشد.");
    revalidateGroupAdminPages(group.slug);
    return;
  }

  try {
    if (parsed.data.decision === "reject") {
      await prisma.membershipRequest.update({
        where: { id: request.id },
        data: {
          status: MembershipRequestStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedByPersonId: groupAdminId,
        },
      });
      await setFlashToast("success", `درخواست ${request.user.name} رد شد.`);
    } else {
      const username = await generateUniqueUsername(group.id, request.user.name, request.user.email);
      await prisma.$transaction(async (tx) => {
        const existingPerson = await tx.person.findFirst({
          where: { groupId: group.id, userId: request.userId, type: PersonType.MEMBER },
          select: { id: true },
        });
        if (!existingPerson) {
          await tx.person.create({
            data: {
              groupId: group.id,
              userId: request.userId,
              name: request.user.name,
              username,
              type: PersonType.MEMBER,
              isActive: true,
            },
          });
        }
        await tx.membershipRequest.update({
          where: { id: request.id },
          data: {
            status: MembershipRequestStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedByPersonId: groupAdminId,
          },
        });
      });
      await setFlashToast("success", `${request.user.name} عضو گروه شد.`);
    }
  } catch {
    await setFlashToast("error", "بررسی درخواست عضویت انجام نشد.");
    revalidateGroupAdminPages(group.slug);
    return;
  }

  revalidateGroupAdminPages(group.slug);
  revalidatePath("/account");
}

export async function deleteGroupAction(formData: FormData) {
  await requireAdmin();
  const groupId = String(formData.get("id") ?? "");
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) {
    await setFlashToast("error", "گروه پیدا نشد.");
    revalidatePath("/admin");
    return;
  }
  try {
    await prisma.$transaction(async (tx) => {
      const expenses = await tx.expense.findMany({
        where: { groupId },
        select: { id: true },
      });
      const expenseIds = expenses.map((expense) => expense.id);
      if (expenseIds.length) {
        await tx.expenseParticipant.deleteMany({ where: { expenseId: { in: expenseIds } } });
        await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
      }
      await tx.person.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });
  } catch {
    await setFlashToast("error", `حذف گروه ${group.name} انجام نشد.`);
    revalidatePath("/admin");
    return;
  }
  await setFlashToast("success", `گروه ${group.name} حذف شد.`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function upsertPersonAction(formData: FormData) {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const { group, centralAdmin } = await requireGroupManager(groupSlug);
  const parsedResult = personSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    username: formData.get("username")?.toString() || undefined,
    type: formData.get("type"),
    isGroupAdmin: formData.get("isGroupAdmin") === "on",
    password: formData.get("password")?.toString() || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsedResult.success) {
    await setFlashToast("error", validationMessage("اطلاعات کاربر درست نیست.", parsedResult.error));
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  const parsed = parsedResult.data;
  if (!parsed.groupId || parsed.groupId !== group.id) {
    await setFlashToast("error", "گروه مشخص نیست.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  if (parsed.type === "GUEST") {
    await setFlashToast("error", "مهمان فقط داخل هر خرج اضافه می‌شود.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  if (parsed.type === "MEMBER" && !parsed.username) {
    await setFlashToast("error", "عضو ثابت باید نام کاربری داشته باشد.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  const existing = parsed.id ? await prisma.person.findFirst({ where: { id: parsed.id, groupId: group.id } }) : null;
  if (parsed.id && !existing) {
    await setFlashToast("error", "کاربر در این گروه پیدا نشد.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  const isGroupAdmin = parsed.type === "MEMBER" ? Boolean(parsed.isGroupAdmin) : false;
  const passwordHash =
    !centralAdmin && parsed.password ? await bcrypt.hash(parsed.password, 12) : existing?.passwordHash ?? null;
  const data = {
    groupId: parsed.groupId,
    name: parsed.name,
    username: parsed.username,
    passwordHash: parsed.type === "MEMBER" ? passwordHash : null,
    type: parsed.type,
    isGroupAdmin,
    isActive: parsed.isActive ?? true,
  };
  const label = "کاربر";
  try {
    if (parsed.id) {
      await prisma.person.update({ where: { id: parsed.id }, data });
    } else {
      await prisma.person.create({ data });
    }
  } catch {
    await setFlashToast("error", `${parsed.id ? "ویرایش" : "افزودن"} ${label} ${parsed.name} انجام نشد.`);
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  await setFlashToast("success", `${label} ${parsed.name} ${parsed.id ? "ویرایش شد" : "اضافه شد"}.`);
  revalidateGroupAdminPages(groupSlug);
}

export async function deletePersonAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const { group, groupAdminId } = await requireGroupManager(groupSlug);
  if (groupAdminId === id) {
    await setFlashToast("error", "ادمین گروه نمی‌تواند خودش را حذف کند.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  const person = await prisma.person.findFirst({ where: { id, groupId: group.id } });
  if (!person) {
    await setFlashToast("error", "کاربر در این گروه پیدا نشد.");
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  const [paidExpenses, createdExpenses, participations, markedPayments] = await Promise.all([
    prisma.expense.count({ where: { paidByPersonId: id } }),
    prisma.expense.count({ where: { createdByPersonId: id } }),
    prisma.expenseParticipant.count({ where: { personId: id } }),
    prisma.expenseParticipant.count({ where: { markedByPersonId: id } }),
  ]);
  const label = person.type === PersonType.GUEST ? "مهمان" : "کاربر";
  try {
    if (person.type === PersonType.MEMBER && paidExpenses + createdExpenses + participations + markedPayments > 0) {
      await prisma.person.update({
        where: { id },
        data: {
          type: PersonType.GUEST,
          userId: null,
          username: null,
          passwordHash: null,
          isGroupAdmin: false,
          isActive: true,
        },
      });
      await setFlashToast("success", `${person.name} از اعضا حذف شد و در خرج‌های قبلی با همان نام به‌صورت مهمان باقی ماند.`);
    } else if (paidExpenses + createdExpenses + participations + markedPayments > 0) {
      await prisma.person.update({ where: { id }, data: { isActive: false } });
      await setFlashToast("success", `${label} ${person.name} غیرفعال شد.`);
    } else {
      await prisma.person.delete({ where: { id } });
      await setFlashToast("success", `${label} ${person.name} حذف شد.`);
    }
  } catch {
    await setFlashToast("error", `حذف ${label} ${person.name} انجام نشد.`);
    revalidateGroupAdminPages(groupSlug);
    return;
  }
  revalidateGroupAdminPages(groupSlug);
}

async function saveExpense(formData: FormData, mode: "create" | "edit") {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const isAdminMode = formData.get("adminMode") === "on";
  const managerScope = String(formData.get("managerScope") ?? "central");
  const manager = isAdminMode ? await requireGroupManager(groupSlug) : null;
  const group = manager?.group ?? (await getGroupForSlug(groupSlug, isAdminMode));
  if (!group) {
    await setFlashToast("error", "گروه پیدا نشد.");
    return;
  }
  if (manager?.centralAdmin) {
    await setFlashToast("error", "ادمین اصلی فقط گزارش خرج‌های گروه را می‌بیند و نمی‌تواند خرج ایجاد یا ویرایش کند.");
    revalidatePath(`/admin/groups/${group.slug}`);
    return;
  }
  const current = isAdminMode ? null : await requirePerson(group.slug);

  const localGuests = formStringArray(formData, "localGuests").map((value) => {
    const [tempId, name] = value.split("|||");
    return { tempId, name };
  });
  const raw = {
    id: formData.get("id")?.toString(),
    title: formData.get("title"),
    amount: formData.get("amount"),
    paidByPersonId: formData.get("paidByPersonId"),
    cardNumber: formData.get("cardNumber")?.toString(),
    paymentNote: formData.get("paymentNote")?.toString(),
    date: formData.get("date"),
    description: formData.get("description")?.toString(),
    participantIds: formStringArray(formData, "participantIds"),
  };
  const parsedResult = expenseSchema.safeParse(raw);
  if (!parsedResult.success) {
    await setFlashToast("error", validationMessage("اطلاعات خرج درست نیست.", parsedResult.error));
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  const parsed = parsedResult.data;
  const existing =
    mode === "edit"
      ? await prisma.expense.findFirst({
          where: { id: parsed.id, groupId: group.id, status: ExpenseStatus.ACTIVE },
        })
      : null;
  if (mode === "edit" && (!existing || (!isAdminMode && existing.createdByPersonId !== current?.id))) {
    await setFlashToast("error", "فقط ثبت‌کننده خرج یا ادمین می‌تواند ویرایش کند.");
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }

  const localGuestIdMap = new Map<string, string>();
  try {
    for (const guest of localGuests) {
      if (guest.tempId && guest.name && parsed.participantIds.includes(guest.tempId)) {
        const created = await prisma.person.create({
          data: {
            groupId: group.id,
            name: guest.name,
            username: `guest-${randomBytes(4).toString("hex")}`,
            type: PersonType.GUEST,
            isActive: true,
          },
        });
        localGuestIdMap.set(guest.tempId, created.id);
      }
    }
  } catch {
    await setFlashToast("error", "افزودن مهمان‌های خرج انجام نشد.");
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  const participantIds = parsed.participantIds.map((id) => localGuestIdMap.get(id) ?? id);
  const uniquePersonIds = Array.from(new Set([...participantIds, parsed.paidByPersonId]));
  const people = await prisma.person.findMany({
    where: { id: { in: uniquePersonIds }, groupId: group.id, isActive: true },
    select: { id: true, type: true },
  });
  if (people.length !== uniquePersonIds.length) {
    await setFlashToast("error", "یکی از افراد این خرج در این گروه معتبر نیست.");
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  const payer = people.find((person) => person.id === parsed.paidByPersonId);
  if (!payer || payer.type !== PersonType.MEMBER) {
    await setFlashToast("error", "پرداخت‌کننده باید عضو ثابت همین گروه باشد.");
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }

  const debtShare = calculateShare(parsed.amount, participantIds.length);
  const participantRows = participantIds.map((personId) => ({
    personId,
    shareAmount:
      personId === parsed.paidByPersonId
        ? calculatePayerShare(parsed.amount, participantIds.length)
        : debtShare,
    paymentStatus: personId === parsed.paidByPersonId ? PaymentStatus.PAID : PaymentStatus.UNPAID,
    paidAt: personId === parsed.paidByPersonId ? new Date() : null,
    markedByPersonId: null,
  }));

  if (mode === "edit") {
    try {
      await prisma.$transaction([
        prisma.expenseParticipant.deleteMany({ where: { expenseId: existing!.id } }),
        prisma.expense.update({
          where: { id: existing!.id },
          data: {
            title: parsed.title,
            amount: parsed.amount,
            paidByPersonId: parsed.paidByPersonId,
            cardNumber: parsed.cardNumber || null,
            paymentNote: parsed.paymentNote || null,
            date: parseInputDate(parsed.date),
            description: parsed.description || null,
            participants: { create: participantRows },
          },
        }),
      ]);
    } catch {
      await setFlashToast("error", `ویرایش خرج ${parsed.title} انجام نشد.`);
      revalidatePath(`/${group.slug}/expenses/${existing!.id}`);
      revalidateGroupAdminPages(group.slug);
      return;
    }
    await setFlashToast("success", `خرج ${parsed.title} ویرایش شد.`);
    revalidatePath(`/${group.slug}/expenses/${existing!.id}`);
    revalidatePath(`/admin/groups/${group.slug}`);
    revalidatePath(`/${group.slug}/admin`);
    redirect(isAdminMode ? managerPath(group.slug, managerScope) : `/${group.slug}/expenses/${existing!.id}`);
  }

  let expense;
  try {
    expense = await prisma.expense.create({
      data: {
        groupId: group.id,
        title: parsed.title,
        amount: parsed.amount,
        paidByPersonId: parsed.paidByPersonId,
        createdByPersonId: isAdminMode ? parsed.paidByPersonId : current!.id,
        cardNumber: parsed.cardNumber || null,
        paymentNote: parsed.paymentNote || null,
        date: parseInputDate(parsed.date),
        description: parsed.description || null,
        participants: { create: participantRows },
      },
    });
  } catch {
    await setFlashToast("error", `ثبت خرج ${parsed.title} انجام نشد.`);
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  await setFlashToast("success", `خرج ${expense.title} ثبت شد.`);
  revalidatePath(`/${group.slug}/expenses`);
  revalidatePath(`/admin/groups/${group.slug}`);
  revalidatePath(`/${group.slug}/admin`);
  redirect(isAdminMode ? managerPath(group.slug, managerScope) : `/${group.slug}/expenses/${expense.id}`);
}

export async function createExpenseAction(formData: FormData) {
  await saveExpense(formData, "create");
}

export async function editExpenseAction(formData: FormData) {
  await saveExpense(formData, "edit");
}

export async function deleteExpenseAction(formData: FormData) {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const isAdminMode = formData.get("adminMode") === "on";
  const managerScope = String(formData.get("managerScope") ?? "central");
  const manager = isAdminMode ? await requireGroupManager(groupSlug) : null;
  const group = manager?.group ?? (await getGroupForSlug(groupSlug, isAdminMode));
  if (!group) {
    await setFlashToast("error", "گروه پیدا نشد.");
    return;
  }
  if (manager?.centralAdmin) {
    await setFlashToast("error", "ادمین اصلی نمی‌تواند گزارش خرج‌های گروه را حذف کند.");
    revalidatePath(`/admin/groups/${group.slug}`);
    return;
  }
  const current = isAdminMode ? null : await requirePerson(group.slug);
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({
    where: { id, groupId: group.id, status: ExpenseStatus.ACTIVE },
  });
  if (!expense || (!isAdminMode && expense.createdByPersonId !== current?.id)) {
    await setFlashToast("error", "فقط ثبت‌کننده خرج یا ادمین می‌تواند حذف کند.");
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  try {
    await prisma.expense.update({ where: { id }, data: { status: ExpenseStatus.CANCELLED } });
  } catch {
    await setFlashToast("error", `حذف خرج ${expense.title} انجام نشد.`);
    revalidatePath(`/${group.slug}/expenses`);
    revalidateGroupAdminPages(group.slug);
    return;
  }
  await setFlashToast("success", `خرج ${expense.title} حذف شد.`);
  revalidatePath(`/${group.slug}/expenses`);
  revalidatePath(`/admin/groups/${group.slug}`);
  revalidatePath(`/${group.slug}/admin`);
  redirect(isAdminMode ? managerPath(group.slug, managerScope) : `/${group.slug}/expenses`);
}

export async function markPaidAction(formData: FormData) {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const current = await requirePerson(groupSlug);
  const expenseId = String(formData.get("expenseId") ?? "");
  const participant = await prisma.expenseParticipant.findFirst({
    where: {
      expenseId,
      personId: current.id,
      expense: { groupId: current.groupId },
    },
    include: { expense: true },
  });
  if (!participant || participant.expense.paidByPersonId === current.id) {
    await setFlashToast("error", "امکان ثبت پرداخت برای این دنگ وجود ندارد.");
    revalidatePath(`/${groupSlug}/expenses/${expenseId}`);
    return;
  }
  try {
    await prisma.expenseParticipant.update({
      where: { id: participant.id },
      data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date(), markedByPersonId: current.id },
    });
  } catch {
    await setFlashToast("error", `ثبت پرداخت دنگ ${participant.expense.title} انجام نشد.`);
    revalidatePath(`/${groupSlug}/expenses/${expenseId}`);
    return;
  }
  await setFlashToast("success", `دنگ ${participant.expense.title} پرداخت شد.`);
  revalidatePath(`/${groupSlug}/expenses/${expenseId}`);
  revalidatePath(`/${groupSlug}/dashboard`);
}

export async function toggleGuestPaymentAction(formData: FormData) {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const current = await requirePerson(groupSlug);
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.expenseParticipant.findFirst({
    where: {
      id: participantId,
      expense: { groupId: current.groupId },
    },
    include: { expense: true, person: true },
  });
  if (!participant || participant.person.type !== PersonType.GUEST) {
    await setFlashToast("error", "امکان تغییر وضعیت پرداخت این مهمان وجود ندارد.");
    revalidatePath(`/${groupSlug}/expenses`);
    return;
  }
  const next = participant.paymentStatus === PaymentStatus.PAID ? PaymentStatus.UNPAID : PaymentStatus.PAID;
  try {
    await prisma.expenseParticipant.update({
      where: { id: participantId },
      data: {
        paymentStatus: next,
        paidAt: next === PaymentStatus.PAID ? new Date() : null,
        markedByPersonId: next === PaymentStatus.PAID ? current.id : null,
      },
    });
  } catch {
    await setFlashToast("error", `تغییر پرداخت ${participant.person.name} انجام نشد.`);
    revalidatePath(`/${groupSlug}/expenses/${participant.expenseId}`);
    return;
  }
  await setFlashToast(
    "success",
    `پرداخت ${participant.person.name} برای ${participant.expense.title} ${next === PaymentStatus.PAID ? "ثبت شد" : "باز شد"}.`,
  );
  revalidatePath(`/${groupSlug}/expenses/${participant.expenseId}`);
}
