import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimatedProfit,
  calculateInvoiceTotals,
  calculateLineItem,
  computeCustomerLedgers,
  INVOICE_TEMPLATES,
  mergeBulkItemsIntoInvoice,
  numberToIndianRupeesWords,
  parseBulkAddInput,
  reconcileStockForInvoice,
  validateBackupPayload,
} from './billingLogic';
import { InvoiceLineItem, InvoiceRecord, Product } from '../types/billing';

test('INVOICE_TEMPLATES defines 15 distinct bill templates including 5 3D templates', () => {
  assert.equal(INVOICE_TEMPLATES.length, 15);
  const uniqueIds = new Set(INVOICE_TEMPLATES.map((t) => t.id));
  assert.equal(uniqueIds.size, 15);
  const threeDTemplates = INVOICE_TEMPLATES.filter((t) => t.is3D);
  assert.equal(threeDTemplates.length, 5);
});

test('numberToIndianRupeesWords converts Indian numbering system values accurately', () => {
  assert.equal(numberToIndianRupeesWords(0), 'Zero Rupees Only');
  assert.equal(numberToIndianRupeesWords(1200), 'One Thousand Two Hundred Rupees Only');
  assert.equal(numberToIndianRupeesWords(6200), 'Six Thousand Two Hundred Rupees Only');
  assert.equal(
    numberToIndianRupeesWords(145850),
    'One Lakh Forty Five Thousand Eight Hundred and Fifty Rupees Only'
  );
  assert.equal(
    numberToIndianRupeesWords(1250.5),
    'One Thousand Two Hundred and Fifty Rupees and Fifty Paise Only'
  );
});

test('calculateLineItem handles Qty x Rate and manual amount overrides accurately', () => {
  const autoCalc = calculateLineItem(
    { qty: 6, rate: 200, amount: 0, isManualAmount: false },
    'qty'
  );
  assert.equal(autoCalc.amount, 1200);
  assert.equal(autoCalc.isManualAmount, false);

  const manualOverride = calculateLineItem(
    { qty: 6, rate: 200, amount: 1150, isManualAmount: false },
    'amount'
  );
  assert.equal(manualOverride.amount, 1150);
  assert.equal(manualOverride.isManualAmount, true);

  // Editing rate again switches back to automatic calculation
  const backToAuto = calculateLineItem(
    { qty: manualOverride.qty, rate: 250, amount: manualOverride.amount, isManualAmount: true },
    'rate'
  );
  assert.equal(backToAuto.amount, 1500);
  assert.equal(backToAuto.isManualAmount, false);
});

test('parseBulkAddInput supports both Qty+Rate and Direct Amount formats and catches invalid lines', () => {
  const input = [
    'Rack, 6, 200',
    'Table, 2, 1500',
    'Rack, 2000',
    'InvalidLineWithoutComma',
    'Chair, -2, 400',
  ].join('\n');

  const parsed = parseBulkAddInput(input);
  assert.equal(parsed.length, 5);

  assert.equal(parsed[0].valid, true);
  assert.equal(parsed[0].description, 'Rack');
  assert.equal(parsed[0].qty, 6);
  assert.equal(parsed[0].rate, 200);
  assert.equal(parsed[0].amount, 1200);

  assert.equal(parsed[1].valid, true);
  assert.equal(parsed[1].description, 'Table');
  assert.equal(parsed[1].qty, 2);
  assert.equal(parsed[1].rate, 1500);
  assert.equal(parsed[1].amount, 3000);

  assert.equal(parsed[2].valid, true);
  assert.equal(parsed[2].description, 'Rack');
  assert.equal(parsed[2].qty, '');
  assert.equal(parsed[2].rate, '');
  assert.equal(parsed[2].amount, 2000);
  assert.equal(parsed[2].isManualAmount, true);

  // Never silently discards invalid lines
  assert.equal(parsed[3].valid, false);
  assert.ok(parsed[3].error);

  assert.equal(parsed[4].valid, false);
  assert.ok(parsed[4].error);
});

test('mergeBulkItemsIntoInvoice appends after existing populated rows and renumbers serial numbers', () => {
  const existing: InvoiceLineItem[] = [
    {
      id: 'row-1',
      srNo: 1,
      description: 'Wooden Cot',
      qty: 1,
      rate: 8500,
      amount: 8500,
      isManualAmount: false,
    },
    {
      id: 'row-2',
      srNo: 2,
      description: '',
      qty: '',
      rate: '',
      amount: 0,
      isManualAmount: false,
    },
  ];
  const parsed = parseBulkAddInput('Rack, 6, 200\nTable, 2, 1500\nRack, 2000');
  const merged = mergeBulkItemsIntoInvoice(existing, parsed);

  assert.equal(merged.length, 4);
  assert.equal(merged[0].srNo, 1);
  assert.equal(merged[0].description, 'Wooden Cot');
  assert.equal(merged[1].srNo, 2);
  assert.equal(merged[1].description, 'Rack');
  assert.equal(merged[1].amount, 1200);
  assert.equal(merged[2].srNo, 3);
  assert.equal(merged[2].description, 'Table');
  assert.equal(merged[2].amount, 3000);
  assert.equal(merged[3].srNo, 4);
  assert.equal(merged[3].description, 'Rack');
  assert.equal(merged[3].amount, 2000);
});

test('calculateInvoiceTotals computes subtotal, discount, paid, balance, and amount-in-words', () => {
  const items: InvoiceLineItem[] = [
    { id: '1', srNo: 1, description: 'Rack', qty: 6, rate: 200, amount: 1200, isManualAmount: false },
    { id: '2', srNo: 2, description: 'Table', qty: 2, rate: 1500, amount: 3000, isManualAmount: false },
    { id: '3', srNo: 3, description: 'Rack', qty: '', rate: '', amount: 2000, isManualAmount: true },
  ];
  const totals = calculateInvoiceTotals({
    items,
    discount: 200,
    taxPercent: 0,
    advancePaid: 2000,
    paidAmount: 1000,
  });

  assert.equal(totals.subtotal, 6200);
  assert.equal(totals.grandTotal, 6000);
  assert.equal(totals.totalReceivedOnBill, 3000);
  assert.equal(totals.balanceDue, 3000);
  assert.equal(totals.paymentStatus, 'Partial');
  assert.equal(totals.amountInWords, 'Six Thousand Rupees Only');
});

test('reconcileStockForInvoice prevents duplicate stock deductions and restores stock on cancellation', () => {
  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'Steel Rack 5-Shelf',
      sku: 'RF-RCK-01',
      category: 'Storage & Racks',
      purchaseCost: 1100,
      sellingPrice: 1650,
      stock: 20,
      minStockAlert: 5,
      updatedAt: '2026-10-20T00:00:00.000Z',
    },
  ];

  const baseInvoice: InvoiceRecord = {
    id: 'inv-1',
    billNumber: 'RF-101',
    date: '2026-10-25',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
    shopName: 'ROHIT FURNITURE',
    shopAddress: 'Mantag Rushi Nagar, 30 Feet Rd, Mandala, Mankhurd',
    shopPhone: '9967074181',
    customerName: 'Amit Patil',
    customerAddress: 'Mankhurd',
    customerPhone: '9876543210',
    items: [
      {
        id: 'line-1',
        srNo: 1,
        productId: 'prod-1',
        description: 'Steel Rack 5-Shelf',
        qty: 3,
        rate: 1650,
        amount: 4950,
        isManualAmount: false,
      },
    ],
    subtotal: 4950,
    discount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 4950,
    advancePaid: 4950,
    paidAmount: 0,
    totalReceivedOnBill: 4950,
    balanceDue: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    status: 'Active',
    amountInWords: 'Four Thousand Nine Hundred and Fifty Rupees Only',
    invoiceDesign: 'classic',
    productFontFamily: 'sans-serif',
    productFontSize: 15,
    productTextAlign: 'center',
    stockDeductedMap: {},
  };

  // First save deducts 3 units (20 -> 17)
  const firstSave = reconcileStockForInvoice({
    products,
    invoice: baseInvoice,
    previousDeductedMap: {},
  });
  assert.equal(firstSave.updatedProducts[0].stock, 17);
  assert.equal(firstSave.newDeductedMap['prod-1'], 3);
  assert.equal(firstSave.movements.length, 1);

  // Saving the exact same invoice again does NOT deduct stock again (17 -> 17)
  const secondSave = reconcileStockForInvoice({
    products: firstSave.updatedProducts,
    invoice: baseInvoice,
    previousDeductedMap: firstSave.newDeductedMap,
  });
  assert.equal(secondSave.updatedProducts[0].stock, 17);
  assert.equal(secondSave.movements.length, 0);

  // Cancelling the invoice restores all 3 units (17 -> 20)
  const cancelledSave = reconcileStockForInvoice({
    products: secondSave.updatedProducts,
    invoice: { ...baseInvoice, status: 'Cancelled' },
    previousDeductedMap: secondSave.newDeductedMap,
  });
  assert.equal(cancelledSave.updatedProducts[0].stock, 20);
  assert.equal(cancelledSave.movements.length, 1);
  assert.equal(cancelledSave.movements[0].type, 'CANCELLATION_RESTORE');
});

test('computeCustomerLedgers and calculateEstimatedProfit use real invoice and payment records', () => {
  const customer = {
    id: 'cust-1',
    name: 'Suresh Chavan',
    phone: '9820112233',
    address: 'Mandala, Mankhurd',
    createdAt: '2026-10-01T00:00:00.000Z',
  };
  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'Queen Size Bed',
      sku: 'RF-BED-01',
      category: 'Bedroom',
      purchaseCost: 9000,
      sellingPrice: 13500,
      stock: 5,
      minStockAlert: 2,
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];
  const invoice: InvoiceRecord = {
    id: 'inv-100',
    billNumber: 'RF-100',
    date: '2026-10-20',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    shopName: 'ROHIT FURNITURE',
    shopAddress: 'Mantag Rushi Nagar, 30 Feet Rd, Mandala, Mankhurd',
    shopPhone: '9967074181',
    customerId: 'cust-1',
    customerName: 'Suresh Chavan',
    customerAddress: 'Mandala, Mankhurd',
    customerPhone: '9820112233',
    items: [
      {
        id: 'l1',
        srNo: 1,
        productId: 'prod-1',
        description: 'Queen Size Bed',
        qty: 1,
        rate: 13500,
        amount: 13500,
        isManualAmount: false,
        purchaseCostSnapshot: 9000,
      },
    ],
    subtotal: 13500,
    discount: 500,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 13000,
    advancePaid: 5000,
    paidAmount: 0,
    totalReceivedOnBill: 5000,
    balanceDue: 8000,
    paymentMethod: 'Cash',
    paymentStatus: 'Partial',
    status: 'Active',
    amountInWords: 'Thirteen Thousand Rupees Only',
    invoiceDesign: 'classic',
    productFontFamily: 'sans-serif',
    productFontSize: 15,
    productTextAlign: 'center',
    stockDeductedMap: { 'prod-1': 1 },
  };

  const payments = [
    {
      id: 'pay-1',
      receiptNumber: 'RCP-101',
      customerId: 'cust-1',
      customerName: 'Suresh Chavan',
      customerPhone: '9820112233',
      invoiceId: 'inv-100',
      billNumber: 'RF-100',
      date: '2026-10-22',
      createdAt: '2026-10-22T12:00:00.000Z',
      amount: 3000,
      method: 'UPI' as const,
      notes: 'Part payment via GPay',
    },
  ];

  const ledgers = computeCustomerLedgers([customer], [invoice], payments, '2026-10-25');
  assert.equal(ledgers[0].totalBilled, 13000);
  assert.equal(ledgers[0].totalReceived, 8000);
  assert.equal(ledgers[0].outstandingBalance, 5000);

  const profit = calculateEstimatedProfit([invoice], products);
  assert.equal(profit.estimatedProfit, 4000); // 13000 revenue - 9000 cost
});

test('validateBackupPayload rejects malformed JSON objects and accepts valid payloads', () => {
  assert.equal(validateBackupPayload(null).valid, false);
  assert.equal(validateBackupPayload({ settings: {} }).valid, false);

  const validCheck = validateBackupPayload({
    version: 1,
    settings: {
      shopName: 'ROHIT FURNITURE',
      address: 'Mantag Rushi Nagar, 30 Feet Rd, Mandala, Mankhurd',
      phone: '9967074181',
    },
    products: [],
    invoices: [],
    customers: [],
    payments: [],
  });
  assert.equal(validCheck.valid, true);
});
