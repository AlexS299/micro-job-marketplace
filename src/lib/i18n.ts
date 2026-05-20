export type Locale = 'he' | 'en' | 'ru'
export const LOCALES: { value: Locale; label: string; nativeLabel: string; dir: 'rtl' | 'ltr' }[] = [
  { value: 'he', label: 'עברית',  nativeLabel: 'עברית',   dir: 'rtl' },
  { value: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { value: 'ru', label: 'Русский', nativeLabel: 'Русский', dir: 'ltr' },
]

export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

const T = {
  he: {
    // Nav
    home: 'בית', invoices: 'חשבוניות', quotes: 'הצעות מחיר', expenses: 'הוצאות',
    clients: 'לקוחות', payments: 'סליקה', bank: 'בנק', payroll: 'שכר',
    tax: 'מרכז מס', vatReport: 'מע"מ', reports: 'דוחות', team: 'צוות',
    chat: "צ'אט AI", alerts: 'התראות', whatsapp: 'WhatsApp',
    billing: 'חיוב', settings: 'הגדרות', import: 'ייבוא נתונים', logout: 'יציאה',
    // Actions
    save: 'שמור', cancel: 'ביטול', delete: 'מחק', add: 'הוסף', edit: 'ערוך',
    back: '← חזרה', next: 'המשך →', close: 'סגור', send: 'שלח', confirm: 'אישור',
    upload: 'העלה קובץ', download: 'הורד', preview: 'תצוגה מקדימה',
    // Status
    loading: 'טוען...', saving: 'שומר...', success: 'נשמר בהצלחה', error: 'שגיאה',
    // Login
    login: 'כניסה', register: 'הרשמה', email: 'דואר אלקטרוני', password: 'סיסמה',
    fullName: 'שם מלא', signInGoogle: 'כניסה עם Google',
    loginError: 'אימייל או סיסמה שגויים',
    // Onboarding
    onboarding_title: 'בוא נגדיר את העסק שלך',
    onboarding_subtitle: 'לוקח פחות מדקה',
    onboarding_business_q: 'מה שם העסק?',
    onboarding_tax_q: 'סוג העוסק',
    onboarding_lang_q: 'שפת הממשק',
    onboarding_enter: 'כניסה לדשבורד',
    onboarding_change_later: 'ניתן לשנות את כל הפרטים בהמשך',
    // Import
    import_title: 'ייבוא נתונים', import_desc: 'העלה קובץ מתוכנת הנהלת חשבונות קיימת',
    import_clients: 'לקוחות', import_invoices: 'חשבוניות', import_expenses: 'הוצאות',
    import_template: 'הורד תבנית', import_success: 'יובאו {n} רשומות בהצלחה',
    import_unified: 'קובץ אחיד (כל הנתונים)',
  },
  en: {
    home: 'Home', invoices: 'Invoices', quotes: 'Quotes', expenses: 'Expenses',
    clients: 'Clients', payments: 'Payments', bank: 'Bank', payroll: 'Payroll',
    tax: 'Tax Center', vatReport: 'VAT', reports: 'Reports', team: 'Team',
    chat: 'AI Chat', alerts: 'Alerts', whatsapp: 'WhatsApp',
    billing: 'Billing', settings: 'Settings', import: 'Import Data', logout: 'Log out',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', add: 'Add', edit: 'Edit',
    back: '← Back', next: 'Next →', close: 'Close', send: 'Send', confirm: 'Confirm',
    upload: 'Upload File', download: 'Download', preview: 'Preview',
    loading: 'Loading...', saving: 'Saving...', success: 'Saved successfully', error: 'Error',
    login: 'Sign In', register: 'Register', email: 'Email', password: 'Password',
    fullName: 'Full Name', signInGoogle: 'Sign in with Google',
    loginError: 'Invalid email or password',
    onboarding_title: "Let's set up your business",
    onboarding_subtitle: 'Takes less than a minute',
    onboarding_business_q: 'What is your business name?',
    onboarding_tax_q: 'Business type',
    onboarding_lang_q: 'Interface language',
    onboarding_enter: 'Go to Dashboard',
    onboarding_change_later: 'You can change these settings later',
    import_title: 'Import Data', import_desc: 'Upload a file from your existing accounting software',
    import_clients: 'Clients', import_invoices: 'Invoices', import_expenses: 'Expenses',
    import_template: 'Download Template', import_success: '{n} records imported successfully',
    import_unified: 'Unified File (all data)',
  },
  ru: {
    home: 'Главная', invoices: 'Счета', quotes: 'Предложения', expenses: 'Расходы',
    clients: 'Клиенты', payments: 'Оплата', bank: 'Банк', payroll: 'Зарплата',
    tax: 'Налоги', vatReport: 'НДС', reports: 'Отчёты', team: 'Команда',
    chat: 'ИИ чат', alerts: 'Уведомления', whatsapp: 'WhatsApp',
    billing: 'Тариф', settings: 'Настройки', import: 'Импорт данных', logout: 'Выйти',
    save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', add: 'Добавить', edit: 'Изменить',
    back: '← Назад', next: 'Далее →', close: 'Закрыть', send: 'Отправить', confirm: 'Подтвердить',
    upload: 'Загрузить файл', download: 'Скачать', preview: 'Предпросмотр',
    loading: 'Загрузка...', saving: 'Сохранение...', success: 'Сохранено', error: 'Ошибка',
    login: 'Войти', register: 'Регистрация', email: 'Эл. почта', password: 'Пароль',
    fullName: 'Полное имя', signInGoogle: 'Войти через Google',
    loginError: 'Неверный email или пароль',
    onboarding_title: 'Настройка вашего бизнеса',
    onboarding_subtitle: 'Займёт меньше минуты',
    onboarding_business_q: 'Название вашего бизнеса',
    onboarding_tax_q: 'Тип налогоплательщика',
    onboarding_lang_q: 'Язык интерфейса',
    onboarding_enter: 'Перейти в дашборд',
    onboarding_change_later: 'Вы можете изменить настройки позже',
    import_title: 'Импорт данных', import_desc: 'Загрузите файл из вашей бухгалтерской программы',
    import_clients: 'Клиенты', import_invoices: 'Счета', import_expenses: 'Расходы',
    import_template: 'Скачать шаблон', import_success: 'Импортировано {n} записей',
    import_unified: 'Единый файл (все данные)',
  },
} as const

export type TranslationKey = keyof typeof T.he

export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  const dict = T[locale] ?? T.he
  let str = (dict as Record<string, string>)[key] ?? (T.he as Record<string, string>)[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}
