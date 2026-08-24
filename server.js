/**
 * server-example.js
 * ------------------------------------------------------------------
 * Reference back-end for the "Buy Now" button on index.html.
 *
 * WHY THIS FILE EXISTS
 * HelcimPay.js needs a "checkoutToken" before it can show the payment
 * pop-up. That token can only be created by calling Helcim's API with
 * your secret api-token — and that call MUST happen on a server, never
 * in browser JavaScript, because anyone could read your secret key by
 * viewing the page source.
 *
 * So the flow is:
 *   1. Person clicks "Buy Now" on your website (front-end, index.html)
 *   2. Your website calls THIS server (POST /api/create-helcim-checkout)
 *   3. This server calls Helcim's API using your secret api-token
 *   4. Helcim returns a checkoutToken
 *   5. This server sends that checkoutToken back to the browser
 *   6. The browser opens the Helcim payment pop-up using that token
 *
 * ------------------------------------------------------------------
 * SETUP STEPS
 * 1. npm init -y && npm install express cors node-fetch dotenv
 * 2. Create a ".env" file next to this one with:
 *        HELCIM_API_TOKEN=your-real-api-token-from-helcim
 * 3. In your Helcim account -> Integrations -> API Access Configuration:
 *      - Generate an API token
 *      - Check the box "This token will be used for a HelcimPay.js checkout"
 *      - Add your live domain (and http://localhost:PORT while testing)
 *        to the whitelisted checkout URLs, or Helcim will refuse to
 *        render the payment modal on your site.
 * 4. Run this server:  node server-example.js
 * 5. In index.html, HELCIM_CONFIG.initializeEndpoint should point at
 *    wherever this server is hosted, e.g. "https://yourdomain.com/api/create-helcim-checkout"
 * ------------------------------------------------------------------
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // put index.html in a /public folder if you use this

const HELCIM_API_TOKEN = process.env.HELCIM_API_TOKEN; // never hard-code this, never send it to the browser

app.post("/api/create-helcim-checkout", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const response = await fetch("https://api.helcim.com/v2/helcim-pay/initialize", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-token": HELCIM_API_TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        paymentType: "purchase",
        amount: amount || 17.95,
        currency: currency || "USD",
        // Optional but recommended for a digital product:
        // invoiceNumber: "INV-" + Date.now(),
        // paymentMethod: "cc",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.checkoutToken) {
      console.error("Helcim initialize failed:", data);
      return res.status(500).json({ error: "Could not create checkout session" });
    }

    // Only ever send the checkoutToken to the browser.
    // Keep data.secretToken on the server if you plan to validate
    // the transaction response later (see Helcim's "Validate a
    // HelcimPay.js Payment" docs) — never expose it to the client.
    return res.json({ checkoutToken: data.checkoutToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error creating checkout session" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Helcim checkout server running on port ${PORT}`));
