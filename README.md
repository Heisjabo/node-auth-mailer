# node-auth-mailer

Minimal Express + TypeScript + MongoDB API: basic auth, password reset by email (Mailtrap), admin role protection, and a small shop (products, cart, orders) paid with the Flutterwave sandbox by card or mobile money.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm run seed           # loads the products from src/data/products.ts (replaces existing ones)
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

## Payments (Flutterwave sandbox)

The shop uses Flutterwave **Inline** checkout: the payment popup opens on top of our checkout page. The whole flow is 3 steps. The code is in `src/controllers/order.controller.ts` (step 1), the React `Checkout.jsx` page (step 2), and `src/controllers/payment.controller.ts` with `src/services/flutterwave.service.ts` (step 3).

1. **Prepare the payment.** The frontend calls `POST /api/orders/checkout` with `paymentMethod` set to `card` or `mobilemoney`. The backend turns the cart into a `pending` order, using prices from the database (never from the request), and answers with the popup settings: `tx_ref`, `amount`, `currency` (`RWF`), `payment_options` and `customer`. `payment_options` is `"card"` for card and `"mobilemoneyrwanda"` for mobile money, so the popup shows **only** that method. Flutterwave refuses a single RWF charge above RWF 200,000, so checkout rejects bigger orders (`MAX_CHARGE`).
2. **The customer pays in the popup.** The frontend calls `FlutterwaveCheckout(...)` from Flutterwave's `v3.js` script with the **public** key. Card numbers, PINs and phone numbers are typed in the popup, never on our site. When it finishes, the popup returns a `transaction_id`.
3. **Verify.** The frontend sends `tx_ref` and `transaction_id` to `GET /api/payments/verify`. The browser can be tampered with, so the backend asks Flutterwave for the transaction with the **secret** key and checks 4 things: status is `successful`, `tx_ref` matches the order, the amount covers the total, and the currency is `RWF`. Only then is the order marked `paid`, stock is reduced and the cart is emptied. Closing the popup without paying marks the order `cancelled`.

Setup:

1. Create a free account at https://app.flutterwave.com and switch to **Test mode**.
2. Settings > API Keys:
   - Copy the test **secret** key (`FLWSECK_TEST-...`) into this backend's `.env` as `FLW_SECRET_KEY`. Keep it on the backend only.
   - Copy the test **public** key (`FLWPUBK_TEST-...`) into the React app's `.env` as `VITE_FLW_PUBLIC_KEY`. It is safe in the browser: it can only open the popup.
3. Everything is in Rwandan francs: product prices are stored in RWF and every payment is charged in RWF.

Test details for the sandbox page (from Flutterwave's testing docs):

- Card: `5531 8866 5214 2950`, CVV `564`, expiry `09/32`, PIN `3310`, OTP `12345`.
- Mobile money: enter a phone number in the popup and follow its test-mode instructions. Check Flutterwave's docs (Testing helpers) if their test values change.

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
| GET    | /api/products               | Public |                                   |
| GET    | /api/products/:id           | Public |                                   |
| GET    | /api/cart                   | Logged in | returns { cart: { items, total } } |
| POST   | /api/cart/items             | Logged in | productId, quantity (default 1), adds to the cart |
| PATCH  | /api/cart/items/:productId  | Logged in | quantity (0 removes the item)   |
| DELETE | /api/cart/items/:productId  | Logged in |                                 |
| DELETE | /api/cart                   | Logged in | empties the cart                |
| POST   | /api/orders/checkout        | Logged in | paymentMethod (card or mobilemoney); returns { order, payment } (settings for the Flutterwave popup) |
| GET    | /api/orders                 | Logged in | your orders, newest first       |
| GET    | /api/orders/:id             | Logged in | one of your orders              |
| GET    | /api/payments/verify        | Logged in | tx_ref, transaction_id, status (query, from the Flutterwave popup result) |

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
  models/product.model.ts   product schema (price in RWF, stock)
  models/cart.model.ts      one cart per user: product + quantity
  models/order.model.ts     order snapshot, payment method, status, tx_ref
  data/products.ts          starting products, loaded by npm run seed
  scripts/seedProducts.ts   the seed script
  utils/jwt.ts              sign / verify tokens
  middlewares/authenticate.ts   checks the token, sets req.user
  middlewares/authorize.ts      checks req.user.role
  services/emailService.ts      sendEmail (Mailtrap API call), welcome email, reset code email
  services/flutterwave.service.ts  payment options, RWF limit, verify a transaction
  templates/welcome.template.ts  HTML for the welcome email
  controllers/              request handlers
  routes/                   route definitions
  types/express.d.ts        adds req.user to Express types
```
