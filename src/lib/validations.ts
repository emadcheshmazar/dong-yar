import { z } from "zod";

export const loginSchema = z.object({
  groupSlug: z.string().trim().min(1, "گروه را انتخاب کن.").optional(),
  username: z.string().trim().min(1, "نام کاربری را وارد کن."),
  password: z.string().min(1, "رمز ورود را وارد کن."),
});

export const groupLookupSchema = z.object({
  groupSlug: z.string().trim().min(1, "نام گروه را وارد کن."),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "رمز ادمین را وارد کن."),
});

export const groupAdminLoginSchema = z.object({
  groupSlug: z.string().trim().min(1, "گروه را انتخاب کن."),
  username: z.string().trim().min(1, "نام کاربری ادمین را وارد کن."),
  password: z.string().min(1, "رمز ادمین گروه را وارد کن."),
});

export const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "نام گروه کوتاه است."),
  slug: z
    .string()
    .trim()
    .min(2, "شناسه گروه کوتاه است.")
    .regex(/^[a-z0-9-]+$/, "شناسه گروه فقط حروف انگلیسی کوچک، عدد و خط تیره باشد."),
  isActive: z.coerce.boolean().optional(),
  adminName: z.string().trim().optional(),
  adminUsername: z.string().trim().optional(),
  adminPassword: z.string().optional(),
});

export const personSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().min(1, "گروه مشخص نیست.").optional(),
  name: z.string().trim().min(2, "نام کوتاه است."),
  username: z.string().trim().optional(),
  type: z.enum(["MEMBER", "GUEST"]),
  isGroupAdmin: z.coerce.boolean().optional(),
  password: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان خرج را بنویس."),
  amount: z.coerce.number().int().positive("مبلغ باید عدد مثبت باشد."),
  paidByPersonId: z.string().min(1, "پرداخت‌کننده را انتخاب کن."),
  cardNumber: z.string().trim().optional(),
  paymentNote: z.string().trim().optional(),
  date: z.string().min(1, "تاریخ را انتخاب کن."),
  description: z.string().trim().optional(),
  participantIds: z.array(z.string()).min(1, "حداقل یک نفر را انتخاب کن."),
});
