/**
 * Xplace (xplace.co.il) — Israel's largest Hebrew freelance marketplace.
 * All transactions in ILS (₪). No public API; uses public listing pages.
 */

const XPLACE_BASE = 'https://www.xplace.co.il';

const CATEGORIES = {
  writing:      { id: 'writing',       label: 'כתיבה ותרגום',       path: '/jobs/writing' },
  programming:  { id: 'programming',   label: 'פיתוח ותכנות',       path: '/jobs/programming' },
  design:       { id: 'design',        label: 'עיצוב גרפי',          path: '/jobs/design' },
  marketing:    { id: 'marketing',     label: 'שיווק ופרסום',        path: '/jobs/marketing' },
  seo:          { id: 'seo',           label: 'קידום אתרים (SEO)',   path: '/jobs/seo' },
  video:        { id: 'video',         label: 'וידאו ועריכה',        path: '/jobs/video' },
  social_media: { id: 'social_media',  label: 'רשתות חברתיות',      path: '/jobs/social-media' },
};

function buildJobSearchUrl(keyword, category = '') {
  const base = category && CATEGORIES[category]
    ? `${XPLACE_BASE}${CATEGORIES[category].path}`
    : `${XPLACE_BASE}/jobs`;
  return keyword ? `${base}?q=${encodeURIComponent(keyword)}` : base;
}

function buildProfileUrl(username) {
  return `${XPLACE_BASE}/freelancers/${username}`;
}

/**
 * Parse a job listing object from scraped Xplace HTML.
 * Adjust selectors as the site evolves.
 */
function parseJobListing(rawText) {
  const budgetMatch = rawText.match(/₪([\d,]+)/);
  return {
    source: 'xplace',
    currency: 'ILS',
    budget_ils: budgetMatch ? parseInt(budgetMatch[1].replace(',', ''), 10) : null,
    raw: rawText.trim(),
  };
}

module.exports = { buildJobSearchUrl, buildProfileUrl, parseJobListing, CATEGORIES, XPLACE_BASE };
