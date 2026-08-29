# ANN WhatsApp Bot - Backend Deployment (Render)

This is the **backend** service. The **frontend** is deployed separately on Netlify.

## Backend Setup on Render

### 1. Get Backend Secrets

Add these to Render environment variables:

```
BOT_PASSWORD=1
ADMIN_EMAIL=arthurnehemiahd@gmail.com
GMAIL_USER=arthurnehemiahd@gmail.com
GMAIL_APP_PASSWORD=<your-gmail-app-password>
OPENAI_API_KEY=<your-openai-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
FRONTEND_URL=https://your-frontend.netlify.app
NETLIFY_SITE_URL=https://your-frontend.netlify.app
```

### 2. Deploy to Render

1. Push this backend folder to GitHub
2. Go to https://render.com
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo
5. Use these settings:
   - **Name:** ann-bot-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)
6. Add environment variables from step 1
7. Click **"Create Web Service"**

Your backend URL will be: `https://ann-bot-backend.onrender.com`

### 3. Set Twilio Webhook

In Twilio console, set the webhook URL to:

```
https://ann-bot-backend.onrender.com/webhook
```

---

## Local Development

```bash
npm install
npm start
```

Backend will run on http://localhost:3000

---

## Environment Variables

- `FRONTEND_URL`: URL of your Netlify frontend (for CORS)
- `NETLIFY_SITE_URL`: Alternative frontend URL for Netlify auto-config
- All other vars same as before (Gmail, OpenAI, Twilio)

---

## CORS Support

The backend accepts requests from:
- `http://localhost:3000` / `http://localhost:3001` (dev)
- Your Netlify frontend URL (production)

Add your frontend URL to `FRONTEND_URL` environment variable to enable CORS.
