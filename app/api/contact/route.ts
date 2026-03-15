/**
 * POST /api/contact
 *
 * Sends a contact/bug-report form submission to contact@tackroomshop.com.au via Resend.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";

export async function POST(req: Request) {
  const { name, email, subject, message, type } = await req.json() as {
    name: string;
    email: string;
    subject: string;
    message: string;
    type?: string;
  };

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isReport = type === "report";
  const emailSubject = isReport
    ? `Bug/Issue Report: ${subject || "No subject"}`
    : `Contact Form: ${subject || "Enquiry from website"}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #2d3a2e;">${isReport ? "Bug / Issue Report" : "Contact Form Submission"}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 6px 0; color: #666; width: 100px;"><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;"><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #666;"><strong>Subject</strong></td><td>${subject || "—"}</td></tr>
      </table>
      <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
    </div>
  `;

  await sendEmail({
    to: "support@tackroomshop.com.au",
    subject: emailSubject,
    html,
  });

  return NextResponse.json({ success: true });
}
