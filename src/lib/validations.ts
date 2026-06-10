import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "نام کاربری را وارد کن."),
  password: z.string().min(1, "رمز ورود را وارد کن."),
});

export const personSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "نام کوتاه است."),
  username: z.string().trim().optional(),
  type: z.enum(["MEMBER", "GUEST"]),
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
