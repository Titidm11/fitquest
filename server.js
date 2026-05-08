const express = require("express");
const path = require("path");
const Stripe = require("stripe");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");const app = express();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERREUR: STRIPE_SECRET_KEY manquant");
}

if (!process.env.DOMAIN) {
  console.error("ERREUR: DOMAIN manquant");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);app.use(express.json());
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
});// ===============================
// API UTILISATEURS SUPABASE
// ===============================

function cleanUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function cleanPassword(password) {
  return String(password || "").trim();
}

app.post("/api/register", async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const password = cleanPassword(req.body.password);

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: "Nom d'utilisateur et mot de passe obligatoires."
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        ok: false,
        error: "Mot de passe trop court."
      });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        ok: false,
        error: existingError.message
      });
    }

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        error: "Ce nom d'utilisateur existe déjà."
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        username,
        password_hash: password,
        credits: 100,
        premium: false,
        streak: 0,
        level: 1
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      user: data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const password = cleanPassword(req.body.password);

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: "Nom d'utilisateur et mot de passe obligatoires."
      });
    }

    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .eq("password_hash", password)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Identifiants incorrects."
      });
    }

    res.json({
      ok: true,
      user
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.get("/api/me/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }app.post("/api/save-progress", async (req, res) => {
  try {
    const {
      userId,
      credits,
      streak,
      lastSportDate,
      lastChestDate,
      level
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId manquant."
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        credits: Number(credits || 0),
        streak: Number(streak || 0),
        last_sport_date: lastSportDate || null,
        last_chest_date: lastChestDate || null,
        level: Number(level || 1),
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      user: data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "Utilisateur introuvable."
      });
    }

    res.json({
      ok: true,
      user
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});app.get("/api/db-test", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("shop_items")
      .select("*")
      .limit(5);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, items: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }app.post("/api/save-route", async (req, res) => {
  try {
    const {
      userId,
      routeName,
      mode,
      km,
      reward,
      baseReward,
      streakBonus
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId manquant."
      });
    }

    const { data, error } = await supabase
      .from("routes")
      .insert({
        user_id: userId,
        route_name: routeName || "Trajet FitQuest",
        mode: mode || "course",
        km: Number(km || 0),
        reward: Number(reward || 0),
        base_reward: Number(baseReward || reward || 0),
        streak_bonus: Number(streakBonus || 0)
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      route: data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.post("/api/save-purchase", async (req, res) => {
  try {
    const {
      userId,
      name,
      type,
      amount,
      priceLabel
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId manquant."
      });
    }

    const { data, error } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        name: name || "Action FitQuest",
        type: type || "generic",
        amount: Number(amount || 0),
        price_label: priceLabel || null
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      purchase: data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});});const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur le port " + PORT);
});
