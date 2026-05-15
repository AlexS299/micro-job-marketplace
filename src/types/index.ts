// TypeScript types matching Prisma schema for client-side use

export type TaxType = 'OSEK_MURSHEH' | 'OSEK_PATUR' | 'CHEVRA_BEM'
export type VATReportPeriodType = 'MONTHLY' | 'BIMONTHLY'
export type InvoiceType = 'TAX_INVOICE' | 'RECEIPT' | 'COMBINED' | 'CREDIT_NOTE'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type VATReportStatus = 'DRAFT' | 'SUBMITTED' | 'PAID'
export type TransactionCategory =
  | 'INCOME'
  | 'EXPENSE'
  | 'VAT'
  | 'SALARY'
  | 'TAX'
  | 'TRANSFER'
  | 'OTHER'

export interface Business {
  id: string
  name: string
  vatNumber?: string | null
  businessNumber?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  bankAccount?: string | null
  bankName?: string | null
  taxType: TaxType
  vatReportPeriod: VATReportPeriodType
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  businessId: string
  name: string
  vatNumber?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    invoices: number
  }
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  vatIncluded: boolean
}

export interface Invoice {
  id: string
  businessId: string
  clientId?: string | null
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  issueDate: Date
  dueDate?: Date | null
  currency: string
  subtotal: number
  vatAmount: number
  vatRate: number
  total: number
  notes?: string | null
  pdfUrl?: string | null
  emailSentAt?: Date | null
  paidAt?: Date | null
  createdAt: Date
  updatedAt: Date
  items: InvoiceItem[]
  client?: Client | null
}

export interface BankAccount {
  id: string
  businessId: string
  bankName: string
  accountNumber: string
  branchNumber?: string | null
  currency: string
  balance: number
  lastSyncAt?: Date | null
  createdAt: Date
}

export interface BankTransaction {
  id: string
  bankAccountId: string
  date: Date
  description: string
  amount: number
  balance?: number | null
  category?: TransactionCategory | null
  reference?: string | null
  invoiceId?: string | null
  isReconciled: boolean
  notes?: string | null
  createdAt: Date
  bankAccount?: BankAccount
}

export interface VATReport {
  id: string
  businessId: string
  periodStart: Date
  periodEnd: Date
  outputVAT: number
  inputVAT: number
  vatOwed: number
  status: VATReportStatus
  submittedAt?: Date | null
  reportData?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolUse?: string | null
  createdAt: Date
}

// Dashboard types
export interface DashboardStats {
  revenueThisMonth: number
  revenueLastMonth: number
  outstandingInvoices: number
  outstandingCount: number
  vatDue: number
  bankBalance: number
  monthlyRevenue: MonthlyRevenue[]
  recentInvoices: Invoice[]
  recentTransactions: BankTransaction[]
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  expenses: number
}

// Form types
export interface CreateInvoiceInput {
  clientId?: string
  clientName?: string
  type: InvoiceType
  dueDate?: string
  notes?: string
  items: CreateInvoiceItemInput[]
}

export interface CreateInvoiceItemInput {
  description: string
  quantity: number
  unitPrice: number
  vatIncluded?: boolean
}

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
  vatNumber?: string
  idNumber?: string
  address?: string
  city?: string
  notes?: string
}

// Status display helpers
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'טיוטה',
  SENT: 'נשלח',
  PAID: 'שולם',
  OVERDUE: 'באיחור',
  CANCELLED: 'בוטל',
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  TAX_INVOICE: 'חשבונית מס',
  RECEIPT: 'קבלה',
  COMBINED: 'חשבונית מס / קבלה',
  CREDIT_NOTE: 'זיכוי',
}

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}
