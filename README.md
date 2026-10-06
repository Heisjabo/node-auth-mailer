# node-auth-mailer

Minimal Express + TypeScript + MongoDB API: basic auth, password reset by email (Brevo), and admin role protection.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

## Email (Brevo)

Emails are sent with Brevo's HTTP API: one HTTPS `POST` to `https://api.brevo.com/v3/smtp/email` (see `src/services/emailService.ts`).

Why not SMTP? Render blocks outbound SMTP ports (25, 465, 587), so Gmail SMTP worked locally but failed in production. An HTTPS request goes out on port 443, which is never blocked.

Setup:

1. Create a free account at https://www.brevo.com.
2. Verify a sender: Senders, Domains & Dedicated IPs > Senders. Put that address in `EMAIL_FROM`.
3. Create an API key: SMTP & API > API Keys. Put it in `BREVO_API_KEY` (the key starts with `xkeysib-`, not the SMTP key `xsmtpsib-`).
4. Turn off IP blocking at https://app.brevo.com/security/authorised_ips (Render's IP can change, so Brevo would reject it with `unrecognised IP address`).
5. Add the same variables in Render under Environment, then redeploy.

## Endpoints

| Method | Route                       | Access | Body                              |
|--------|-----------------------------|--------|-----------------------------------|
| POST   | /api/auth/register          | Public | name, email, password (sends welcome email) |
| POST   | /api/auth/login             | Public | email, password                   |
| GET    | /api/auth/profile           | Logged in | (Bearer token)                 |
| POST   | /api/auth/forgot-password   | Public | email                             |
| POST   | /api/auth/reset-password    | Public | email, code, newPassword          |
| GET    | /api/users                  | Admin  | (Bearer token)                    |

## Password reset flow

1. `forgot-password` creates a 6-digit code, stores a hash of it with a 10 minute expiry, and emails the code.
2. `reset-password` checks the code and expiry, saves the new password, and clears the code so it can't be reused.

## Making an admin

Registration always creates a `user` (role is never read from the body). Promote someone in your local database:

```bash
mongosh node-auth-mailer --eval 'db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })'
```

## Structure

```
src/
  server.ts                 starts the app after connecting to MongoDB
  app.ts                    express setup, routes, error handling
  config/db.ts              mongoose connection
  config/mail.ts            Brevo API settings (key, sender)
  models/user.model.ts      user schema (role, reset code fields)
  utils/jwt.ts              sign / verify tokens
  middlewares/authenticate.ts   checks the token, sets req.user
  middlewares/authorize.ts      checks req.user.role
  services/emailService.ts      sendEmail (Brevo API call), welcome email, reset code email
  templates/welcome.template.ts  HTML for the welcome email
  controllers/              request handlers
  routes/                   route definitions
  types/express.d.ts        adds req.user to Express types
```
