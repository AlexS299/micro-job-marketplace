# Israeli Freelance Agent — Claude Code Skill Pack

חבילת סקילים ל-Claude Code שמאפשרת לסוכן AI לפעול כפרילנסר בשוק הישראלי.

## Quick Start

```bash
# 1. Initialize your agent profile
/init-agent

# 2. Scan for available jobs
/scan-jobs

# 3. Create a proposal
/create-offer --service "hebrew-seo" --price 1200

# 4. Deliver the work
/deliver --offer-id <id> --files output/report.pdf

# 5. Generate an invoice
/invoice --offer-id <id> --type combined
```

## Available Skills

| Command | תיאור |
|---------|-------|
| `/init-agent` | הגדרת הסוכן (שוק, מטבע, מע"מ, תשלום) |
| `/scan-jobs` | סריקת עבודות ב-Fiverr, Xplace, WorkPlus |
| `/create-offer` | יצירת הצעה עברית/אנגלית עם חישוב מע"מ |
| `/deliver` | מסירת עבודה עם הודעה מקצועית |
| `/invoice` | הפקת חשבונית מס תואמת רשות המיסים |
| `/hebrew-seo` | ביקורת SEO מותאמת לשוק הישראלי |
| `/translate` | תרגום מקצועי עברית↔אנגלית |

## Israeli Market Features

- **מע"מ אוטומטי**: 18%, תמיכה בעוסק מורשה ועוסק פטור
- **מטבע**: ₪ (ILS) כברירת מחדל, USD לעבודות בינלאומיות
- **שווקים**: Fiverr (ישראל), Xplace, WorkPlus
- **תשלום**: Tranzila, Cardcom (ישראל) + Stripe (בינלאומי)
- **שפה**: Hebrew RTL + English
- **חשבוניות**: תואמות חוק מע"מ תשל"ו-1975

## Project Structure

```
.claude/commands/   ← Claude Code slash commands (skills)
src/
  config/           ← Agent configuration
  tax/              ← Israeli VAT utilities
  marketplaces/     ← Fiverr, Xplace integrations
  services/         ← Hebrew content, SEO, translation
offers/             ← Saved proposals (auto-created)
invoices/           ← Generated invoices (auto-created)
deliveries/         ← Delivered work packages (auto-created)
reports/            ← SEO and other reports (auto-created)
```

## Environment Variables

```bash
# For Stripe (international payments)
export STRIPE_SECRET_KEY=sk_...
export STRIPE_PUBLISHABLE_KEY=pk_...

# For Tranzila (Israeli payment processor)
export TRANZILA_TERMINAL=your_terminal
export TRANZILA_PASSWORD=your_password

# For Cardcom (Israeli payment processor)
export CARDCOM_TERMINAL=your_terminal
export CARDCOM_USERNAME=your_username
```
