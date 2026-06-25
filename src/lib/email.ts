import nodemailer from "nodemailer";
import type { EmailVerificationPurpose } from "@prisma/client";

type VerificationEmailInput = {
  email: string;
  code: string;
  purpose: EmailVerificationPurpose;
};

const purposeLabels: Record<EmailVerificationPurpose, string> = {
  USER_SIGNUP: "ثبت‌نام کاربر",
  GROUP_SIGNUP: "ساخت گروه",
  PASSWORD_RESET: "بازیابی رمز عبور",
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return { host, port, user, pass, from, secure };
}

export async function sendVerificationEmail({ email, code, purpose }: VerificationEmailInput) {
  const smtp = getSmtpConfig();
  const label = purposeLabels[purpose];
  const subject = `کد تایید دنگ یار برای ${label}`;
  const text = `کد تایید شما: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`;

  if (!smtp) {
    const devMessage = `کد تایید توسعه برای ${email}: ${code}`;
    if (process.env.NODE_ENV !== "production") console.info(devMessage);
    return { delivered: false, devMessage };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: email,
    subject,
    text,
  });

  return { delivered: true, devMessage: null };
}
