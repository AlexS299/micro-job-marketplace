/**
 * Default configuration for the Israeli freelance agent.
 * Override by writing agent-config.json via /init-agent.
 */
module.exports = {
  agent: {
    name: '',
    language: 'both',
    currency: 'ILS',
    business_type: 'osek_murshe',
    vat_rate: 0.18,
    vat_included: false,
  },
  marketplaces: {
    fiverr:   { enabled: true,  profile_url: '', region: 'il' },
    xplace:   { enabled: false, api_key: '' },
    workplus: { enabled: false, api_key: '' },
    upwork:   { enabled: false, api_key: '' },
  },
  payment: {
    processor: 'stripe',
    currency: 'ILS',
    stripe_key: process.env.STRIPE_SECRET_KEY || '',
    tranzila_terminal: process.env.TRANZILA_TERMINAL || '',
    tranzila_password: process.env.TRANZILA_PASSWORD || '',
    cardcom_terminal: process.env.CARDCOM_TERMINAL || '',
    cardcom_username: process.env.CARDCOM_USERNAME || '',
  },
  services: [
    { id: 'hebrew-seo',    label: 'Hebrew SEO Audit',            base_price_ils: 800  },
    { id: 'content-he',    label: 'כתיבת תוכן בעברית',           base_price_ils: 150  },
    { id: 'translation',   label: 'תרגום עברית-אנגלית',           base_price_ils: 0.35 },
    { id: 'social-media',  label: 'ניהול רשתות חברתיות (ישראל)',  base_price_ils: 1200 },
  ],
  invoice: {
    counter_start: 1000,
    legal_note_murshe: 'חשבונית זו הופקה בהתאם לחוק מע"מ, תשל"ו-1975',
    legal_note_patur:  'פטור ממע"מ לפי סעיף 31 לחוק מע"מ, תשל"ו-1975',
  },
};
