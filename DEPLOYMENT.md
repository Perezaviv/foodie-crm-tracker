# Deployment Guide

## 1. Environment Variables (Vercel)

For the app to work on Vercel, you must set the following Environment Variables in your Vercel Project Settings.

Go to: **Settings** -> **Environment Variables**

| Key | Description | Required? |
|-----|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | **Yes** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | **Yes** |
| `GEMINI_API_KEY` | Google Gemini AI Key | **Yes** |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | **Yes** (New) |
| `TAVILY_API_KEY` | Tavily Search API Key | **Yes** (New) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (for RLS Bypass) | **Yes** (New) |

> [!IMPORTANT]
> The **Map View** will show "Oops! Something went wrong" if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing or if your Google Cloud Console does not allow the Vercel domain.
> **Photo Uploads** via Telegram will fail if `SUPABASE_SERVICE_ROLE_KEY` is undefined.

## 2. Google Maps Restrictions

If your map key works locally but fails on Vercel:
1.  Go to **Google Cloud Console** -> **APIs & Services** -> **Credentials**.
2.  Edit your API Key.
3.  Under **Application restrictions**, add your temporary Vercel domain:
    *   `*.vercel.app/*`
    *   `your-custom-domain.com/*`

## 3. Telegram Bot Setup (Serverless)

Since Vercel is serverless, we use a **Webhook**.

### Step 1: Deploy the App
Ensure your app is deployed successfully.

### Step 2: Set the Webhook
Run this command in your browser/terminal:

```bash
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/telegram/webhook
```

### Step 3: Verify
Send a message to your bot. If it replies, it's alive!

## 4. Health Check

Visit: `https://your-app-url.vercel.app/api/health`

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
