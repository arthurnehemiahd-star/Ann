# ANN WhatsApp Bot - Deployment Guide

## Current Status
✅ App is host-ready on Netlify with serverless functions  
✅ Admin email configured: `arthurnehemiahd@gmail.com`  
✅ Default dashboard password: `1`  
✅ All features enabled: AI, memory, games, password reset via Gmail  

---

## Step 1: Add Real Secrets to `.env`

Before deploying, fill in your actual API keys in the `.env` file:

```env
PORT=3000
BOT_PASSWORD=1
ADMIN_EMAIL=arthurnehemiahd@gmail.com
GMAIL_USER=arthurnehemiahd@gmail.com
GMAIL_APP_PASSWORD=<your-gmail-app-password>
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### Getting Each Secret

**Gmail App Password:**
- Go to https://myaccount.google.com/apppasswords
- Select "Mail" and "Windows Computer" (or your OS)
- Copy the 16-character password

**OpenAI API Key:**
- Go to https://platform.openai.com/api/keys
- Create a new API key and copy it

**Twilio Credentials:**
- Go to https://console.twilio.com
- Copy Account SID and Auth Token from Dashboard
- Get your WhatsApp Sandbox number or a real WhatsApp-enabled number

---

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Initial ANN WhatsApp bot deployment"
git push origin main
```

Make sure to create a GitHub repo first at https://github.com/new

---

## Step 3: Deploy to Netlify

### Option A: Use Netlify UI (Recommended)

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub account
4. Select your ANN bot repository
5. Use these build settings:
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `.`
   - **Functions directory:** `functions`
6. Click **"Deploy site"**

### Option B: Deploy with Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
# Follow prompts and select your Git repository
```

---

## Step 4: Configure Environment Variables on Netlify

After deployment starts, Netlify will show your site domain (e.g., `your-site-name.netlify.app`).

1. Go to your Netlify site dashboard
2. Click **Site settings** → **Build & deploy** → **Environment**
3. Click **Edit variables**
4. Add all the secrets from your `.env` file:
   - `BOT_PASSWORD`
   - `ADMIN_EMAIL`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `OPENAI_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`

**Do NOT commit `.env` to GitHub** — use only Netlify's environment variables for production.

---

## Step 5: Set Twilio Webhook

Once your Netlify site is live and environment variables are set:

1. Go to https://console.twilio.com
2. Navigate to **Messaging** → **Services** (or **Sandbox** if using sandbox)
3. Find your WhatsApp service
4. Under **Integrations**, set the **Webhook URL** to:

```
https://your-site-name.netlify.app/.netlify/functions/server/webhook
```

Replace `your-site-name` with your actual Netlify domain.

5. Set the HTTP method to **POST**
6. Save

---

## Step 6: Verify Dashboard Access

1. Open: `https://your-site-name.netlify.app`
2. You should see the ANN bot dashboard
3. Click **"First Time Setup"** and set your password (or use the default `1`)
4. Log in with basic auth (username: anything, password: `1`)
5. View the dashboard with recent messages and bot memory

---

## Step 7: Test the Bot

Send a WhatsApp message to your Twilio WhatsApp number with:

- `hi` - Get a greeting
- `what time is it?` - Bot tells current time
- `remember I like chess` - Bot stores in memory
- `memory` - Bot lists saved facts
- `play` - Start the number guessing game
- `5` - Guess a number (during game)

---

## Troubleshooting

### Dashboard not loading
- Check that Netlify environment variables are set
- Verify BOT_PASSWORD is correct (default is `1`)
- Check browser console for errors (F12)

### WhatsApp messages not arriving
- Verify Twilio webhook URL is set correctly
- Check Netlify function logs: **Monitoring** → **Functions**
- Ensure TWILIO credentials are in Netlify environment variables

### Gmail reset not working
- Verify GMAIL_APP_PASSWORD (not your regular password)
- Check that ADMIN_EMAIL matches the recovery email
- Allow "Less secure apps" access if using gmail.com (may be required)

### OpenAI responses not working
- Verify OPENAI_API_KEY is valid and has credits
- Check Netlify function logs for API errors

---

## Optional: Use PostgreSQL for Persistence

For a production database that persists data across deployments:

1. Set up a free PostgreSQL database (e.g., https://neon.tech or https://supabase.com)
2. Get your `DATABASE_URL` connection string
3. Add `DATABASE_URL` to Netlify environment variables
4. The app will automatically use PostgreSQL instead of SQLite

---

## Production Checklist

- [ ] Real secrets in Netlify environment variables
- [ ] GitHub repo pushed with `.env` in `.gitignore`
- [ ] Netlify deployment successful
- [ ] Dashboard loads and authenticates
- [ ] Twilio webhook configured and verified
- [ ] WhatsApp messages trigger bot responses
- [ ] Gmail password reset emails work
- [ ] OpenAI responses appear in conversations

---

## Your Deployment URLs (once live)

- **Dashboard:** `https://your-site-name.netlify.app`
- **Webhook:** `https://your-site-name.netlify.app/.netlify/functions/server/webhook`
- **API Base:** `https://your-site-name.netlify.app/api`

---

**Questions?** Check the main [README.md](README.md) for bot features and local development.
