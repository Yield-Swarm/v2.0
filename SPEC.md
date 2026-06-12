# YieldSwarm Swarm Core Bot — Deployment Spec

## Overview

The Swarm Core bot is a private Telegram AI dispatcher for the founder (Christopher). It routes messages to different AI backends based on slash commands.

## Architecture

| Component | File | Purpose |
|---|---|---|
| Dispatcher | `routes/telegram-swarm.js` | Webhook endpoint, routing logic, AI callers, rate limiting |
| Bot handler | `bots/telegram-swarm.js` | Command registry, keyboard builders, session state |

**Webhook endpoint:** `POST /api/telegram-swarm`
**Setup endpoint:** `GET /api/telegram-swarm/set-webhook`
**Health check:** `GET /api/telegram-swarm/status`

## Routing Table

| Command | Routes to | AI Model |
|---|---|---|
| `/support` | Gemini | gemini-2.0-flash |
| `/engineering` | OpenAI Codex | o4-mini |
| `/deploy` | OpenAI Codex | o4-mini (+ confirmation gate) |
| `/apk` | OpenAI Codex | o4-mini |
| `/ops` | IoTZSEprotocol (Kimi) | moonshot-v1-8k |
| `/status` (SOL) | IoTZSEprotocol (Kimi) | moonshot-v1-8k |
| `/research` | SuperGrok | grok-3 |
| `/network` | SuperGrok | grok-3 |
| `/agents` | Polsia | gpt-4o |
| Anything else | Polsia | gpt-4o |

## Required Environment Variables

Add these to Render → Environment → Environment Variables:

```
TELEGRAM_BOT_TOKEN=        # REQUIRED — create bot via @BotFather, paste token here
TELEGRAM_ALLOWED_CHAT_ID=  # REQUIRED — Christopher's Telegram chat ID (integer)
TELEGRAM_SETUP_SECRET=     # OPTIONAL — secret to protect /set-webhook endpoint

# AI backend keys (at least one required for bot to be useful):
OPENAI_API_KEY=            # Codex (engineering/deploy/apk commands)
GEMINI_API_KEY=            # Gemini (support queries)
GROK_API_KEY=              # SuperGrok (research/network commands)
XAI_API_KEY=               # Alias for GROK_API_KEY (xAI)
KIMI_API_KEY=              # Kimi/Moonshot AI (ops/status commands)
POLSIA_API_KEY=            # Polsia orchestrator (default routing)
POLSIA_API_URL=            # Polsia API base URL (default: https://api.polsia.com)

# Optional: Discord webhook for financial action logging
DISCORD_WEBHOOK_YIELDS=    # Webhook URL for action logs
```

## Setup Steps (Christopher)

1. **Create the bot** — Open Telegram, message @BotFather, send `/newbot`, follow prompts. Name it "YieldSwarm Swarm Core" or similar.

2. **Get the token** — BotFather will give you a token like `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`. Copy it.

3. **Find your chat ID** — Message @userinfobot or @getidsbot on Telegram. It will reply with your numeric chat ID (e.g., `987654321`).

4. **Add to Render** — Go to Render dashboard → your yieldswarm service → Environment:
   - `TELEGRAM_BOT_TOKEN = 123456789:ABCdefGHIjklMNOpqrSTUvwxyz`
   - `TELEGRAM_ALLOWED_CHAT_ID = 987654321`

5. **Deploy** — The code is already deployed. After adding env vars, the app will restart automatically on Render.

6. **Set webhook** — Once deployed, open this URL in your browser to register the webhook with Telegram:
   ```
   https://yieldswarm.polsia.app/api/telegram-swarm/set-webhook
   ```
   You should see `{"ok":true,"webhook":"https://yieldswarm.polsia.app/api/telegram-swarm"}`

7. **Test** — Open Telegram, search for your bot, send `/help`. You should see the command list.

## Security Notes

- **Founder-only:** `TELEGRAM_ALLOWED_CHAT_ID` restricts all commands to Christopher's Telegram account. Nobody else can interact.
- **Deploy gate:** `/deploy` requires replying `yes` or `confirm` within 2 minutes — prevents accidental executions.
- **No secrets echoed:** The bot never echoes seed phrases, private keys, or API keys. It sanitizes logs before recording.
- **Rate limiting:** 5 messages/minute per user (in-memory, resets on window expiry).
- **Financial actions logged:** All `/deploy`, `/ops`, and `/support` calls are logged to console and optionally to Discord webhook.

## Existing Telegram Bot (Marketing)

The Swarm Core bot is SEPARATE from the existing `@YieldSwarmPolsiaBot` (Mine-to-Earn game, referrals, fleet stats). That bot lives in `routes/telegram.js` and is unaffected by this deployment.

## Troubleshooting

**Bot not responding?**
1. Check `/api/telegram-swarm/status` — should show `configured: true`
2. Verify `TELEGRAM_BOT_TOKEN` is set in Render env vars
3. Verify `TELEGRAM_ALLOWED_CHAT_ID` is your actual Telegram chat ID
4. Check Render logs for `[telegram-swarm]` entries

**Webhook not set?**
Call `GET /api/telegram-swarm/set-webhook` — Telegram needs to know where to send updates.

**Rate limited?**
Wait 60 seconds. The limit is 5 messages/minute per user.

**Wrong AI responding?**
The routing is based on the first word after the slash. `/engineering anything` routes to Codex. `/engineering\ncheck status` also routes to Codex (the `/status` check only triggers on SOL-related keywords in ops context).