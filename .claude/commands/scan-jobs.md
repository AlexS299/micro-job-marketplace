# /scan-jobs — סריקת עבודות זמינות

Scan Israeli and international freelance marketplaces for available jobs matching the agent's skill profile.

## Arguments

`/scan-jobs [marketplace] [--keyword <text>] [--min-budget <amount>] [--lang he|en]`

Examples:
- `/scan-jobs` — scan all active marketplaces
- `/scan-jobs fiverr --keyword "כתיבת תוכן"` — search Fiverr for Hebrew content writing
- `/scan-jobs xplace --min-budget 500` — Xplace jobs above ₪500

## Steps

**Step 1 — Load config**

Read `agent-config.json`. If missing, tell the user to run `/init-agent` first.

**Step 2 — Scrape / query marketplaces**

For each enabled marketplace, use WebSearch or the marketplace's public listings:

### Fiverr (ישראל)
- Search: `site:fiverr.com/requests <keyword>`
- Or check `src/marketplaces/fiverr.js` for API integration

### Xplace
- Endpoint: `https://www.xplace.co.il/jobs` (public listings)
- Filter by category matching agent services

### WorkPlus
- Endpoint: `https://www.workplus.co.il` 
- Hebrew job board, filter by remote/digital work

### International (Fiverr global, Upwork)
- Only if `agent.currency === "USD"` or `agent.language === "en"`

**Step 3 — Score and rank**

For each job found, score it 1-10 based on:
- Budget vs. agent's minimum rate
- Skill match (compare job description to `agent-config.json services[]`)
- Client rating/reviews (if available)
- Deadline feasibility

**Step 4 — Display results**

Show a ranked table:

```
📋 עבודות זמינות — <date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ציון  שוק       תקציב    כותרת
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1   9.2  Xplace    ₪1,200   כתיבת 5 מאמרי SEO בעברית
2   8.7  Fiverr    ₪850     עריכת וידאו לרשתות חברתיות  
3   7.1  WorkPlus  ₪600     תרגום מסמכים עברית-אנגלית
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

הזן מספר עבודה כדי ליצור הצעה, או /scan-jobs מחדש לרענון.
```

**Step 5 — Offer next action**

After displaying results, ask: "האם לשלוח הצעה לאחת מהעבודות? הזן מספר או 'לא'."
If user picks a number, automatically call `/create-offer` with that job's details pre-filled.
