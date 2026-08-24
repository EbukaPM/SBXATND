import { Resend } from "resend";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

/** No-ops (with a console warning) when Resend isn't configured, so the rest of the
 * app never has to branch on whether email is set up — in-app notifications always work. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    console.warn(`[email] Skipped "${input.subject}" to ${input.to} — RESEND_API_KEY/RESEND_FROM_EMAIL not set.`);
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  if (error) {
    console.error(`[email] Failed to send "${input.subject}" to ${input.to}:`, error);
  }
}
