# node-auth-mailer

Minimal Express + TypeScript + MongoDB API: basic auth, password reset by email (Mailtrap), and admin role protection.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

## Email (Mailtrap)

Emails are sent with the official `mailtrap` client, which makes one HTTPS request per email (see `src/services/emailService.ts`).

Why not SMTP? Render blocks outbound SMTP ports (25, 465, 587), so Gmail SMTP worked locally but failed in production. An HTTPS request goes out on port 443, which is never blocked.

Emails go to a Mailtrap **Sandbox** inbox: they are caught there so you can view them (HTML, subject, reset code) in the Mailtrap dashboard, but they are never delivered to real inboxes. This is free and needs no domain, and any `EMAIL_FROM` works.

Setup:

1. Create a free account at https://mailtrap.io.
2. Open Sandboxes, pick your inbox, then Integration > API. Copy the API token into `MAILTRAP_API_TOKEN` and the inbox ID into `MAILTRAP_INBOX_ID`.
3. Optionally set `EMAIL_FROM` (defaults to `no-reply@example.com`).
4. Add the same variables in Render under Environment, then redeploy.

To deliver to real inboxes later, verify a domain under Sending Domains in Mailtrap and switch the client in `emailService.ts` from Sandbox to Sending.

## Endpoints

| Method | Route                       | Access | Body                              |
|--------|-----------------------------|--------|-----------------------------------|
| POST   | /api/auth/register          | Public | name, email, password (sends welcome email) |
| POST   | /api/auth/login             | Public | email, password                   |
| GET    | /api/auth/profile           | Logged in | (Bearer token)                 |
| POST   | /api/auth/forgot-password   | Public | email                             |
| POST   | /api/auth/reset-password    | Public | email, code, newPassword          |
| GET    | /api/users?page=1&limit=10  | Admin  | (Bearer token), page and limit optional |
| GET    | /api/users/:id              | Admin  | (Bearer token)                    |
| POST   | /api/users                  | Admin  | name, email, password, role (optional) |
| PATCH  | /api/users/:id              | Admin  | any of name, email, password, role |
| DELETE | /api/users/:id              | Admin  | (Bearer token), cannot delete yourself |

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
  models/user.model.ts      user schema (role, reset code fields)
  utils/jwt.ts              sign / verify tokens
  middlewares/authenticate.ts   checks the token, sets req.user
  middlewares/authorize.ts      checks req.user.role
  services/emailService.ts      sendEmail (Mailtrap API call), welcome email, reset code email
  templates/welcome.template.ts  HTML for the welcome email
  controllers/              request handlers
  routes/                   route definitions
  types/express.d.ts        adds req.user to Express types
```
