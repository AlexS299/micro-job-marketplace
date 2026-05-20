'use strict'
process.env.DATABASE_URL = 'file:///home/user/micro-job-marketplace/prisma/dev.db'
const { PrismaClient } = require('/home/user/micro-job-marketplace/node_modules/@prisma/client')
const p = new PrismaClient()

async function seed() {
  console.log('Seeding database...')

  await p.chatMessage.deleteMany()
  await p.bankTransaction.deleteMany()
  await p.bankAccount.deleteMany()
  await p.vATReport.deleteMany()
  await p.invoiceItem.deleteMany()
  await p.invoice.deleteMany()
  await p.client.deleteMany()
  await p.business.deleteMany()

  const b = await p.business.create({
    data: {
      name: 'Bar-Lev Technologies Ltd',
      vatNumber: '514123456',
      businessNumber: '514123456',
      address: '45 Herzl Street',
      city: 'Tel Aviv',
      phone: '03-5551234',
      email: 'info@barlev-tech.co.il',
      bankAccount: '12-345-678901',
      bankName: 'Bank Hapoalim',
      taxType: 'OSEK_MURSHEH',
      vatReportPeriod: 'BIMONTHLY',
    }
  })
  console.log('Business:', b.name)

  const c1 = await p.client.create({ data: { businessId: b.id, name: 'Alpha Company Ltd', vatNumber: '512345678', email: 'accounts@alpha.co.il', phone: '03-7654321', city: 'Tel Aviv' } })
  const c2 = await p.client.create({ data: { businessId: b.id, name: 'Israel Cohen - Freelancer', idNumber: '123456789', email: 'israel.cohen@gmail.com', phone: '054-1234567', city: 'Jerusalem' } })
  const c3 = await p.client.create({ data: { businessId: b.id, name: 'Migdalei Hayam International Ltd', vatNumber: '513987654', email: 'finance@yamsea.co.il', phone: '04-8765432', city: 'Haifa' } })
  console.log('Clients: 3')

  const now = new Date()
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const tma = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const i1 = await p.invoice.create({
    data: {
      businessId: b.id, clientId: c1.id,
      invoiceNumber: 'INV-' + now.getFullYear() + '-001',
      type: 'TAX_INVOICE', status: 'PAID',
      issueDate: new Date(tma.getFullYear(), tma.getMonth(), 5),
      dueDate: new Date(tma.getFullYear(), tma.getMonth() + 1, 5),
      paidAt: new Date(tma.getFullYear(), tma.getMonth(), 20),
      currency: 'ILS', subtotal: 5000, vatAmount: 900, vatRate: 0.18, total: 5900,
      notes: 'App development - Phase 1',
      items: { create: [
        { description: 'Frontend Development - React', quantity: 30, unitPrice: 120, total: 3600, vatIncluded: false },
        { description: 'Backend Development - Node.js', quantity: 14, unitPrice: 100, total: 1400, vatIncluded: false }
      ]}
    }
  })

  const i2 = await p.invoice.create({
    data: {
      businessId: b.id, clientId: c3.id,
      invoiceNumber: 'INV-' + now.getFullYear() + '-002',
      type: 'COMBINED', status: 'PAID',
      issueDate: new Date(lm.getFullYear(), lm.getMonth(), 10),
      dueDate: new Date(lm.getFullYear(), lm.getMonth() + 1, 10),
      paidAt: new Date(lm.getFullYear(), lm.getMonth(), 25),
      currency: 'ILS', subtotal: 8500, vatAmount: 1530, vatRate: 0.18, total: 10030,
      notes: 'Technology Consulting - January',
      items: { create: [
        { description: 'Strategic Technology Consulting', quantity: 10, unitPrice: 500, total: 5000, vatIncluded: false },
        { description: 'Architecture Document', quantity: 1, unitPrice: 3500, total: 3500, vatIncluded: false }
      ]}
    }
  })

  await p.invoice.create({
    data: {
      businessId: b.id, clientId: c1.id,
      invoiceNumber: 'INV-' + now.getFullYear() + '-003',
      type: 'TAX_INVOICE', status: 'SENT',
      issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      currency: 'ILS', subtotal: 12000, vatAmount: 2160, vatRate: 0.18, total: 14160,
      notes: 'CRM Module Development - Phase 2',
      items: { create: [
        { description: 'Client Module Development', quantity: 50, unitPrice: 150, total: 7500, vatIncluded: false },
        { description: 'System Integration', quantity: 30, unitPrice: 150, total: 4500, vatIncluded: false }
      ]}
    }
  })

  await p.invoice.create({
    data: {
      businessId: b.id, clientId: c2.id,
      invoiceNumber: 'INV-' + now.getFullYear() + '-004',
      type: 'TAX_INVOICE', status: 'OVERDUE',
      issueDate: new Date(lm.getFullYear(), lm.getMonth() - 1, 15),
      dueDate: new Date(lm.getFullYear(), lm.getMonth(), 15),
      currency: 'ILS', subtotal: 2500, vatAmount: 450, vatRate: 0.18, total: 2950,
      items: { create: [
        { description: 'Website Design and Development', quantity: 1, unitPrice: 2500, total: 2500, vatIncluded: false }
      ]}
    }
  })

  await p.invoice.create({
    data: {
      businessId: b.id, clientId: c3.id,
      invoiceNumber: 'INV-' + now.getFullYear() + '-005',
      type: 'TAX_INVOICE', status: 'DRAFT',
      issueDate: now,
      currency: 'ILS', subtotal: 6000, vatAmount: 1080, vatRate: 0.18, total: 7080,
      items: { create: [
        { description: 'Monthly Maintenance - May 2025', quantity: 1, unitPrice: 4000, total: 4000, vatIncluded: false },
        { description: 'Technical Support - 20 Hours', quantity: 20, unitPrice: 100, total: 2000, vatIncluded: false }
      ]}
    }
  })
  console.log('Invoices: 5')

  const ba = await p.bankAccount.create({
    data: { businessId: b.id, bankName: 'Bank Hapoalim', accountNumber: '678901', branchNumber: '345', currency: 'ILS', balance: 47250, lastSyncAt: now }
  })

  const txData = [
    { date: new Date(tma.getFullYear(), tma.getMonth(), 20), description: 'Payment INV-001 Alpha Company', amount: 5900, category: 'INCOME', balance: 23500, invoiceId: i1.id, isReconciled: true },
    { date: new Date(tma.getFullYear(), tma.getMonth(), 22), description: 'Office Rent', amount: -4500, category: 'EXPENSE', balance: 19000, isReconciled: true },
    { date: new Date(tma.getFullYear(), tma.getMonth(), 28), description: 'VAT Payment Jan-Feb', amount: -1800, category: 'VAT', balance: 17200, isReconciled: true },
    { date: new Date(lm.getFullYear(), lm.getMonth(), 5), description: 'Computer Equipment Purchase', amount: -3200, category: 'EXPENSE', balance: 14000, isReconciled: true },
    { date: new Date(lm.getFullYear(), lm.getMonth(), 25), description: 'Payment INV-002 Migdalei Hayam', amount: 10030, category: 'INCOME', balance: 24030, invoiceId: i2.id, isReconciled: true },
    { date: new Date(lm.getFullYear(), lm.getMonth(), 28), description: 'Adobe Creative Cloud', amount: -250, category: 'EXPENSE', balance: 23780, isReconciled: true },
    { date: new Date(now.getFullYear(), now.getMonth(), 3), description: 'Office Rent - May', amount: -4500, category: 'EXPENSE', balance: 19280, isReconciled: false },
    { date: new Date(now.getFullYear(), now.getMonth(), 7), description: 'Accounting Services', amount: -800, category: 'EXPENSE', balance: 18480, isReconciled: false },
    { date: new Date(now.getFullYear(), now.getMonth(), 10), description: 'Wix Business Subscription', amount: -180, category: 'EXPENSE', balance: 18300, isReconciled: false },
    { date: new Date(now.getFullYear(), now.getMonth(), 12), description: 'Income - Israel Cohen Extra Work', amount: 1500, category: 'INCOME', balance: 19800, isReconciled: false }
  ]

  for (const tx of txData) {
    await p.bankTransaction.create({ data: { bankAccountId: ba.id, ...tx } })
  }
  console.log('Transactions:', txData.length)

  await p.vATReport.create({
    data: {
      businessId: b.id,
      periodStart: new Date(tma.getFullYear(), tma.getMonth(), 1),
      periodEnd: new Date(lm.getFullYear(), lm.getMonth() - 1, 0),
      outputVAT: 900, inputVAT: 576, vatOwed: 324,
      status: 'SUBMITTED',
      submittedAt: new Date(lm.getFullYear(), lm.getMonth(), 14),
      reportData: JSON.stringify({ invoicesCount: 1, totalRevenue: 5000, totalExpenses: 3200 })
    }
  })
  await p.chatMessage.create({ data: { role: 'assistant', content: 'Hello! I am your accounting assistant. How can I help you today?' } })
  console.log('Seed complete! Business:', b.name, '| Clients: 3 | Invoices: 5 | Transactions:', txData.length)
}

seed()
  .catch(e => { console.error('Seed error:', e.message); process.exit(1) })
  .finally(() => p.$disconnect())
