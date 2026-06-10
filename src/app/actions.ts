"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExpenseStatus, PaymentStatus, PersonType } from "@prisma/client";
import {
  createAdminSession,
  createSession,
  requireAdmin,
  requirePerson,
  verifyAdminPassword,
  verifySharedPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateShare } from "@/lib/utils";
import {
  adminLoginSchema,
  expenseSchema,
  groupLookupSchema,
  groupSchema,
  loginSchema,
  personSchema,
} from "@/lib/validations";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function formStringArray(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

async function getGroupForSlug(slug: string, includeInactive = false) {
  return prisma.group.findFirst({
    where: {
      slug: normalizeSlug(slug),
      ...(includeInactive ? {} : { isActive: true }),
    },
  });
}

export async function selectGroupAction(_: unknown, formData: FormData) {
  const parsed = groupLookupSchema.safeParse({
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "نام گروه درست نیست." };
  const group = await getGroupForSlug(parsed.data.groupSlug);
  if (!group) return { error: "این گروه وجود ندارد یا فعال نیست." };
  redirect(`/${group.slug}/login`);
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    groupSlug: normalizeSlug(String(formData.get("groupSlug") ?? "")),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ورود ناموفق بود." };
  const group = await getGroupForSlug(parsed.data.groupSlug ?? "");
  if (!group) return { error: "این گروه وجود ندارد یا فعال نیست." };
  const person = await prisma.person.findFirst({
    where: {
      groupId: group.id,
      username: parsed.data.username,
      type: PersonType.MEMBER,
      isActive: true,
    },
  });
  if (!person) return { error: "این نام کاربری برای این گروه پیدا نشد." };
  const ok = await verifySharedPassword(parsed.data.password);
  if (!ok) return { error: "رمز ورود درست نیست." };
  await createSession(person.id);
  redirect(`/${group.slug}/dashboard`);
}

export async function adminLoginAction(_: unknown, formData: FormData) {
  const parsed = adminLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ورود ادمین ناموفق بود." };
  const ok = await verifyAdminPassword(parsed.data.password);
  if (!ok) return { error: "رمز ادمین درست نیست." };
  await createAdminSession();
  redirect("/admin");
}

export async function upsertGroupAction(formData: FormData) {
  await requireAdmin();
  const parsed = groupSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
    isActive: formData.get("isActive") === "on",
  });
  const data = {
    name: parsed.name,
    slug: parsed.slug,
    isActive: parsed.isActive ?? true,
  };
  if (parsed.id) {
    await prisma.group.update({ where: { id: parsed.id }, data });
    revalidatePath("/admin");
    redirect(`/admin/groups/${data.slug}`);
  }
  const group = await prisma.group.create({ data });
  revalidatePath("/admin");
  redirect(`/admin/groups/${group.slug}`);
}

export async function deleteGroupAction(formData: FormData) {
  await requireAdmin();
  const groupId = String(formData.get("id") ?? "");
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
  revalidatePath("/admin");
  redirect("/admin");
}

export async function upsertPersonAction(formData: FormData) {
  await requireAdmin();
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const parsed = personSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    username: formData.get("username")?.toString() || undefined,
    type: formData.get("type"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.groupId) throw new Error("گروه مشخص نیست.");
  if (parsed.type === "MEMBER" && !parsed.username) throw new Error("عضو ثابت باید نام کاربری داشته باشد.");
  const data = {
    groupId: parsed.groupId,
    name: parsed.name,
    username: parsed.type === "MEMBER" ? parsed.username : null,
    type: parsed.type,
    isActive: parsed.isActive ?? true,
  };
  if (parsed.id) {
    await prisma.person.update({ where: { id: parsed.id }, data });
  } else {
    await prisma.person.create({ data });
  }
  revalidatePath(`/admin/groups/${groupSlug}`);
}

export async function deletePersonAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const [paidExpenses, createdExpenses, participations, markedPayments] = await Promise.all([
    prisma.expense.count({ where: { paidByPersonId: id } }),
    prisma.expense.count({ where: { createdByPersonId: id } }),
    prisma.expenseParticipant.count({ where: { personId: id } }),
    prisma.expenseParticipant.count({ where: { markedByPersonId: id } }),
  ]);
  if (paidExpenses + createdExpenses + participations + markedPayments > 0) {
    await prisma.person.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.person.delete({ where: { id } });
  }
  revalidatePath(`/admin/groups/${groupSlug}`);
}

async function saveExpense(formData: FormData, mode: "create" | "edit") {
  const groupSlug = normalizeSlug(String(formData.get("groupSlug") ?? ""));
  const isAdminMode = formData.get("adminMode") === "on";
  const group = await getGroupForSlug(groupSlug, isAdminMode);
  if (!group) throw new Error("گروه پیدا نشد.");
  const current = isAdminMode ? null : await requirePerson(group.slug);
  if (isAdminMode) await requireAdmin();

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
  const parsed = expenseSchema.parse(raw);
  const existing =
    mode === "edit"
      ? await prisma.expense.findFirst({
          where: { id: parsed.id, groupId: group.id, status: ExpenseStatus.ACTIVE },
        })
      : null;
  if (mode === "edit" && (!existing || (!isAdminMode && existing.createdByPersonId !== current?.id))) {
    throw new Error("فقط ثبت‌کننده خرج یا ادمین می‌تواند ویرایش کند.");
  }

  const localGuestIdMap = new Map<string, string>();
  for (const guest of localGuests) {
    if (guest.tempId && guest.name && parsed.participantIds.includes(guest.tempId)) {
      const created = await prisma.person.create({
        data: { groupId: group.id, name: guest.name, type: PersonType.GUEST, isActive: true },
      });
      localGuestIdMap.set(guest.tempId, created.id);
    }
  }
  const participantIds = parsed.participantIds.map((id) => localGuestIdMap.get(id) ?? id);
  const uniquePersonIds = Array.from(new Set([...participantIds, parsed.paidByPersonId]));
  const people = await prisma.person.findMany({
    where: { id: { in: uniquePersonIds }, groupId: group.id, isActive: true },
    select: { id: true, type: true },
  });
  if (people.length !== uniquePersonIds.length) throw new Error("یکی از افراد این خرج در این گروه معتبر نیست.");
  const payer = people.find((person) => person.id === parsed.paidByPersonId);
  if (!payer || payer.type !== PersonType.MEMBER) throw new Error("پرداخت‌کننده باید عضو ثابت همین گروه باشد.");

  const shareAmount = calculateShare(parsed.amount, participantIds.length);
  const participantRows = participantIds.map((personId) => ({
    personId,
    shareAmount,
    paymentStatus: personId === parsed.paidByPersonId ? PaymentStatus.PAID : PaymentStatus.UNPAID,
    paidAt: personId === parsed.paidByPersonId ? new Date() : null,
    markedByPersonId: null,
  }));

  if (mode === "edit") {
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
          date: new Date(parsed.date),
          description: parsed.description || null,
          participants: { create: participantRows },
        },
      }),
    ]);
    revalidatePath(`/${group.slug}/expenses/${existing!.id}`);
    revalidatePath(`/admin/groups/${group.slug}`);
    redirect(isAdminMode ? `/admin/groups/${group.slug}` : `/${group.slug}/expenses/${existing!.id}`);
  }

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      title: parsed.title,
      amount: parsed.amount,
      paidByPersonId: parsed.paidByPersonId,
      createdByPersonId: isAdminMode ? parsed.paidByPersonId : current!.id,
      cardNumber: parsed.cardNumber || null,
      paymentNote: parsed.paymentNote || null,
      date: new Date(parsed.date),
      description: parsed.description || null,
      participants: { create: participantRows },
    },
  });
  revalidatePath(`/${group.slug}/expenses`);
  revalidatePath(`/admin/groups/${group.slug}`);
  redirect(isAdminMode ? `/admin/groups/${group.slug}` : `/${group.slug}/expenses/${expense.id}`);
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
  const group = await getGroupForSlug(groupSlug, isAdminMode);
  if (!group) throw new Error("گروه پیدا نشد.");
  const current = isAdminMode ? null : await requirePerson(group.slug);
  if (isAdminMode) await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({
    where: { id, groupId: group.id, status: ExpenseStatus.ACTIVE },
  });
  if (!expense || (!isAdminMode && expense.createdByPersonId !== current?.id)) {
    throw new Error("فقط ثبت‌کننده خرج یا ادمین می‌تواند حذف کند.");
  }
  await prisma.expense.update({ where: { id }, data: { status: ExpenseStatus.CANCELLED } });
  revalidatePath(`/${group.slug}/expenses`);
  revalidatePath(`/admin/groups/${group.slug}`);
  redirect(isAdminMode ? `/admin/groups/${group.slug}` : `/${group.slug}/expenses`);
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
  if (!participant || participant.expense.paidByPersonId === current.id) return;
  await prisma.expenseParticipant.update({
    where: { id: participant.id },
    data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date(), markedByPersonId: current.id },
  });
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
    include: { person: true },
  });
  if (!participant || participant.person.type !== PersonType.GUEST) return;
  const next = participant.paymentStatus === PaymentStatus.PAID ? PaymentStatus.UNPAID : PaymentStatus.PAID;
  await prisma.expenseParticipant.update({
    where: { id: participantId },
    data: {
      paymentStatus: next,
      paidAt: next === PaymentStatus.PAID ? new Date() : null,
      markedByPersonId: next === PaymentStatus.PAID ? current.id : null,
    },
  });
  revalidatePath(`/${groupSlug}/expenses/${participant.expenseId}`);
}
