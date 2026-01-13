# Telegram Listener Directive

## Purpose
Listen for incoming messages from a Telegram bot and process them to add new restaurants to the Foodie CRM database.

## Prerequisites
- **TELEGRAM_BOT_TOKEN**: A Telegram Bot API token from BotFather.
- **NEXT_PUBLIC_SUPABASE_URL**: Supabase project URL.
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase anon key.

All environment variables should be set in `.env` at project root.

## Inputs
- Text messages sent to the Telegram bot (e.g., "Miznon, Tel Aviv").
- (Future) Photos with captions.

## Tools/Scripts
- **execution/telegram_poller.js**: Main polling script.

## Running the Listener
```bash
node execution/telegram_poller.js
```

## Message Format
Users can send messages in the following formats:

### Simple (name only)
```
Miznon
```

### With City
```
Miznon, Tel Aviv
```

### With Notes
```
Miznon, Tel Aviv - great pita!
```

## Outputs
- New row inserted into `restaurants` table in Supabase.
- Bot replies confirming the restaurant was added.

## Edge Cases
- **Empty message**: Bot replies asking for restaurant name.
- **Supabase error**: Bot replies with error message, logs to console.
- **Bot token missing**: Script exits with error.

## Known Limitations
- Currently uses the anon key, so `created_by` cannot be set without user auth flow.
- No full LLM parsing yet—uses simple comma/dash splitting.

## Learnings
- (Add learnings here as the system evolves)
