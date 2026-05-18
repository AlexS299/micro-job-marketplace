'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Calculator, CheckCircle, Download,
  ChevronRight, ChevronLeft, Briefcase, X, Info
} from 'lucide-react'
import { clsx } from 'clsx'
import { calculatePayroll, formatILS, getMonthName } from '@/lib/payroll'

interface Employee {
  id: string
  firstName: string
  lastName: string
  idNumber: string
  email: string | null
  phone: string | null
  jobTitle: string | null
  employeeType: string
  grossSalary: number
  taxCreditPoints: number
  includePension: boolean
  includeKeren: boolean
  isActive: boolean
}

interface EmployeePayroll {
  id: string
  employee: Employee
  grossSalary: number
  bonus: number
  incomeTax: number
  nationalInsEmp: number
  healthTaxEmp: number
  pensionEmp: number
  kerenEmp: number
  totalDeductions: number
  netSalary: number
  nationalInsEmployer: number
  pensionEmployer: number
  severanceEmployer: number
  kerenEmployer: number
  totalEmployerCost: number
}

interface PayrollRun {
  id: string
  month: number
  year: number
  status: string
  totalGross: number
  totalNet: number
  totalTax: number
  totalNI: number
  totalEmployerCost: number
  employees: EmployeePayroll[]
}

const EMPLOYEE_TYPES: Record<string, string> = {
  FULL_TIME: 'משרה מלאה',
  PART_TIME: 'משרה חלקית',
  HOURLY: 'שעתי',
}

function AddEmployeeModal({ onSave, onClose }: {
  onSave: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', idNumber: '',
    email: '', phone: '', jobTitle: '',
    employeeType: 'FULL_TIME', grossSalary: '',
    taxCreditPoints: '2.25', startDate: new Date().toISOString().slice(0, 10),
    bankName: '', bankAccount: '', bankBranch: '',
    includePension: true, includeKeren: false,
  })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof calculatePayroll> | null>(null)

  useEffect(() => {
    if (form.grossSalary) {
      setPreview(calculatePayroll({
        grossSalary: Number(form.grossSalary),
        taxCreditPoints: Number(form.taxCreditPoints),
        includePension: form.includePension,
        includeKeren: form.includeKeren,
      }))
    } else {
      setPreview(null)
    }
  }, [form.grossSalary, form.taxCreditPoints, form.includePension, form.includeKeren])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    onSave()
  }

  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-slate-900 text-lg">הוספת עובד חדש</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSave} id="emp-form">
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם פרטי *</label>
                <input required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.firstName} onChange={e => f('firstName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם משפחה *</label>
                <input required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.lastName} onChange={e => f('lastName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">תעודת זהות *</label>
                <input required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.idNumber} onChange={e => f('idNumber', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">תפקיד</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.jobTitle} onChange={e => f('jobTitle', e.target.value)} placeholder="מפתח תוכנה" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">אימייל</label>
                <input type="email" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.email} onChange={e => f('email', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">טלפון</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.phone} onChange={e => f('phone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">סוג העסקה</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" value={form.employeeType} onChange={e => f('employeeType', e.target.value)}>
                  {Object.entries(EMPLOYEE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">תאריך תחילת עבודה *</label>
                <input required type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.startDate} onChange={e => f('startDate', e.target.value)} />
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-700 text-sm mb-3">תנאי שכר</h4>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שכר ברוטו חודשי (₪) *</label>
                <input required type="number" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.grossSalary} onChange={e => f('grossSalary', e.target.value)} placeholder="15000" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block flex items-center gap-1">
                  נקודות זיכוי
                  <span className="text-slate-400 text-[10px]">(ברירת מחדל 2.25)</span>
                </label>
                <input type="number" step="0.25" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.taxCreditPoints} onChange={e => f('taxCreditPoints', e.target.value)} />
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includePension} onChange={e => f('includePension', e.target.checked)} className="rounded" />
                  <span className="text-sm text-slate-700">פנסיה חובה</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includeKeren} onChange={e => f('includeKeren', e.target.checked)} className="rounded" />
                  <span className="text-sm text-slate-700">קרן השתלמות</span>
                </label>
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-700 text-sm mb-3">פרטי בנק לתשלום</h4>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">בנק</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.bankName} onChange={e => f('bankName', e.target.value)} placeholder="בנק הפועלים" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">מספר חשבון</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={form.bankAccount} onChange={e => f('bankAccount', e.target.value)} />
              </div>

              {/* Live preview */}
              {preview && (
                <div className="col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" /> תצוגה מקדימה — חישוב חודשי
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-500">שכר נטו</p>
                      <p className="font-bold text-green-700 text-base">{formatILS(preview.netSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">ניכויים</p>
                      <p className="font-bold text-red-600 text-base">{formatILS(preview.totalDeductions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">עלות מעסיק</p>
                      <p className="font-bold text-slate-800 text-base">{formatILS(preview.totalEmployerCost)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {[
                      { label: 'מס הכנסה', val: preview.incomeTax },
                      { label: 'ביטוח לאומי (עובד)', val: preview.nationalInsEmp },
                      { label: 'מס בריאות', val: preview.healthTaxEmp },
                      ...(preview.pensionEmp > 0 ? [{ label: 'פנסיה (עובד)', val: preview.pensionEmp }] : []),
                      ...(preview.kerenEmp > 0 ? [{ label: 'קרן השתלמות (עובד)', val: preview.kerenEmp }] : []),
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-xs text-slate-600">
                        <span>{row.label}</span>
                        <span className="font-medium">{formatILS(row.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
          <button form="emp-form" type="submit" disabled={saving}
            className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {saving ? 'שומר...' : 'הוסף עובד'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600">ביטול</button>
        </div>
      </div>
    </div>
  )
}

function PayslipCard({ ep }: { ep: EmployeePayroll }) {
  const [open, setOpen] = useState(false)
  const emp = ep.employee
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
      >
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-700 font-bold text-sm">{emp.firstName[0]}{emp.lastName[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
          <p className="text-xs text-slate-400">{emp.jobTitle || EMPLOYEE_TYPES[emp.employeeType]}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-700">{formatILS(ep.netSalary)}</p>
          <p className="text-xs text-slate-400">נטו</p>
        </div>
        <ChevronRight className={clsx('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open && '-rotate-90')} />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'ברוטו', val: ep.grossSalary, color: 'text-slate-800' },
              ...(ep.bonus > 0 ? [{ label: 'בונוס', val: ep.bonus, color: 'text-slate-800' }] : []),
              { label: 'מס הכנסה', val: -ep.incomeTax, color: 'text-red-600' },
              { label: 'ביטוח לאומי', val: -ep.nationalInsEmp, color: 'text-red-600' },
              { label: 'מס בריאות', val: -ep.healthTaxEmp, color: 'text-red-600' },
              ...(ep.pensionEmp > 0 ? [{ label: 'פנסיה עובד', val: -ep.pensionEmp, color: 'text-amber-600' }] : []),
              ...(ep.kerenEmp > 0 ? [{ label: 'קרן השתלמות', val: -ep.kerenEmp, color: 'text-amber-600' }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{row.label}</span>
                <span className={clsx('font-medium', row.color)}>
                  {row.val < 0 ? `-${formatILS(Math.abs(row.val))}` : formatILS(row.val)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-2 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">שכר נטו לתשלום</span>
              <span className="text-green-700">{formatILS(ep.netSalary)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">עלות מעסיק כוללת</span>
              <span className="font-medium text-slate-700">{formatILS(ep.totalEmployerCost)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PayrollPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [tab, setTab] = useState<'payroll' | 'employees'>('payroll')

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/employees')
    if (res.ok) setEmployees(await res.json())
  }, [])

  const loadRun = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/payroll/run?month=${month}&year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setRun(data[0] || null)
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => { loadEmployees(); loadRun() }, [loadEmployees, loadRun])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1);  setYear(y => y + 1) } else setMonth(m => m + 1) }

  async function runPayroll() {
    setCalculating(true)
    const res = await fetch('/api/payroll/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    if (res.ok) setRun(await res.json())
    setCalculating(false)
  }

  async function approvePayroll() {
    if (!run) return
    const res = await fetch('/api/payroll/run', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: run.id }),
    })
    if (res.ok) setRun(await res.json())
  }

  const activeCount = employees.filter(e => e.isActive).length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-700" />
            חישוב שכר
          </h1>
          <p className="text-slate-500 text-sm mt-1">{activeCount} עובדים פעילים</p>
        </div>
        <button
          onClick={() => setShowAddEmployee(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800"
        >
          <Plus className="w-4 h-4" /> הוסף עובד
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {(['payroll', 'employees'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t === 'payroll' ? 'הפקת שכר' : 'ניהול עובדים'}
          </button>
        ))}
      </div>

      {tab === 'payroll' && (
        <>
          {/* Month selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{getMonthName(month)} {year}</p>
              {run && (
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                  run.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {run.status === 'APPROVED' ? 'מאושר' : 'טיוטה'}
                </span>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {activeCount === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">אין עובדים עדיין</p>
              <button onClick={() => setShowAddEmployee(true)} className="mt-3 text-blue-700 text-sm hover:underline">
                הוסף עובד ראשון
              </button>
            </div>
          ) : (
            <>
              {/* Calculate button */}
              {!run && (
                <button
                  onClick={runPayroll}
                  disabled={calculating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-xl font-medium mb-6 hover:bg-blue-800 disabled:opacity-50"
                >
                  <Calculator className="w-5 h-5" />
                  {calculating ? 'מחשב...' : `חשב שכר ל${getMonthName(month)}`}
                </button>
              )}

              {run && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'סה"כ ברוטו', val: run.totalGross, color: 'text-slate-800' },
                      { label: 'סה"כ נטו', val: run.totalNet, color: 'text-green-700' },
                      { label: 'סה"כ מס', val: run.totalTax, color: 'text-red-600' },
                      { label: 'עלות מעסיק', val: run.totalEmployerCost, color: 'text-blue-700' },
                    ].map(card => (
                      <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                        <p className={clsx('font-bold text-base', card.color)}>{formatILS(card.val)}</p>
                      </div>
                    ))}
                  </div>

                  {/* BI notice */}
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 text-sm text-blue-700">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      יש לשלם ביטוח לאומי ומקדמות מס הכנסה עד ה-15 בחודש הבא.
                      ביטוח לאומי: {formatILS(run.totalNI)} | מס הכנסה: {formatILS(run.totalTax)}
                    </span>
                  </div>

                  {/* Pay slips */}
                  <div className="space-y-3 mb-6">
                    {run.employees.map(ep => <PayslipCard key={ep.id} ep={ep} />)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {run.status === 'DRAFT' && (
                      <button
                        onClick={approvePayroll}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"
                      >
                        <CheckCircle className="w-5 h-5" /> אשר שכר
                      </button>
                    )}
                    <button
                      onClick={runPayroll}
                      disabled={calculating || run.status === 'APPROVED'}
                      className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Calculator className="w-4 h-4" /> חשב מחדש
                    </button>
                    <button className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl text-sm hover:bg-slate-50">
                      <Download className="w-4 h-4" /> ייצא
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'employees' && (
        <div className="space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>אין עובדים עדיין</p>
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{emp.firstName[0]}{emp.lastName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-slate-400">{emp.jobTitle || EMPLOYEE_TYPES[emp.employeeType]} · ת.ז {emp.idNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-800">{formatILS(emp.grossSalary)}</p>
                  <p className="text-xs text-slate-400">ברוטו/חודש</p>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded-full font-medium flex-shrink-0',
                  emp.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {emp.isActive ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {showAddEmployee && (
        <AddEmployeeModal
          onSave={async () => { await loadEmployees(); setShowAddEmployee(false) }}
          onClose={() => setShowAddEmployee(false)}
        />
      )}
    </div>
  )
}
