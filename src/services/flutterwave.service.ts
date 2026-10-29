// Flutterwave "Standard" checkout, explained in 3 steps:
//
//   1. CREATE A PAYMENT LINK (backend -> Flutterwave)
//      We tell Flutterwave: "charge this customer X RWF, by card (or mobile money),
//      and send them back to this URL when done". Flutterwave answers with a link.
//
//   2. THE CUSTOMER PAYS (browser -> Flutterwave)
//      The frontend sends the customer to that link. They type their card or phone
//      number on Flutterwave's own page, so card details never touch our server.
//      Afterwards Flutterwave redirects them to our redirect_url with
//      ?status=...&tx_ref=...&transaction_id=... in the address bar.
//
//   3. VERIFY THE PAYMENT (backend -> Flutterwave)
//      Anyone can type "?status=successful" in a URL, so we never trust it.
//      We ask Flutterwave directly: "is transaction 123 really paid, and for how much?"
//      Only then do we mark the order as paid.
//
// Sandbox: with a TEST secret key (FLWSECK_TEST-...) no real money moves.
// Get it at https://app.flutterwave.com > Settings > API Keys (with test mode on).

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// Our two payment methods, mapped to the names Flutterwave uses.
// Sending only ONE option makes the Flutterwave page show only that method.
// For other countries swap "mobilemoneyrwanda" (e.g. "mobilemoneyuganda" with UGX).
export const PAYMENT_OPTIONS = {
  card: "card",
  mobilemoney: "mobilemoneyrwanda",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_OPTIONS;

// Every request needs the secret key in the Authorization header.
// It must stay on the backend: anyone holding it can act as your business.
const flutterwaveRequest = async (path: string, options: RequestInit = {}) => {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY must be set");
  }

  const response = await fetch(`${FLW_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  // Flutterwave answers { status: "success" | "error", message, data }
  if (!response.ok || data.status !== "success") {
    throw new Error(data.message || "Flutterwave request failed");
  }

  return data.data;
};

interface CreatePaymentLinkInput {
  txRef: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  customer: { email: string; name: string; phoneNumber?: string };
}

// Step 1: returns the URL of Flutterwave's payment page
export const createPaymentLink = async (input: CreatePaymentLinkInput): Promise<string> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const data = await flutterwaveRequest("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      payment_options: PAYMENT_OPTIONS[input.paymentMethod],
      redirect_url: `${frontendUrl}/payment/callback`,
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phonenumber: input.customer.phoneNumber,
      },
      customizations: {
        title: "ShopEase",
        description: `Payment for order ${input.txRef}`,
      },
    }),
  });

  return data.link;
};

// Step 3: asks Flutterwave for the real state of a payment.
// Returns status ("successful", "failed", ...), amount, currency and tx_ref.
export const verifyTransaction = async (transactionId: string) => {
  return flutterwaveRequest(`/transactions/${encodeURIComponent(transactionId)}/verify`);
};
