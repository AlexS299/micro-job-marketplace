export const EXPENSE_CATEGORIES = {
  OFFICE:       'ציוד וחומרי משרד',
  TRAVEL:       'נסיעות ותחבורה',
  MEALS:        'ארוחות ובידור',
  PROFESSIONAL: 'שירותים מקצועיים',
  MARKETING:    'שיווק ופרסום',
  RENT:         'שכירות ואחזקה',
  UTILITIES:    'חשמל, מים, תקשורת',
  INSURANCE:    'ביטוח',
  SALARY:       'שכר ותשלומים לעובדים',
  SOFTWARE:     'תוכנה ומנויים דיגיטליים',
  OTHER:        'אחר',
} as const

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES
