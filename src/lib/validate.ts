import { z } from 'zod'
import { NextResponse } from 'next/server'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function validationError(errors: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: 'validation_error', details: errors.flatten().fieldErrors },
    { status: 400 }
  )
}

export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try { raw = await req.json() }
  catch { return { data: null, error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) } }

  const result = schema.safeParse(raw)
  if (!result.success) return { data: null, error: validationError(result.error) }
  return { data: result.data, error: null }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const InvoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity:    z.number().positive().max(100000),
  unitPrice:   z.number().min(0).max(10_000_000),
  vatIncluded: z.boolean().optional().default(false),
})

export const InvoiceCreateSchema = z.object({
  clientId:     z.string().cuid().optional().nullable(),
  type:         z.enum(['TAX_INVOICE', 'TAX_INVOICE_RECEIPT', 'RECEIPT', 'CREDIT_INVOICE', 'PROFORMA']).default('TAX_INVOICE'),
  issueDate:    z.string().datetime().optional(),
  dueDate:      z.string().datetime().optional().nullable(),
  currency:     z.enum(['ILS', 'USD', 'EUR']).default('ILS'),
  notes:        z.string().max(2000).optional().nullable(),
  items:        z.array(InvoiceItemSchema).min(1).max(100),
  vatRate:      z.number().min(0).max(1).optional(),
})

export const InvoiceUpdateSchema = InvoiceCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']).optional(),
})

export const ExpenseCreateSchema = z.object({
  vendor:              z.string().max(200).optional().nullable(),
  description:         z.string().max(1000).optional().nullable(),
  date:                z.string().datetime(),
  subtotal:            z.number().min(0).max(100_000_000),
  vatAmount:           z.number().min(0).max(100_000_000),
  total:               z.number().min(0).max(100_000_000),
  category:            z.enum(['OFFICE','FOOD','TRAVEL','SOFTWARE','RENT','SALARY','MARKETING','PROFESSIONAL','OTHER']).default('OTHER'),
  receiptNumber:       z.string().max(100).optional().nullable(),
  vatDeductible:       z.boolean().default(true),
  vatDeductiblePercent:z.number().min(0).max(100).default(100),
  notes:               z.string().max(2000).optional().nullable(),
})

export const ClientCreateSchema = z.object({
  name:          z.string().min(1).max(200),
  vatNumber:     z.string().max(20).optional().nullable(),
  idNumber:      z.string().max(20).optional().nullable(),
  address:       z.string().max(300).optional().nullable(),
  city:          z.string().max(100).optional().nullable(),
  email:         z.string().email().optional().nullable().or(z.literal('')),
  phone:         z.string().max(20).optional().nullable(),
  notes:         z.string().max(2000).optional().nullable(),
})

export const EmployeeCreateSchema = z.object({
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().min(1).max(100),
  idNumber:       z.string().min(5).max(20),
  email:          z.string().email().optional().nullable().or(z.literal('')),
  phone:          z.string().max(20).optional().nullable(),
  startDate:      z.string().datetime(),
  jobTitle:       z.string().max(100).optional().nullable(),
  employeeType:   z.enum(['FULL_TIME','PART_TIME','HOURLY','CONTRACT']).default('FULL_TIME'),
  grossSalary:    z.number().min(0).max(1_000_000),
  taxCreditPoints:z.number().min(0).max(20).default(2.25),
  includePension: z.boolean().default(true),
  includeKeren:   z.boolean().default(false),
  bankAccount:    z.string().max(20).optional().nullable(),
  bankBranch:     z.string().max(10).optional().nullable(),
  bankName:       z.string().max(100).optional().nullable(),
})

export const BusinessSettingsSchema = z.object({
  name:             z.string().min(1).max(200).optional(),
  vatNumber:        z.string().max(20).optional().nullable(),
  businessNumber:   z.string().max(20).optional().nullable(),
  address:          z.string().max(300).optional().nullable(),
  city:             z.string().max(100).optional().nullable(),
  phone:            z.string().max(20).optional().nullable(),
  email:            z.string().email().optional().nullable().or(z.literal('')),
  bankAccount:      z.string().max(30).optional().nullable(),
  bankName:         z.string().max(100).optional().nullable(),
  taxType:          z.enum(['OSEK_MURSHEH','OSEK_PATUR','OSEK_ZAIR','COMPANY','PARTNERSHIP']).optional(),
  vatReportPeriod:  z.enum(['MONTHLY','BIMONTHLY']).optional(),
  whatsappPhone:    z.string().max(20).optional().nullable(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128),
})

export const PayrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year:  z.number().int().min(2020).max(2030),
})
