require('dotenv').config();

const express = require('express');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const { MemoryDB } = require('./src/db');
const { MiahBot } = require('./src/bot');

const app = express();
const port = Number(process.env.PORT) || 3000;

const db = new MemoryDB();
const bot = new MiahBot({ db });

const RECOVERY_CODE_TTL_MS = 10 * 60 * 1000;

// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

if (process.env.VERCEL_FRONTEND_URL) {
  allowedOrigins.push(
    process.env.VERCEL_FRONTEND_URL.replace(/\/$/, '')
  );
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS'
  );

  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-User-Id'
  );

  res.header(
    'Access-Control-Allow-Credentials',
    'true'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function normalizePassword(value) {
  return String(value || '').trim();
}

function generateRecoveryCode() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

async function getStoredPassword() {
  const stored = await db.getMemory('bot_password');
  return normalizePassword(stored);
}

async function setStoredPassword(value) {
  const password = normalizePassword(value);

  if (!password) {
    throw new Error('Password cannot be empty');
  }

  await db.setMemory('bot_password', password);
}

async function setRecoveryCode(email, code) {
  const payload = {
    code,
    expiresAt: Date.now() + RECOVERY_CODE_TTL_MS,
  };

  await db.setMemory(
    `recovery:${String(email || '').trim().toLowerCase()}`,
    JSON.stringify(payload)
  );
}

async function getRecoveryCode(email) {
  const stored = await db.getMemory(
    `recovery:${String(email || '').trim().toLowerCase()}`
  );

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function isValidPassword(password, expectedPassword) {
  return (
    normalizePassword(password) ===
    normalizePassword(expectedPassword)
  );
}

function getBasicAuthPassword(req) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Basic ')) {
    return '';
  }

  const token = authHeader.slice(6);

  let decoded = '';

  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return '';
  }

  if (!decoded.includes(':')) {
    return decoded;
  }

  return decoded.split(':').slice(1).join(':');
}

async function requirePassword(req, res, next) {
  try {
    const configuredPassword = await getStoredPassword();

    if (!configuredPassword) {
      return res.status(403).json({
        error:
          'Password not set yet. Set it from the dashboard first.',
      });
    }

    const providedPassword = getBasicAuthPassword(req);

    if (!isValidPassword(providedPassword, configuredPassword)) {
      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Miah Secure Access"'
      );

      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    req.authenticatedPassword = providedPassword;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    res.status(500).json({
      error: 'Authentication service unavailable.',
    });
  }
}

// ------------------------------------------------------------
// Email recovery
// ------------------------------------------------------------

async function sendRecoveryEmail(email, code) {
  const gmailUser =
    process.env.GMAIL_USER ||
    process.env.ADMIN_EMAIL;

  const gmailAppPassword =
    process.env.GMAIL_APP_PASSWORD;

  const targetEmail = String(email || '').trim();

  if (!gmailUser || !gmailAppPassword || !targetEmail) {
    throw new Error(
      'Gmail credentials are not configured.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: gmailUser,
    to: targetEmail,
    subject: 'Miah password reset code',
    text:
      `Your Miah password reset code is: ${code}. ` +
      `It expires in 10 minutes.`,
  });
}

// ------------------------------------------------------------
// WhatsApp
// ------------------------------------------------------------

async function sendWhatsAppMessage(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(
      `Demo mode: would send to ${to}: ${body}`
    );

    return;
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    from: `whatsapp:${fromNumber}`,
    to: `whatsapp:${to}`,
    body,
  });
}

// ------------------------------------------------------------
// Health / API
// ------------------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    service: 'Miah AI Backend',
    status: 'ok',
  });
});

app.get('/api/auth-status', async (req, res) => {
  try {
    const configuredPassword =
      await getStoredPassword();

    res.json({
      configured: Boolean(configuredPassword),
      needsSetup: !configuredPassword,
    });
  } catch (error) {
    console.error('Auth status error:', error);

    res.status(500).json({
      error: 'Could not check authentication status.',
    });
  }
});

// ------------------------------------------------------------
// Password setup
// ------------------------------------------------------------

app.post('/api/setup-password', async (req, res) => {
  try {
    const newPassword = normalizePassword(
      req.body?.password ||
      req.body?.newPassword
    );

    if (!newPassword) {
      return res.status(400).json({
        error: 'Password is required.',
      });
    }

    const currentPassword =
      await getStoredPassword();

    if (currentPassword) {
      return res.status(400).json({
        error: 'Password is already configured.',
      });
    }

    await setStoredPassword(newPassword);

    res.json({
      success: true,
      message: 'Password set successfully.',
    });
  } catch (error) {
    console.error(
      'Setup password error:',
      error
    );

    res.status(500).json({
      error: 'Could not save password.',
    });
  }
});

// ------------------------------------------------------------
// Change password
// ------------------------------------------------------------

app.post(
  '/api/change-password',
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
          error: 'Current password is incorrect.',
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          error: 'New password cannot be empty.',
        });
      }

      await setStoredPassword(newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      console.error(
        'Change password error:',
        error
      );

      res.status(500).json({
        error: 'Could not update the password.',
      });
    }
  }
);

// ------------------------------------------------------------
// Request password reset
// ------------------------------------------------------------

app.post('/api/request-reset', async (req, res) => {
  try {
    const email = String(
      req.body?.email || ''
    )
      .trim()
      .toLowerCase();

    const adminEmail = String(
      process.env.ADMIN_EMAIL ||
      process.env.GMAIL_USER ||
      ''
    )
      .trim()
      .toLowerCase();

    if (
      !email ||
      !adminEmail ||
      email !== adminEmail
    ) {
      return res.status(400).json({
        error:
          'Only the admin Gmail address can reset the password.',
      });
    }

    const code = generateRecoveryCode();

    await setRecoveryCode(email, code);
    await sendRecoveryEmail(email, code);

    res.json({
      success: true,
      message:
        'A verification code was sent to your Gmail.',
    });
  } catch (error) {
    console.error(
      'Password reset request error:',
      error
    );

    res.status(500).json({
      error:
        'Could not send the recovery email. Check the Gmail settings.',
    });
  }
});

// ------------------------------------------------------------
// Reset password
// ------------------------------------------------------------

app.post('/api/reset-password', async (req, res) => {
  try {
    const email = String(
      req.body?.email || ''
    )
      .trim()
      .toLowerCase();

    const code = String(
      req.body?.code || ''
    ).trim();

    const newPassword =
      normalizePassword(
        req.body?.newPassword
      );

    const adminEmail = String(
      process.env.ADMIN_EMAIL ||
      process.env.GMAIL_USER ||
      ''
    )
      .trim()
      .toLowerCase();

    if (
      !email ||
      !adminEmail ||
      email !== adminEmail
    ) {
      return res.status(400).json({
        error: 'Invalid email address.',
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        error: 'New password cannot be empty.',
      });
    }

    const stored =
      await getRecoveryCode(email);

    if (
      !stored ||
      !stored.code ||
      Date.now() > stored.expiresAt ||
      String(stored.code) !== String(code)
    ) {
      return res.status(401).json({
        error:
          'Invalid or expired verification code.',
      });
    }

    await setStoredPassword(newPassword);

    await db.setMemory(
      `recovery:${email}`,
      JSON.stringify({
        code: '',
        expiresAt: 0,
      })
    );

    res.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error(
      'Reset password error:',
      error
    );

    res.status(500).json({
      error: 'Could not reset the password.',
    });
  }
});

// ------------------------------------------------------------
// REAL MIAH CHAT
// ------------------------------------------------------------

app.post(
  '/api/chat',
  requirePassword,
  async (req, res) => {
    try {
      const message = String(
        req.body?.message || ''
      ).trim();

      if (!message) {
        return res.status(400).json({
          error: 'Message is required.',
        });
      }

      const sender =
        String(
          req.headers['x-user-id'] ||
          'web-user'
        );

      const reply =
        await bot.handleIncomingMessage(
          sender,
          message
        );

      res.json({
        success: true,
        reply,
      });
    } catch (error) {
      console.error(
        'Miah chat error:',
        error
      );

      res.status(500).json({
        error:
          'Miah could not process your message.',
      });
    }
  }
);

// ------------------------------------------------------------
// Dashboard data
// ------------------------------------------------------------

app.get(
  '/api/dashboard',
  requirePassword,
  async (req, res) => {
    try {
      const summary =
        await db.getDashboardSummary();

      res.json(summary);
    } catch (error) {
      console.error(
        'Dashboard error:',
        error
      );

      res.status(500).json({
        error: 'Dashboard unavailable.',
      });
    }
  }
);

// ------------------------------------------------------------
// WhatsApp webhook
// ------------------------------------------------------------

app.post('/webhook', async (req, res) => {
  try {
    const incomingMessage =
      req.body.Body || '';

    const sender =
      req.body.From || '';

    if (!incomingMessage) {
      return res.status(200).send('OK');
    }

    const reply =
      await bot.handleIncomingMessage(
        sender,
        incomingMessage
      );

    if (sender) {
      await sendWhatsAppMessage(
        sender.replace(
          'whatsapp:',
          ''
        ),
        reply
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error(
      'Webhook error:',
      error
    );

    res.status(500).send(
      'Webhook error'
    );
  }
});

// ------------------------------------------------------------
// Start
// ------------------------------------------------------------

if (require.main === module) {
  app.listen(port, () => {
    console.log(
      `Miah backend running on http://localhost:${port}`
    );

    console.log(
      'Miah is ready.'
    );
  });
}

module.exports = app;
