import { Resend } from "resend";

export const FROM_EMAIL = "The Tack Room <hello@tackroomshop.com.au>";
export const REPLY_TO = "hello@tackroomshop.com.au";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Resend] RESEND_API_KEY not set — skipping email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Resend] Failed to send email:", error);
    throw new Error(error.message);
  }

  return data;
}
