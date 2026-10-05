# node-auth-mailer

Minimal Express + TypeScript + MongoDB API: basic auth, password reset by email (Gmail SMTP), and admin role protection.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

Gmail needs an App Password (not your normal password): turn on 2-Step Verification, then create one at https://myaccount.google.com/apppasswords.

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
  config/mailer.ts          nodemailer SMTP transporter
  models/user.model.ts      user schema (role, reset code fields)
  utils/jwt.ts              sign / verify tokens
  middlewares/authenticate.ts   checks the token, sets req.user
  middlewares/authorize.ts      checks req.user.role
  services/email.service.ts     sendEmail, welcome email, reset code email
  templates/welcome.template.ts  HTML for the welcome email
  controllers/              request handlers
  routes/                   route definitions
  types/express.d.ts        adds req.user to Express types
```
