/**
 * Hebrew content writing service utilities.
 * Handles Hebrew-specific formatting, typography, and style rules.
 */

const TYPOGRAPHY = {
  // Use proper Hebrew quotation marks
  openQuote:  '„', // „
  closeQuote: '“', // "
  // Hebrew abbreviation marks
  geresh:     '׳', // ׳  (single letter abbreviation)
  gershayim:  '״', // ״  (multi-letter abbreviation)
  // Maqaf (Hebrew hyphen)
  maqaf:      '־', // ־
};

const COMMON_TYPOS = [
  { wrong: '"',  correct: '״',  note: 'גרשיים עבריים' },
  { wrong: "'",  correct: '׳',  note: 'גרש עברי' },
  { wrong: '...',correct: '…',  note: 'שלוש נקודות (אליפסיס)' },
];

/**
 * Apply basic Hebrew typography corrections to text
 */
function fixTypography(text) {
  let result = text;
  // Replace straight quotes around Hebrew words with geresh/gershayim
  result = result.replace(/(\p{Script=Hebrew}+)"/gu, `$1${TYPOGRAPHY.gershayim}`);
  result = result.replace(/(\p{Script=Hebrew}+)'/gu, `$1${TYPOGRAPHY.geresh}`);
  // Normalize ellipsis
  result = result.replace(/\.{3}/g, '…');
  return result;
}

/**
 * Count words in Hebrew text (handles mixed Hebrew/English)
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate reading time in minutes (average Hebrew reading: ~200 words/min)
 */
function readingTime(text) {
  return Math.ceil(countWords(text) / 200);
}

/**
 * Generate SEO-optimized Hebrew article structure
 */
function articleOutline(topic, keywords = []) {
  return {
    title: `[כותרת ראשית - כולל "${keywords[0] || topic}"]`,
    intro: `[פסקת פתיחה - 50-80 מילים, כולל מילת המפתח הראשית]`,
    sections: [
      { heading: `מהו ${topic}?`, words: 150 },
      { heading: `למה ${topic} חשוב?`, words: 200 },
      { heading: `איך להתחיל עם ${topic}`, words: 250 },
      { heading: `טיפים מקצועיים`, words: 200 },
      { heading: `סיכום`, words: 100 },
    ],
    total_words: 900,
    keywords,
  };
}

module.exports = { TYPOGRAPHY, COMMON_TYPOS, fixTypography, countWords, readingTime, articleOutline };
