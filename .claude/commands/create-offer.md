# /create-offer — יצירת הצעת שירות

Create a professional service proposal in Hebrew and/or English, tailored to the Israeli freelance market.

## Arguments

`/create-offer [--job-id <id>] [--service <type>] [--price <amount>] [--lang he|en|both]`

Examples:
- `/create-offer` — interactive mode
- `/create-offer --service "hebrew-seo" --price 1200 --lang he`
- `/create-offer --job-id xplace-4821` — respond to a specific scanned job

## Steps

**Step 1 — Gather offer details**

If `--job-id` provided, load the job from the scan cache. Otherwise ask:
- What service are you offering?
- What is your price (in ₪ or $ based on config)?
- Delivery time (ימי עבודה)?
- Any special terms?

**Step 2 — Generate the proposal**

Write a professional proposal using this structure:

### Hebrew proposal template:
```
שלום [שם לקוח],

תודה על הפניה. אשמח לסייע בנושא [תיאור הפרויקט].

**מה אני מציע:**
- [פירוט 1]
- [פירוט 2]
- [פירוט 3]

**מחיר:** ₪[מחיר] + מע"מ (₪[מחיר עם מע"מ] סה"כ)
**זמן אספקה:** [X] ימי עבודה
**כולל:** [מה כלול]

אני זמין לשאלות ולשיחה מקדימה.
בברכה,
[שם]
```

### English proposal template (for international clients):
```
Hi [Client Name],

Thank you for your request. I'd be happy to help with [project description].

**What I offer:**
- [Detail 1]
- [Detail 2]

**Price:** $[amount] (fixed price)
**Delivery:** [X] business days
**Includes:** [what's included]

Feel free to reach out with any questions.
Best,
[Name]
```

**Step 3 — VAT calculation**

If business_type is `osek_murshe`, always add VAT:
- Display: `מחיר לפני מע"מ: ₪X | מע"מ (18%): ₪Y | סה"כ: ₪Z`
- Add note: "המחיר אינו כולל מע"מ" in Hebrew proposals

If `osek_patur`, note: "פטור ממע"מ לפי סעיף 31 לחוק מע"מ"

**Step 4 — Save offer**

Save the offer to `offers/offer-<timestamp>.json`:
```json
{
  "id": "offer-<timestamp>",
  "job_id": "<job-id or null>",
  "service": "<service>",
  "price_ils": <number>,
  "price_with_vat": <number>,
  "currency": "ILS",
  "delivery_days": <number>,
  "status": "draft",
  "created_at": "<ISO date>",
  "proposal_he": "<Hebrew text>",
  "proposal_en": "<English text>"
}
```

**Step 5 — Confirm and send**

Show the complete proposal to the user.
Ask: "לשלוח הצעה זו? (כן / ערוך / בטל)"
If "כן" — mark status as "sent" and provide the copy-paste text.
