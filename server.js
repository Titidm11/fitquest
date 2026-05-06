const express = require("express");
const path = require("path");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERREUR: STRIPE_SECRET_KEY manquant");
}

if (!process.env.DOMAIN) {
  console.error("ERREUR: DOMAIN manquant");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "FitQuest Premium",
            },
            unit_amount: 799,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success`,
      cancel_url: `${process.env.DOMAIN}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Paiement réussi</title>
    </head>
    <body style="font-family: Arial; text-align: center; padding: 40px;">
      <h1>Paiement réussi ✅</h1>
      <p>Premium est maintenant activé sur ton compte FitQuest.</p>
      <a href="/">Retour à FitQuest</a>

      <script>
        const user = JSON.parse(localStorage.getItem("fitquestUser"));

        if (user) {
          user.premium = true;
          localStorage.setItem("fitquestUser", JSON.stringify(user));
        }

        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

app.get("/cancel", (req, res) => {
  res.send(`
    <h1>Paiement annulé ❌</h1>
    <a href="/">Retour à FitQuest</a>
  `);
});

app.get("/health", (req, res) => {
  res.send("FitQuest serveur OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur le port " + PORT);
});
