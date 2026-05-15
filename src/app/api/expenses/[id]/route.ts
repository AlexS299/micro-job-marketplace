import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const expense = await db.expense.update({
      where: { id: params.id },
      data: {
        vendor: body.vendor,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        subtotal: body.subtotal !== undefined ? Number(body.subtotal) : undefined,
        vatAmount: body.vatAmount !== undefined ? Number(body.vatAmount) : undefined,
        total: body.total !== undefined ? Number(body.total) : undefined,
        category: body.category,
        receiptNumber: body.receiptNumber,
        vatDeductible: body.vatDeductible,
        vatDeductiblePercent: body.vatDeductiblePercent !== undefined ? Number(body.vatDeductiblePercent) : undefined,
        status: body.status,
        notes: body.notes,
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בעדכון הוצאה' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה במחיקת הוצאה' }, { status: 500 })
  }
}
