require("dotenv").config();

const express = require("express");
const twilio = require("twilio");
const path = require("path");
const nodemailer = require("nodemailer");

const { MemoryDB } = require("./src/db");
const { AnnBot } = require("./src/bot");

const app = express();

const port = process.env.PORT || 3000;

const db = new MemoryDB();

const bot = new AnnBot({
  db
});


/* =========================================
   CORS
========================================= */

app.use((req, res, next) => {

  const allowedOrigin =
    process.env.FRONTEND_URL || "*";

  res.header(
    "Access-Control-Allow-Origin",
    allowedOrigin
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});


/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  express.urlencoded({
    extended: false
  })
);

app.use(
  express.json()
);


/* =========================================
   PASSWORD HELPERS
========================================= */

function normalizePassword(value) {

  return String(
    value || ""
  ).trim();
}


async function getStoredPassword() {

  const stored =
    await db.getMemory(
      "bot_password"
    );

  return normalizePassword(
    stored
  );
}


async function setStoredPassword(
  value
) {

  const password =
    normalizePassword(value);

  if (!password) {
    throw new Error(
      "Password cannot be empty"
    );
  }

  await db.setMemory(
    "bot_password",
    password
  );
}


function getBasicAuthPassword(req) {

  const authHeader =
    req.headers.authorization || "";

  if (
    !authHeader.startsWith("Basic ")
  ) {
    return "";
  }

  const encoded =
    authHeader.slice(6);

  let decoded = "";

  try {

    decoded =
      Buffer
        .from(
          encoded,
          "base64"
        )
        .toString("utf8");

  } catch {

    return "";
  }


  if (!decoded.includes(":")) {
    return decoded;
  }

  return decoded
    .split(":")
    .slice(1)
    .join(":");
}


function isValidPassword(
  password,
  expected
) {

  return (
    normalizePassword(password) ===
    normalizePassword(expected)
  );
}


async function requirePassword(
  req,
  res,
  next
) {

  try {

    const configuredPassword =
      await getStoredPassword();


    if (!configuredPassword) {

      return res.status(403).json({
        error:
          "Password has not been configured."
      });
    }


    const providedPassword =
      getBasicAuthPassword(req);


    if (
      !isValidPassword(
        providedPassword,
        configuredPassword
      )
    ) {

      return res.status(401).json({
        error:
          "Unauthorized"
      });
    }


    next();

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    res.status(500).json({
      error:
        "Authentication failed."
    });
  }
}


/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      status: "ok",
      service: "ANN backend"
    });
  }
);


/* =========================================
   AUTH STATUS
========================================= */

app.get(
  "/api/auth-status",
  async (req, res) => {

    try {

      const password =
        await getStoredPassword();

      res.json({
        configured:
          Boolean(password),

        needsSetup:
          !password
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not check authentication status."
      });
    }
  }
);


/* =========================================
   FIRST-TIME PASSWORD SETUP
========================================= */

app.post(
  "/api/setup-password",
  async (req, res) => {

    try {

      const password =
        normalizePassword(
          req.body?.password
        );


      if (!password) {

        return res.status(400).json({
          error:
            "Password is required."
        });
      }


      const existing =
        await getStoredPassword();


      if (existing) {

        return res.status(400).json({
          error:
            "Password is already configured."
        });
      }


      await setStoredPassword(
        password
      );


      res.json({
        success: true,
        message:
          "Password created successfully."
      });

    } catch (error) {

      console.error(
        "Setup error:",
        error
      );

      res.status(500).json({
        error:
          "Could not create password."
      });
    }
  }
);


/* =========================================
   LOGIN / DASHBOARD CHECK
========================================= */

app.get(
  "/api/dashboard",
  requirePassword,
  async (req, res) => {

    try {

      const summary =
        await db.getDashboardSummary();

      res.json({
        success: true,
        ...summary
      });

    } catch (error) {

      console.error(
        "Dashboard error:",
        error
      );

      res.json({
        success: true
      });
    }
  }
);


/* =========================================
   CHAT
========================================= */

app.post(
  "/api/chat",
  requirePassword,
  async (req, res) => {

    try {

      const message =
        String(
          req.body?.message || ""
        ).trim();


      if (!message) {

        return res.status(400).json({
          error:
            "Message is required."
        });
      }


      const userId =
        String(
          req.body?.userId ||
          "web-user"
        );


      const reply =
        await bot.handleIncomingMessage(
          userId,
          message
        );


      res.json({
        success: true,
        reply:
          reply ||
          "ANN is ready."
      });

    } catch (error) {

      console.error(
        "Chat error:",
        error
      );

      res.status(500).json({
        error:
          "ANN could not process the message."
      });
    }
  }
);


/* =========================================
   CHANGE PASSWORD
========================================= */

app.post(
  "/api/change-password",
  requirePassword,
  async (req, res) => {

    try {

      const currentPassword =
        normalizePassword(
          req.body?.currentPassword
        );

      const newPassword =
        normalizePassword(
          req.body?.newPassword
        );


      const configuredPassword =
        await getStoredPassword();


      if (
        !isValidPassword(
          currentPassword,
          configuredPassword
        )
      ) {

        return res.status(401).json({
          error:
            "Current password is incorrect."
        });
      }


      if (!newPassword) {

        return res.status(400).json({
          error:
            "New password cannot be empty."
        });
      }


      await setStoredPassword(
        newPassword
      );


      res.json({
        success: true,
        message:
          "Password changed successfully."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not change password."
      });
    }
  }
);


/* =========================================
   WHATSAPP WEBHOOK
========================================= */

async function sendWhatsAppMessage(
  to,
  body
) {

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;

  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  const fromNumber =
    process.env.TWILIO_WHATSAPP_NUMBER;


  if (
    !accountSid ||
    !authToken ||
    !fromNumber
  ) {

    console.log(
      `Demo mode: would send to ${to}: ${body}`
    );

    return;
  }


  const client =
    twilio(
      accountSid,
      authToken
    );


  await client.messages.create({
    from:
      `whatsapp:${fromNumber}`,

    to:
      `whatsapp:${to}`,

    body
  });
}


app.post(
  "/webhook",
  async (req, res) => {

    try {

      const message =
        req.body.Body || "";

      const sender =
        req.body.From || "";


      if (!message) {

        return res
          .status(200)
          .send("OK");
      }


      const reply =
        await bot.handleIncomingMessage(
          sender,
          message
        );


      if (sender) {

        await sendWhatsAppMessage(
          sender.replace(
            "whatsapp:",
            ""
          ),
          reply
        );
      }


      res
        .status(200)
        .send("OK");

    } catch (error) {

      console.error(
        "Webhook error:",
        error
      );

      res
        .status(500)
        .send(
          "Webhook error"
        );
    }
  }
);


/* =========================================
   START SERVER
========================================= */

if (
  require.main === module
) {

  app.listen(
    port,
    () => {

      console.log(
        `ANN backend running on port ${port}`
      );

    }
  );
}


module.exports = app;
