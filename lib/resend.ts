import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Update this once your domain is verified in Resend
export const FROM_EMAIL = "The Tack Room <hello@thetackroom.com.au>";
export const REPLY_TO = "hello@thetackroom.com.au";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
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
