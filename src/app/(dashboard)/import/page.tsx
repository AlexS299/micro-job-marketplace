'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ImportType = 'clients' | 'expenses' | 'invoices'

interface PreviewRow { [key: string]: string }

const TYPE_LABELS: Record<ImportType, string> = {
  clients:  'לקוחות',
  expenses: 'הוצאות',
  invoices: 'חשבוניות',
}

const TYPE_DESC: Record<ImportType, string> = {
  clients:  'שם, מייל, טלפון, מספר עוסק, עיר',
  expenses: 'ספק, תיאור, תאריך, סכום, קטגוריה',
  invoices: 'הורד תבנית בלבד — ייבוא חשבוניות בקרוב',
}

const SUPPORTED_SOFTWARE = [
  { name: 'חשבשבת',       note: 'ייצא לאקסל, השתמש בעמודה הראשונה' },
  { name: 'ריווחית/iCount', note: 'ייצא CSV מלקוחות/הוצאות' },
  { name: 'Priority',      note: 'ייצא דוח לאקסל' },
  { name: 'QuickBooks',    note: 'ייצא לקוחות / הוצאות ל-CSV' },
  { name: 'Excel ידני',    note: 'כל קובץ עם כותרות בעמודה ראשונה' },
]

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('clients')
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<PreviewRow[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [uploading, setUploading]   = useState(false)
  const [result, setResult]         = useState<{ imported: number; total: number } | null>(null)
  const [error, setError]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const readPreview = async (f: File) => {
    const text = await f.text()
    // Simple CSV preview — first 5 rows
    if (f.name.endsWith('.csv')) {
      const lines = text.split('\n').filter(Boolean).slice(0, 6)
      if (lines.length < 2) return
      const hdrs = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
      setHeaders(hdrs)
      setPreview(lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
        return Object.fromEntries(hdrs.map((h, i) => [h, vals[i] ?? '']))
      }))
    } else {
      setHeaders([])
      setPreview([])
    }
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setResult(null)
    setError('')
    await readPreview(f)
  }

  const doImport = async () => {
    if (!file) return
    if (importType === 'invoices') { setError('ייבוא חשבוניות יתווסף בקרוב'); return }
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', importType)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const d = await res.json() as { ok?: boolean; imported?: number; total?: number; error?: string }
    if (d.ok) {
      setResult({ imported: d.imported ?? 0, total: d.total ?? 0 })
      setFile(null)
      setPreview([])
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setError(d.error ?? 'שגיאה בייבוא')
    }
    setUploading(false)
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ייבוא נתונים</h1>
        <p className="text-slate-500 mt-1">העלה קובץ מתוכנת הנהלת חשבונות קיימת</p>
      </div>

      {/* Supported software */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">תוכנות נתמכות</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_SOFTWARE.map(s => (
            <div key={s.name} className="bg-white rounded-lg p-2.5 text-xs">
              <p className="font-semibold text-slate-800">{s.name}</p>
              <p className="text-slate-500 mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Type selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800">מה לייבא?</h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TYPE_LABELS) as [ImportType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setImportType(key); setFile(null); setPreview([]); setResult(null); setError('') }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${importType === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <FileSpreadsheet className={`w-6 h-6 ${importType === key ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-800">{label}</span>
              <span className="text-xs text-slate-500 text-center leading-tight">{TYPE_DESC[key]}</span>
            </button>
          ))}
        </div>

        {/* Template download */}
        <a
          href={`/api/import?type=${importType}`}
          download
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Download className="w-4 h-4" />
          הורד תבנית CSV עבור {TYPE_LABELS[importType]}
        </a>

        {/* File upload */}
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">גרור קובץ לכאן או לחץ לבחירה</p>
          <p className="text-slate-400 text-xs mt-1">CSV, Excel (.xlsx, .xls)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.ods"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-slate-700">{file.name}</span>
            <span className="text-slate-400 text-xs mr-auto">{Math.round(file.size / 1024)} KB</span>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && headers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">תצוגה מקדימה (5 שורות ראשונות)</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="text-xs w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {headers.map(h => <th key={h} className="px-3 py-2 text-right font-medium text-slate-600 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {headers.map(h => <td key={h} className="px-3 py-2 text-slate-700 truncate max-w-[150px]">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            יובאו {result.imported} מתוך {result.total} רשומות בהצלחה
          </div>
        )}

        {file && importType !== 'invoices' && (
          <button
            onClick={doImport}
            disabled={uploading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {uploading ? 'מייבא...' : `ייבא ${TYPE_LABELS[importType]}`}
          </button>
        )}
      </div>
    </div>
  )
}
