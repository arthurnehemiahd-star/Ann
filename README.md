# ANN WhatsApp Bot

ANN is an AI-powered WhatsApp assistant with a lightweight game loop, SQLite memory, and a dashboard view for recent messages and saved state.

## Features

- WhatsApp webhook support
- OpenAI-powered AI replies
- SQLite storage for messages, memory, and sessions
- Simple game flow for users to play by typing numbers
- Local dashboard at the app root

## Architecture

- WhatsApp input arrives through the webhook route in [server.js](server.js)
- The ANN bot logic lives in [src/bot.js](src/bot.js)
- AI responses are generated through [src/ai.js](src/ai.js)
- Database logic is in [src/db.js](src/db.js)
- The game loop is in [src/game.js](src/game.js)
- The dashboard is in [public/dashboard.html](public/dashboard.html)

## Setup

1. Install Node.js on your machine.
2. In this project folder, run:

```bash
npm install
```

3. Create a `.env` file using the sample in [.env.example](.env.example).

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number
```

4. Start the app:

```bash
npm start
```

5. Open the dashboard:

```text
http://localhost:3000
```

## Twilio WhatsApp setup

- Create a Twilio account
- Enable WhatsApp sandbox or a real WhatsApp number
- Set the webhook URL to your public endpoint, such as:

```text
https://your-domain.ngrok.app/webhook
```

- Use the Twilio webhook signature checks included in the app

## Example messages

- hi
- what time is it?
- remember I like chess
- memory
- play
- 5

## Notes

This version is designed as a practical starter app. It works in demo mode without API keys, and it upgrades to real AI and Twilio behavior when keys are added.

> Verified environment note: this development environment does not currently have Node.js/npm installed, so the app cannot be started here until Node is installed on the machine.
