# Deployment Guide

## 1. Environment Variables (Vercel)

For the app to work on Vercel, you must set the following Environment Variables in your Vercel Project Settings.

Go to: **Settings** -> **Environment Variables**

| Key | Description | Example Value |
|-----|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | `AIzaSyD...` |
| `GEMINI_API_KEY` | Google Gemini AI Key | `AIzaSyA...` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |

> [!IMPORTANT]
> Without these variables, the app will show "Database not configured" or fail to load the map/AI features.

## 2. Health Check

After creating these variables and redeploying, verify everything is working by visiting:

`https://your-app-url.vercel.app/api/health`

It should return:
```json
{
  "status": "ok",
  "checks": {
    "supabase": true,
    "gemini": true,
    "telegram": true,
    "maps": true
  }
}
```

## 3. Telegram Bot Setup (Serverless)

Since Vercel is serverless, we cannot run the `telegram_poller.js` script in the background. Instead, we use a **Webhook**.

### Step 1: Deploy the App
Make sure your app is deployed and you have the URL (e.g., `https://foodie-crm.vercel.app`).

### Step 2: Set the Webhook
Run this command in your browser or terminal (replace values):

**Browser:**
Paste this URL into a new tab:
`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/telegram/webhook`

**Example:**
`https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://foodie-crm.vercel.app/api/telegram/webhook`

### Step 3: Verify
If successful, you will see a JSON response:
`{"ok":true,"result":true,"description":"Webhook was set"}`

Now, when you send a message to your bot, Vercel will wake up and handle it!
