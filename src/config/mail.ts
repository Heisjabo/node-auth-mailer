// Brevo sends email over a plain HTTPS request (port 443) instead of SMTP.
// Render blocks outbound SMTP ports, which is why Gmail SMTP failed in production.
export const mailConfig = {
    apiUrl: "https://api.brevo.com/v3/smtp/email",
    apiKey: process.env.BREVO_API_KEY,
    // must be a sender you verified in Brevo (Senders, Domains & Dedicated IPs)
    fromEmail: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME || "Node Auth App",
}
