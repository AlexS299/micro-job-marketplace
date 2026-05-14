# /deliver — מסירת עבודה ללקוח

Package and deliver completed work to the client, generate a delivery message in Hebrew/English, and update the offer status.

## Arguments

`/deliver [--offer-id <id>] [--files <path1,path2,...>] [--lang he|en|both]`

Examples:
- `/deliver --offer-id offer-1234 --files output/article.docx,output/seo-report.pdf`
- `/deliver` — interactive mode

## Steps

**Step 1 — Load offer**

Load the offer from `offers/offer-<id>.json`.
Verify status is "sent" or "in-progress" (not already "delivered").

**Step 2 — Collect deliverables**

If `--files` not specified, ask: "מה הקבצים למסירה? הזן נתיבים מופרדים בפסיק."
List the files and confirm they exist.

**Step 3 — Quality check prompt**

Before delivering, run a self-check:
- Does the deliverable match the original offer scope?
- Is the file format correct (docx, pdf, mp4, etc.)?
- Any Hebrew spell-check needed? (for text content)

If content is text/markdown, run a Hebrew spell check heuristic:
- Check for common typos: "של ה" → flag if spacing is off
- Check quotation marks: use „..." or "..." not ""
- Ensure proper Gershayim (״) usage in abbreviations

**Step 4 — Generate delivery message**

### Hebrew:
```
שלום [שם לקוח],

שמחתי לעבוד על הפרויקט שלך!

המסירה כוללת:
- [קובץ 1] — [תיאור קצר]
- [קובץ 2] — [תיאור קצר]

[הוראות שימוש אם רלוונטי]

אשמח לתיקונים קלים ללא עלות נוספת תוך [X] ימים.
אם אהבת את העבודה, ביקורת חיובית תעזור לי מאוד 🙏

בברכה,
[שם]
```

### English (for international clients):
```
Hi [Client Name],

Your project is ready!

Deliverables:
- [File 1] — [short description]
- [File 2] — [short description]

[Usage instructions if applicable]

I offer minor revisions free of charge within [X] days.
A positive review would mean a lot — thank you!

Best,
[Name]
```

**Step 5 — Update records**

1. Update `offers/offer-<id>.json`: set `status: "delivered"`, add `delivered_at` timestamp
2. Move files to `deliveries/offer-<id>/`
3. If invoice not yet generated, prompt: "האם להפיק חשבונית עכשיו? הזן /invoice --offer-id <id>"

**Step 6 — Confirm**

```
✓ מסירה הושלמה
עבודה:    <offer title>
לקוח:     <client name>
קבצים:    <count> קבצים
סטטוס:    ממתין לתשלום / שולם ✓
```
