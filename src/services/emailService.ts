import { mailConfig } from "../config/mail";
import { welcomeEmailTemplate } from "../templates/welcome.template";

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!mailConfig.apiKey || !mailConfig.fromEmail) {
        console.error('Error sending email: BREVO_API_KEY or EMAIL_FROM is not set');
        return;
    }

    try {
        const response = await fetch(mailConfig.apiUrl, {
            method: "POST",
            headers: {
                "api-key": mailConfig.apiKey as string,
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({
                sender: { name: mailConfig.fromName, email: mailConfig.fromEmail },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            }),
        })

        // fetch does not throw on 4xx/5xx, so check the status ourselves
        if (!response.ok) {
            console.error('Error sending email: \n', response.status, await response.text());
        }
    } catch (error){
        console.error('Error sending email: \n', error);
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
