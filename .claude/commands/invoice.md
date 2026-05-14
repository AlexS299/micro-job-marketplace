# /invoice — הפקת חשבונית ישראלית

Generate an Israeli-compliant invoice (חשבונית מס / קבלה) with proper VAT handling.

## Arguments

`/invoice [--offer-id <id>] [--client <name>] [--amount <number>] [--type invoice|receipt|combined]`

Types:
- `invoice` — חשבונית מס (tax invoice, for VAT-registered clients)
- `receipt` — קבלה (receipt, after payment received)
- `combined` — חשבונית מס קבלה (combined, most common for small businesses)

Examples:
- `/invoice --offer-id offer-1234 --type combined`
- `/invoice --client "אבי כהן" --amount 1200 --type receipt`

## Steps

**Step 1 — Load data**

If `--offer-id` provided, load from `offers/offer-<id>.json`.
Otherwise collect: client name, client ID (ח.פ / ת.ז), amount, service description, payment date.

Read agent config for: business name, business ID (ח.פ / עוסק מורשה number), address.

**Step 2 — Calculate amounts**

```
מחיר לפני מע"מ = amount
מע"מ (18%)      = amount * 0.18
סה"כ לתשלום    = amount * 1.18
```

If `osek_patur`: no VAT, add legal note.

**Step 3 — Generate invoice document**

Create `invoices/invoice-<number>.md` with this structure:

```markdown
# חשבונית מס קבלה מספר: <INVOICE_NUMBER>

**מוצא:** <AGENT_BUSINESS_NAME>
ח.פ / עוסק מורשה: <BUSINESS_ID>
כתובת: <ADDRESS>
טלפון: <PHONE>
אימייל: <EMAIL>

---

**לכבוד:** <CLIENT_NAME>
ח.פ / ת.ז: <CLIENT_ID>
תאריך: <DATE_HE> | <DATE_EN>

---

| תיאור השירות          | כמות | מחיר יחידה | סה"כ    |
|----------------------|------|------------|---------|
| <SERVICE_DESCRIPTION> | 1    | ₪<PRICE>   | ₪<PRICE> |

---

**סכום לפני מע"מ:** ₪<SUBTOTAL>
**מע"מ 18%:**        ₪<VAT_AMOUNT>
**סה"כ לתשלום:**    ₪<TOTAL>

**אמצעי תשלום:** <PAYMENT_METHOD>
**תאריך תשלום:** <PAYMENT_DATE>

---
*חשבונית זו הופקה בהתאם לחוק מע"מ, תשל"ו-1975*
```

**Step 4 — Increment invoice counter**

Read `invoices/counter.json` (create if missing, start at 1000).
Increment by 1 and save. Use sequential numbers for tax compliance.

**Step 5 — Output**

- Save markdown to `invoices/invoice-<number>.md`
- Save JSON metadata to `invoices/invoice-<number>.json`
- Print confirmation: "חשבונית מספר <N> נשמרה בהצלחה ✓"
- Offer: "האם לשלוח ללקוח באימייל? (כן / לא)"
