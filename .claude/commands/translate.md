# /translate — שירות תרגום עברית-אנגלית

Translate documents or text between Hebrew and English with professional quality, preserving formatting and cultural context.

## Arguments

`/translate <file-or-text> --from <he|en> --to <he|en> [--style formal|casual|legal|marketing] [--glossary <file>]`

Examples:
- `/translate document.docx --from en --to he --style formal`
- `/translate "Click here to learn more" --from en --to he --style marketing`
- `/translate contract.txt --from he --to en --style legal --glossary legal-terms.json`

## Steps

**Step 1 — Load content**

If argument is a file path, read the file. If it's quoted text, use it directly.
Detect source language automatically if `--from` not specified.

**Step 2 — Load glossary** (if provided)

Read `glossary-file.json` — a key-value map of fixed translations to use consistently:
```json
{
  "privacy policy": "מדיניות פרטיות",
  "terms of service": "תנאי שימוש",
  "checkout": "סיום רכישה"
}
```
Also auto-load `glossaries/default-<from>-<to>.json` if it exists.

**Step 3 — Style guide**

Apply style rules based on `--style`:

- **formal** (רשמי): Avoid contractions, use full forms, gender-neutral where possible
- **casual** (סתמי): Natural spoken Hebrew, OK to use slang
- **legal** (משפטי): Precise terminology, no paraphrasing, flag untranslatable terms
- **marketing** (שיווקי): Culturally adapted, not literal — adapt idioms for Israeli audience

**Step 4 — Translate**

Perform the translation. Key rules for Hebrew:

EN→HE:
- Adapt idioms (don't translate literally)
- Use ״...״ for quotes, not "..."
- Numbers: use Western digits (0-9), not Hebrew letters
- Dates: DD/MM/YYYY format
- Currency: convert $ mentions to ₪ if context is Israeli
- Gender: when gender is unknown, prefer masculine (standard) or both forms (מנהל/ת)

HE→EN:
- Transliterate proper nouns (שמות עצם פרטיים) consistently
- Keep Hebrew terms that have no English equivalent (e.g., "עוסק מורשה" → "Licensed Dealer (Osek Murshe)")
- Explain cultural references in brackets: [Israeli equivalent of...]

**Step 5 — Quality review**

Self-review the translation:
- Back-translate key sentences to verify accuracy
- Check that all glossary terms were applied
- Flag any ambiguous segments with [?] for human review

**Step 6 — Save output**

Save to `translations/<original-filename>-<to>.md` (or same extension as input).

Print:
```
✓ תרגום הושלם
מקור:    [filename] (<word count> מילים)
פלט:     [output path]
סגנון:   <style>
דגלים:   <count> קטעים לבדיקה אנושית
```
