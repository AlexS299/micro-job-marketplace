/**
 * Fiverr marketplace integration (Israeli sellers, global buyers)
 * Fiverr was founded in Israel — strong local seller community.
 *
 * Note: Fiverr has no public API for buyer requests.
 * This module provides search helpers and profile URL builders.
 */

const FIVERR_IL_BASE = 'https://www.fiverr.com';

function buildSearchUrl(keyword, { category = '', minBudget = 0 } = {}) {
  const params = new URLSearchParams({ query: keyword });
  if (category) params.set('category', category);
  if (minBudget > 0) params.set('min_price', minBudget);
  return `${FIVERR_IL_BASE}/search/gigs?${params}`;
}

function buildRequestsUrl(keyword) {
  return `${FIVERR_IL_BASE}/requests?query=${encodeURIComponent(keyword)}`;
}

/**
 * Common Fiverr categories popular among Israeli freelancers
 */
const IL_POPULAR_CATEGORIES = [
  { id: 'programming-tech',      label: 'פיתוח ותוכנה' },
  { id: 'digital-marketing',     label: 'שיווק דיגיטלי' },
  { id: 'writing-translation',   label: 'כתיבה ותרגום' },
  { id: 'video-animation',       label: 'וידאו ואנימציה' },
  { id: 'graphics-design',       label: 'גרפיקה ועיצוב' },
];

/**
 * Fiverr pays sellers in USD. For Israeli sellers, use this to convert.
 * Exchange rate should be fetched live; this is a fallback.
 */
function usdToIls(usd, exchangeRate = 3.7) {
  return parseFloat((usd * exchangeRate).toFixed(2));
}

module.exports = { buildSearchUrl, buildRequestsUrl, IL_POPULAR_CATEGORIES, usdToIls };
