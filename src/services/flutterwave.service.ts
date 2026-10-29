// Flutterwave "Inline" checkout, explained in 3 steps:
//
//   1. PREPARE THE PAYMENT (frontend -> our backend)
//      The backend creates a pending order and decides the amount, currency and
//      payment method, then sends them back to the frontend (see order.controller.ts).
//
//   2. THE CUSTOMER PAYS (browser -> Flutterwave)
//      The frontend opens Flutterwave's payment popup with the PUBLIC key.
//      payment_options "card" shows only the card form, "mobilemoneyrwanda" shows
//      only mobile money. Card numbers and phone numbers are typed inside the popup,
//      so they never touch our server. When done, the popup gives the frontend a
//      transaction_id.
//
//   3. VERIFY THE PAYMENT (backend -> Flutterwave)
//      The frontend could lie ("it was paid!"), so we never trust it.
//      We ask Flutterwave directly with the SECRET key: "is transaction 123 really
//      paid, and for how much?" Only then do we mark the order as paid.
//
// Sandbox: with TEST keys (FLWPUBK_TEST-... and FLWSECK_TEST-...) no real money moves.
// Get them at https://app.flutterwave.com > Settings > API Keys (with test mode on).

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// The shop only sells in Rwandan francs, so every payment is in RWF
export const CURRENCY = "RWF";

// Flutterwave refuses a single RWF charge above this amount
export const MAX_CHARGE = 200000;

// Our two payment methods, mapped to the names Flutterwave uses.
// Sending only ONE option makes the popup show only that method.
export const PAYMENT_OPTIONS = {
  card: "card",
  mobilemoney: "mobilemoneyrwanda",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_OPTIONS;

// Step 3: asks Flutterwave for the real state of a payment.
// Returns status ("successful", "failed", ...), amount, currency and tx_ref.
// The secret key must stay on the backend: anyone holding it can act as your business.
export const verifyTransaction = async (transactionId: string) => {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY must be set");
  }

  const response = await fetch(`${FLW_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const data = await response.json();

  // Flutterwave answers { status: "success" | "error", message, data }
  if (!response.ok || data.status !== "success") {
    throw new Error(data.message || "Flutterwave request failed");
  }

  return data.data;
};
