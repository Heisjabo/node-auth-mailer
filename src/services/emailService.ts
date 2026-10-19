import { welcomeEmailTemplate } from "../templates/welcome.template";
import { MailtrapClient } from "mailtrap";

// Emails go to a Mailtrap Sandbox inbox: they are caught there for viewing, never delivered.
const mailtrap = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN as string,
  sandbox: true,
  testInboxId: Number(process.env.MAILTRAP_INBOX_ID),
});

const sender = {
  email: process.env.EMAIL_FROM || "no-reply@example.com",
  name: process.env.EMAIL_FROM_NAME || "Node Auth App",
};

const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        if (!process.env.MAILTRAP_API_TOKEN || !Number(process.env.MAILTRAP_INBOX_ID)) {
            throw new Error("MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID must be set");
        }
        await mailtrap.send({
            from: sender,
            to: [{ email: to }],
            subject,
            html
        })
    } catch (error: any){
        // Log only the message and API response; the full error includes the Authorization header.
        console.error("Error sending email:", error?.message, error?.cause?.response?.data ?? "");
        throw error;
    }
}

export const sendResetCodeEmail = async (to: string, code: string) => {
    const subject = "Password Reset Code";
    const html = `
    <p>Hello,</p>
    <p>Here is your password reset OTP: ${code}</p>
    <P>This code will expire in 10 minutes</P>
    `
    await sendEmail(to, subject, html);
}

export const sendWelcomeEmail = async (to: string, name: string) => {
    const subject = "Welcome to Node Auth App";
    const html = welcomeEmailTemplate(name);
    await sendEmail(to, subject, html);
}
