# /init-agent — אתחול סוכן הפרילנסר הישראלי

Initialize the Israeli freelance AI agent for this project. Run this first before any other commands.

## What this does

1. Reads or creates `agent-config.json` with Israeli market settings
2. Validates required API keys from environment
3. Displays a setup summary in Hebrew and English

## Steps

**Step 1 — Check for existing config**

Read `agent-config.json` if it exists. If not, create it by asking the user:

- Business type: `עוסק פטור` (exempt) or `עוסק מורשה` (licensed dealer)?
- Primary currency: NIS (₪) or USD ($)?
- Preferred language for client communication: Hebrew, English, or both?
- Which marketplaces to activate: Fiverr, Xplace, WorkPlus, international?
- Payment processor: Tranzila, Cardcom, Stripe, or PayPal?

**Step 2 — Write config**

Write the answers to `agent-config.json` using this schema:

```json
{
  "agent": {
    "name": "<agent name>",
    "language": "he" | "en" | "both",
    "currency": "ILS" | "USD",
    "business_type": "osek_patur" | "osek_murshe",
    "vat_rate": 0.18,
    "vat_included": true
  },
  "marketplaces": {
    "fiverr": { "enabled": true, "profile_url": "" },
    "xplace": { "enabled": false, "api_key": "" },
    "workplus": { "enabled": false, "api_key": "" }
  },
  "payment": {
    "processor": "stripe" | "tranzila" | "cardcom" | "paypal",
    "stripe_key": "$STRIPE_SECRET_KEY",
    "tranzila_terminal": "$TRANZILA_TERMINAL"
  },
  "services": []
}
```

**Step 3 — Validate environment**

Check that required env vars exist for the chosen processor:
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- Tranzila: `TRANZILA_TERMINAL`, `TRANZILA_PASSWORD`
- Cardcom: `CARDCOM_TERMINAL`, `CARDCOM_USERNAME`

If missing, print the exact export commands the user needs to run.

**Step 4 — Display summary**

Print a bilingual summary:

```
✓ סוכן פרילנסר ישראלי מוכן / Israeli Freelance Agent Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
סוג עסק:     עוסק מורשה / Licensed Dealer
מטבע:        ₪ (ILS)
מע"מ:         18%
שווקים פעילים: Fiverr, Xplace
תשלום:       Tranzila
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
הפקודות הזמינות:
  /scan-jobs      — סרוק עבודות זמינות
  /create-offer   — צור הצעת שירות חדשה
  /invoice        — הפק חשבונית
  /deliver        — מסור עבודה ושלח ללקוח
  /hebrew-seo     — ביצוע ביקורת SEO בעברית
```
