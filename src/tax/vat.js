/**
 * Israeli VAT (מע"מ) calculation utilities
 * Current rate: 18% (as of 2026)
 */

const VAT_RATE = 0.18;

/**
 * Osek Murshe: fully VAT-registered, must charge and remit VAT
 * Osek Patur: exempt up to ₪120,000/year turnover
 */
const BUSINESS_TYPES = {
  osek_murshe: { chargesVat: true, label: 'עוסק מורשה' },
  osek_patur:  { chargesVat: false, label: 'עוסק פטור' },
};

function addVat(amount) {
  return {
    subtotal: amount,
    vat: parseFloat((amount * VAT_RATE).toFixed(2)),
    total: parseFloat((amount * (1 + VAT_RATE)).toFixed(2)),
    rate: VAT_RATE,
  };
}

function removeVat(amountWithVat) {
  const subtotal = amountWithVat / (1 + VAT_RATE);
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    vat: parseFloat((amountWithVat - subtotal).toFixed(2)),
    total: amountWithVat,
    rate: VAT_RATE,
  };
}

function formatIls(amount) {
  return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function vatSummaryText(amount, businessType = 'osek_murshe', lang = 'he') {
  const bt = BUSINESS_TYPES[businessType];
  if (!bt.chargesVat) {
    return lang === 'he'
      ? 'פטור ממע"מ לפי סעיף 31 לחוק מע"מ, תשל"ו-1975'
      : 'VAT exempt under Israeli VAT Law 1976, Section 31';
  }
  const { subtotal, vat, total } = addVat(amount);
  if (lang === 'he') {
    return `מחיר לפני מע"מ: ${formatIls(subtotal)} | מע"מ (18%): ${formatIls(vat)} | סה"כ: ${formatIls(total)}`;
  }
  return `Before VAT: ${formatIls(subtotal)} | VAT (18%): ${formatIls(vat)} | Total: ${formatIls(total)}`;
}

module.exports = { addVat, removeVat, formatIls, vatSummaryText, VAT_RATE, BUSINESS_TYPES };
