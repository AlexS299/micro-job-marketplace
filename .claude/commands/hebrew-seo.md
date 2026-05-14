# /hebrew-seo — ביקורת SEO בעברית

Perform a Hebrew-language SEO audit for a website or page, with Israeli market considerations.

## Arguments

`/hebrew-seo <url> [--competitor <url>] [--keywords <word1,word2,...>]`

Examples:
- `/hebrew-seo https://example.co.il`
- `/hebrew-seo https://shop.co.il --keywords "נעלי ריצה,נעלי ספורט"`
- `/hebrew-seo https://blog.co.il --competitor https://rival.co.il`

## Steps

**Step 1 — Fetch the page**

Use WebFetch to retrieve the URL. Extract:
- Page title (`<title>`)
- Meta description
- H1, H2, H3 headings
- First 500 words of body text
- Internal/external link count
- Image alt tags

**Step 2 — Hebrew-specific checks**

Run these checks unique to Hebrew content:

| Check | Good | Problem |
|-------|------|---------|
| Title language | Hebrew title for .co.il | English-only title |
| RTL direction | `dir="rtl"` on `<html>` | Missing RTL |
| `lang` attribute | `lang="he"` | Missing or wrong |
| Font rendering | Heebo, Rubik, Assistant | Arial only (poor Hebrew) |
| Apostrophes | Uses ׳ and ״ | Uses ' and " |
| Date format | DD/MM/YYYY | MM/DD/YYYY |
| Currency | ₪ symbol | $ or no symbol |
| hreflang | `hreflang="he-IL"` set | Missing |

**Step 3 — Keyword analysis**

For each provided keyword:
- Is it in the title? (weighted heavily in Google.co.il)
- Is it in the H1?
- Keyword density in body text (aim for 1-2%)
- Check for related terms (semantic field)
- Flag if keyword uses wrong Hebrew spelling variants

**Step 4 — Israeli market analysis**

- Check if listed on **Google My Business** (for local businesses)
- Check if the site appears in **Bing Israel** (smaller but relevant)
- Verify **schema.org** markup for Hebrew LocalBusiness
- Check mobile speed (Israeli mobile usage is ~75% of traffic)
- Check if hreflang includes `he-IL` for Israeli Hebrew vs `he` for general

**Step 5 — Competitor comparison** (if --competitor provided)

Fetch competitor URL and compare:
- Title tag length and keywords
- Meta description quality
- Heading structure
- Estimated keyword overlap

**Step 6 — Report**

Generate a Hebrew SEO report and save to `reports/seo-<domain>-<date>.md`:

```markdown
# דוח SEO — <domain>
תאריך: <date>
ציון כולל: <X>/100

## ממצאים קריטיים 🔴
- [בעיה דחופה 1]

## שיפורים מומלצים 🟡
- [המלצה 1]
- [המלצה 2]

## מה עובד טוב ✅
- [חוזק 1]

## מילות מפתח
| מילה | בכותרת | ב-H1 | בגוף | צפיפות |
|------|--------|------|------|--------|
| ...  | ✓/✗   | ✓/✗  | ✓/✗  | X%     |

## המלצות טכניות
[list]

---
*הדוח הופק על ידי סוכן AI פרילנסר ישראלי*
```

Print a summary and path to the full report.
