// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up
  await prisma.chatMessage.deleteMany()
  await prisma.bankTransaction.deleteMany()
  await prisma.bankAccount.deleteMany()
  await prisma.vatReport.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.client.deleteMany()
  await prisma.business.deleteMany()

  // ─── Business ────────────────────────────────────────────────────────────────
  const business = await prisma.business.create({
    data: {
      name: 'טכנולוגיות בר-לב בע"מ',
      vatNumber: '514123456',
      businessNumber: '514123456',
      address: 'רחוב הרצל 45',
      city: 'תל אביב',
      phone: '03-5551234',
      email: 'info@barlev-tech.co.il',
      bankAccount: '12-345-678901',
      bankName: 'בנק הפועלים',
      taxType: 'OSEK_MURSHEH',
      vatReportPeriod: 'BIMONTHLY',
    },
  })
  console.log(`✅ Business created: ${business.name}`)

  // ─── Clients ─────────────────────────────────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      businessId: business.id,
      name: 'חברת אלפא בע"מ',
      vatNumber: '512345678',
      email: 'accounts@alpha.co.il',
      phone: '03-7654321',
      address: 'דרך בגין 132',
      city: 'תל אביב',
    },
  })

  const client2 = await prisma.client.create({
    data: {
      businessId: business.id,
      name: 'ישראל כהן - עצמאי',
      idNumber: '123456789',
      email: 'israel.cohen@gmail.com',
      phone: '054-1234567',
      city: 'ירושלים',
    },
  })

  const client3 = await prisma.client.create({
    data: {
      businessId: business.id,
      name: 'מגדלי הים הבינלאומי בע"מ',
      vatNumber: '513987654',
      email: 'finance@yamsea.co.il',
      phone: '04-8765432',
      address: 'שדרות בן-גוריון 14',
      city: 'חיפה',
    },
  })
  console.log(`✅ 3 clients created`)

  // ─── Invoices ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  // Invoice 1 - Paid
  const inv1 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId: client1.id,
      invoiceNumber: `INV-${now.getFullYear()}-001`,
      type: 'TAX_INVOICE',
      status: 'PAID',
      issueDate: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 5),
      dueDate: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth() + 1, 5),
      paidAt: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 20),
      currency: 'ILS',
      subtotal: 5000,
      vatAmount: 900,
      vatRate: 0.18,
      total: 5900,
      notes: 'פיתוח אפליקציית ניהול - שלב ראשון',
      items: {
        create: [
          {
            description: 'פיתוח Frontend - React',
            quantity: 30,
            unitPrice: 120,
            total: 3600,
            vatIncluded: false,
          },
          {
            description: 'פיתוח Backend - Node.js',
            quantity: 14,
            unitPrice: 100,
            total: 1400,
            vatIncluded: false,
          },
        ],
      },
    },
  })

  // Invoice 2 - Paid
  const inv2 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId: client3.id,
      invoiceNumber: `INV-${now.getFullYear()}-002`,
      type: 'COMBINED',
      status: 'PAID',
      issueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10),
      dueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 10),
      paidAt: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 25),
      currency: 'ILS',
      subtotal: 8500,
      vatAmount: 1530,
      vatRate: 0.18,
      total: 10030,
      notes: 'ייעוץ טכנולוגי - ינואר',
      items: {
        create: [
          {
            description: 'ייעוץ אסטרטגי טכנולוגי',
            quantity: 10,
            unitPrice: 500,
            total: 5000,
            vatIncluded: false,
          },
          {
            description: 'כתיבת מסמך ארכיטקטורה',
            quantity: 1,
            unitPrice: 3500,
            total: 3500,
            vatIncluded: false,
          },
        ],
      },
    },
  })

  // Invoice 3 - Sent (outstanding)
  const inv3 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId: client1.id,
      invoiceNumber: `INV-${now.getFullYear()}-003`,
      type: 'TAX_INVOICE',
      status: 'SENT',
      issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      currency: 'ILS',
      subtotal: 12000,
      vatAmount: 2160,
      vatRate: 0.18,
      total: 14160,
      notes: 'פיתוח מודול CRM - שלב שני',
      items: {
        create: [
          {
            description: 'פיתוח מודול לקוחות',
            quantity: 50,
            unitPrice: 150,
            total: 7500,
            vatIncluded: false,
          },
          {
            description: 'אינטגרציה עם מערכת קיימת',
            quantity: 30,
            unitPrice: 150,
            total: 4500,
            vatIncluded: false,
          },
        ],
      },
    },
  })

  // Invoice 4 - Overdue
  const inv4 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId: client2.id,
      invoiceNumber: `INV-${now.getFullYear()}-004`,
      type: 'TAX_INVOICE',
      status: 'OVERDUE',
      issueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 15),
      dueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15),
      currency: 'ILS',
      subtotal: 2500,
      vatAmount: 450,
      vatRate: 0.18,
      total: 2950,
      notes: 'בניית אתר אינטרנט',
      items: {
        create: [
          {
            description: 'עיצוב ובניית אתר WordPress',
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
            vatIncluded: false,
          },
        ],
      },
    },
  })

  // Invoice 5 - Draft
  const inv5 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId: client3.id,
      invoiceNumber: `INV-${now.getFullYear()}-005`,
      type: 'TAX_INVOICE',
      status: 'DRAFT',
      issueDate: now,
      currency: 'ILS',
      subtotal: 6000,
      vatAmount: 1080,
      vatRate: 0.18,
      total: 7080,
      items: {
        create: [
          {
            description: 'תחזוקה חודשית - מאי 2025',
            quantity: 1,
            unitPrice: 4000,
            total: 4000,
            vatIncluded: false,
          },
          {
            description: 'תמיכה טכנית - 20 שעות',
            quantity: 20,
            unitPrice: 100,
            total: 2000,
            vatIncluded: false,
          },
        ],
      },
    },
  })
  console.log(`✅ 5 invoices created`)

  // ─── Bank Account & Transactions ──────────────────────────────────────────────
  const bankAccount = await prisma.bankAccount.create({
    data: {
      businessId: business.id,
      bankName: 'בנק הפועלים',
      accountNumber: '678901',
      branchNumber: '345',
      currency: 'ILS',
      balance: 47250,
      lastSyncAt: now,
    },
  })

  const transactions = [
    {
      date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 20),
      description: `תשלום חשבונית ${inv1.invoiceNumber} - חברת אלפא`,
      amount: 5900,
      category: 'INCOME',
      balance: 23500,
      invoiceId: inv1.id,
      isReconciled: true,
    },
    {
      date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 22),
      description: 'שכר דירה משרד - מרץ',
      amount: -4500,
      category: 'EXPENSE',
      balance: 19000,
      isReconciled: true,
    },
    {
      date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 28),
      description: 'תשלום מע"מ - ינואר-פברואר',
      amount: -1800,
      category: 'VAT',
      balance: 17200,
      isReconciled: true,
    },
    {
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5),
      description: 'רכישת ציוד מחשב',
      amount: -3200,
      category: 'EXPENSE',
      balance: 14000,
      isReconciled: true,
    },
    {
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 25),
      description: `תשלום חשבונית ${inv2.invoiceNumber} - מגדלי הים`,
      amount: 10030,
      category: 'INCOME',
      balance: 24030,
      invoiceId: inv2.id,
      isReconciled: true,
    },
    {
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 28),
      description: 'מנוי Adobe Creative Cloud',
      amount: -250,
      category: 'EXPENSE',
      balance: 23780,
      isReconciled: true,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      description: 'שכר דירה משרד - מאי',
      amount: -4500,
      category: 'EXPENSE',
      balance: 19280,
      isReconciled: false,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 7),
      description: 'שירותי חשבונאות - רואה חשבון',
      amount: -800,
      category: 'EXPENSE',
      balance: 18480,
      isReconciled: false,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      description: 'חיוב Wix Business',
      amount: -180,
      category: 'EXPENSE',
      balance: 18300,
      isReconciled: false,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 12),
      description: 'הכנסה - עבודה נוספת ישראל כהן',
      amount: 1500,
      category: 'INCOME',
      balance: 19800,
      isReconciled: false,
    },
  ]

  for (const tx of transactions) {
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        ...tx,
      },
    })
  }
  console.log(`✅ ${transactions.length} bank transactions created`)

  // ─── VAT Report ───────────────────────────────────────────────────────────────
  const vatReport = await prisma.vatReport.create({
    data: {
      businessId: business.id,
      periodStart: twoMonthsAgo,
      periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 0),
      outputVAT: 900, // From invoice 1
      inputVAT: 576, // From expenses
      vatOwed: 324,
      status: 'SUBMITTED',
      submittedAt: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 14),
      reportData: JSON.stringify({
        invoicesCount: 1,
        totalRevenue: 5000,
        totalExpenses: 3200,
      }),
    },
  })
  console.log(`✅ VAT report created: ${vatReport.id}`)

  // ─── Chat history ─────────────────────────────────────────────────────────────
  await prisma.chatMessage.create({
    data: {
      role: 'assistant',
      content: 'שלום! אני רואה, העוזר החשבונאי שלך. איך אוכל לעזור לך היום?',
    },
  })
  console.log(`✅ Initial chat message created`)

  console.log('\n🎉 Seed completed successfully!')
  console.log(`   Business: ${business.name}`)
  console.log(`   Clients: 3`)
  console.log(`   Invoices: 5 (1 draft, 1 sent, 2 paid, 1 overdue)`)
  console.log(`   Bank transactions: ${transactions.length}`)
  console.log(`   VAT reports: 1`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
