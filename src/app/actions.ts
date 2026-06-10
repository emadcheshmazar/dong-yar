"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExpenseStatus, PaymentStatus, PersonType } from "@prisma/client";
import { createSession, requirePerson, verifySharedPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateShare } from "@/lib/utils";
import { expenseSchema, loginSchema, personSchema } from "@/lib/validations";

function formStringArray(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ورود ناموفق بود." };
  let person = await prisma.person.findFirst({
    where: {
      username: parsed.data.username,
      type: PersonType.MEMBER,
      isActive: true,
    },
  });
  const ok = await verifySharedPassword(parsed.data.password);
  if (!ok) return { error: "رمز ورود درست نیست." };
  if (!person) {
    const memberCount = await prisma.person.count({
      where: { type: PersonType.MEMBER, isActive: true },
    });
    if (memberCount > 0) return { error: "این نام کاربری برای عضو ثابت پیدا نشد." };
    person = await prisma.person.create({
      data: {
        name: parsed.data.username,
        username: parsed.data.username,
        type: PersonType.MEMBER,
        isActive: true,
      },
    });
  }
  await createSession(person.id);
  redirect("/dashboard");
}

async function saveExpense(formData: FormData, mode: "create" | "edit") {
  const current = await requirePerson();
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
      ? await prisma.expense.findFirst({ where: { id: parsed.id, status: ExpenseStatus.ACTIVE } })
      : null;
  if (mode === "edit" && (!existing || existing.createdByPersonId !== current.id)) {
    throw new Error("فقط ثبت‌کننده خرج می‌تواند ویرایش کند.");
  }
  const localGuestIdMap = new Map<string, string>();
  for (const guest of localGuests) {
    if (guest.tempId && guest.name && parsed.participantIds.includes(guest.tempId)) {
      const created = await prisma.person.create({
        data: { name: guest.name, type: PersonType.GUEST, isActive: true },
      });
      localGuestIdMap.set(guest.tempId, created.id);
    }
  }
  const participantIds = parsed.participantIds.map((id) => localGuestIdMap.get(id) ?? id);
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
    revalidatePath(`/expenses/${existing!.id}`);
    redirect(`/expenses/${existing!.id}`);
  }

  const expense = await prisma.expense.create({
    data: {
      title: parsed.title,
      amount: parsed.amount,
      paidByPersonId: parsed.paidByPersonId,
      createdByPersonId: current.id,
      cardNumber: parsed.cardNumber || null,
      paymentNote: parsed.paymentNote || null,
      date: new Date(parsed.date),
      description: parsed.description || null,
      participants: { create: participantRows },
    },
  });
  revalidatePath("/expenses");
  redirect(`/expenses/${expense.id}`);
}

export async function createExpenseAction(formData: FormData) {
  await saveExpense(formData, "create");
}

export async function editExpenseAction(formData: FormData) {
  await saveExpense(formData, "edit");
}

export async function deleteExpenseAction(formData: FormData) {
  const current = await requirePerson();
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({ where: { id, status: ExpenseStatus.ACTIVE } });
  if (!expense || expense.createdByPersonId !== current.id) throw new Error("فقط ثبت‌کننده خرج می‌تواند حذف کند.");
  await prisma.expense.update({ where: { id }, data: { status: ExpenseStatus.CANCELLED } });
  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function markPaidAction(formData: FormData) {
  const current = await requirePerson();
  const expenseId = String(formData.get("expenseId") ?? "");
  const participant = await prisma.expenseParticipant.findFirst({
    where: { expenseId, personId: current.id },
    include: { expense: true },
  });
  if (!participant || participant.expense.paidByPersonId === current.id) return;
  await prisma.expenseParticipant.update({
    where: { id: participant.id },
    data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date(), markedByPersonId: current.id },
  });
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/dashboard");
}

export async function toggleGuestPaymentAction(formData: FormData) {
  const current = await requirePerson();
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.expenseParticipant.findUnique({
    where: { id: participantId },
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
  revalidatePath(`/expenses/${participant.expenseId}`);
}

export async function upsertPersonAction(formData: FormData) {
  await requirePerson();
  const parsed = personSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name"),
    username: formData.get("username")?.toString() || undefined,
    type: formData.get("type"),
    isActive: formData.get("isActive") === "on",
  });
  if (parsed.type === "MEMBER" && !parsed.username) throw new Error("عضو ثابت باید نام کاربری داشته باشد.");
  const data = {
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
  revalidatePath("/people");
  revalidatePath("/expenses/new");
}
