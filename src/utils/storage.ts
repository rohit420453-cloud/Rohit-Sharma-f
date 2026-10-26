import {
  BackupDataPayload,
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceLineItem,
  InvoiceRecord,
  Product,
  ShopSettings,
  StockMovement,
} from '../types/billing';
import { numberToIndianRupeesWords } from './billingLogic';

export const STORAGE_KEYS = {
  SETTINGS: 'rohit_furniture_settings_v1',
  PRODUCTS: 'rohit_furniture_products_v1',
  STOCK_MOVEMENTS: 'rohit_furniture_stock_movements_v1',
  INVOICES: 'rohit_furniture_invoices_v1',
  CUSTOMERS: 'rohit_furniture_customers_v1',
  PAYMENTS: 'rohit_furniture_payments_v1',
  DRAFT_INVOICE: 'rohit_furniture_draft_invoice_v1',
  THEME: 'rohit_furniture_theme_v1',
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'ROHIT FURNITURE',
  address: 'Mantag Rushi Nagar, 30 Feet Rd, Mandala, Mankhurd',
  phone: '9967074181',
  invoicePrefix: 'RF-',
  nextBillSequence: 104,
  currencySymbol: '₹',
  defaultInvoiceDesign: 'classic',
  defaultTaxPercent: 0,
  defaultDiscount: 0,
  defaultProductFontFamily: 'Plus Jakarta Sans',
  defaultProductFontSize: 15,
  defaultProductTextAlign: 'center',
  subHeading: 'SUB : BILL',
  proprietorTitle: 'PROPRIETOR',
};

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-rack-5',
    name: 'Heavy Duty Steel Rack (5 Shelf)',
    sku: 'RF-SRK-05',
    category: 'Racks & Storage',
    purchaseCost: 950,
    sellingPrice: 1450,
    stock: 14,
    minStockAlert: 5,
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'prod-wardrobe-3d',
    name: 'Teak Finish 3-Door Wardrobe with Mirror',
    sku: 'RF-WRD-03',
    category: 'Almirah & Wardrobes',
    purchaseCost: 9200,
    sellingPrice: 13500,
    stock: 4,
    minStockAlert: 3,
    updatedAt: '2026-10-18T11:30:00.000Z',
  },
  {
    id: 'prod-bed-queen',
    name: 'Queen Size Hydraulic Storage Bed (5x6.5)',
    sku: 'RF-BED-QN',
    category: 'Beds & Mattresses',
    purchaseCost: 11500,
    sellingPrice: 16800,
    stock: 2,
    minStockAlert: 3,
    updatedAt: '2026-10-20T14:20:00.000Z',
  },
  {
    id: 'prod-table-office',
    name: 'Engineered Wood Office / Study Table',
    sku: 'RF-TBL-01',
    category: 'Tables & Desks',
    purchaseCost: 1050,
    sellingPrice: 1500,
    stock: 9,
    minStockAlert: 4,
    updatedAt: '2026-10-21T09:15:00.000Z',
  },
  {
    id: 'prod-sofa-311',
    name: 'Luxury Velvet Sofa Set (3+1+1 Seater)',
    sku: 'RF-SOF-5S',
    category: 'Sofa & Living',
    purchaseCost: 14800,
    sellingPrice: 21500,
    stock: 2,
    minStockAlert: 2,
    updatedAt: '2026-10-22T16:40:00.000Z',
  },
  {
    id: 'prod-dressing',
    name: 'Full Length Dressing Table with Storage',
    sku: 'RF-DRS-02',
    category: 'Bedroom',
    purchaseCost: 2800,
    sellingPrice: 4200,
    stock: 1,
    minStockAlert: 3,
    updatedAt: '2026-10-23T12:10:00.000Z',
  },
  {
    id: 'prod-shoerack',
    name: 'Metal & Wood Shoe Rack (4 Tier)',
    sku: 'RF-SHR-04',
    category: 'Racks & Storage',
    purchaseCost: 650,
    sellingPrice: 1100,
    stock: 11,
    minStockAlert: 4,
    updatedAt: '2026-10-24T15:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'cust-101',
    name: 'Rameshwar Jadhav',
    phone: '9867123450',
    address: 'Sector 2, Mandala, Mankhurd, Mumbai',
    notes: 'Regular customer, prefers UPI payments.',
    optionalDueDate: getTodayISO(),
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'cust-102',
    name: 'Farhan Shaikh',
    phone: '9820456789',
    address: '30 Feet Road, Near Masoom Masjid, Mankhurd',
    notes: 'New home furniture package order.',
    optionalDueDate: '2026-10-20',
    createdAt: '2026-10-14T11:30:00.000Z',
  },
  {
    id: 'cust-103',
    name: 'Sunita Sawant',
    phone: '9769887766',
    address: 'Maharashtra Nagar, Mankhurd West',
    notes: 'Full payment cleared on delivery.',
    createdAt: '2026-10-22T15:00:00.000Z',
  },
];

export function getInitialInvoices(): InvoiceRecord[] {
  const today = getTodayISO();
  return [
    {
      id: 'inv-rf-101',
      billNumber: 'RF-101',
      date: '2026-10-18',
      createdAt: '2026-10-18T11:30:00.000Z',
      updatedAt: '2026-10-18T11:30:00.000Z',
      shopName: DEFAULT_SHOP_SETTINGS.shopName,
      shopAddress: DEFAULT_SHOP_SETTINGS.address,
      shopPhone: DEFAULT_SHOP_SETTINGS.phone,
      customerId: 'cust-102',
      customerName: 'Farhan Shaikh',
      customerAddress: '30 Feet Road, Near Masoom Masjid, Mankhurd',
      customerPhone: '9820456789',
      dueDate: '2026-10-20',
      items: [
        {
          id: 'item-101-1',
          srNo: 1,
          productId: 'prod-bed-queen',
          description: 'Queen Size Hydraulic Storage Bed (5x6.5)',
          qty: 1,
          rate: 16800,
          amount: 16800,
          isManualAmount: false,
          purchaseCostSnapshot: 11500,
        },
        {
          id: 'item-101-2',
          srNo: 2,
          productId: 'prod-dressing',
          description: 'Full Length Dressing Table with Storage',
          qty: 1,
          rate: 4200,
          amount: 4200,
          isManualAmount: false,
          purchaseCostSnapshot: 2800,
        },
      ],
      subtotal: 21000,
      discount: 500,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 20500,
      advancePaid: 10000,
      paidAmount: 2500,
      totalReceivedOnBill: 12500,
      balanceDue: 8000,
      paymentMethod: 'Cash',
      paymentStatus: 'Partial',
      status: 'Active',
      amountInWords: numberToIndianRupeesWords(20500),
      notes: 'Balance ₹8,000 promised within 1 week.',
      invoiceDesign: 'classic',
      productFontFamily: 'Plus Jakarta Sans',
      productFontSize: 15,
      productTextAlign: 'center',
      stockDeductedMap: { 'prod-bed-queen': 1, 'prod-dressing': 1 },
    },
    {
      id: 'inv-rf-102',
      billNumber: 'RF-102',
      date: '2026-10-22',
      createdAt: '2026-10-22T16:15:00.000Z',
      updatedAt: '2026-10-22T16:15:00.000Z',
      shopName: DEFAULT_SHOP_SETTINGS.shopName,
      shopAddress: DEFAULT_SHOP_SETTINGS.address,
      shopPhone: DEFAULT_SHOP_SETTINGS.phone,
      customerId: 'cust-103',
      customerName: 'Sunita Sawant',
      customerAddress: 'Maharashtra Nagar, Mankhurd West',
      customerPhone: '9769887766',
      items: [
        {
          id: 'item-102-1',
          srNo: 1,
          productId: 'prod-wardrobe-3d',
          description: 'Teak Finish 3-Door Wardrobe with Mirror',
          qty: 1,
          rate: 13500,
          amount: 13500,
          isManualAmount: false,
          purchaseCostSnapshot: 9200,
        },
      ],
      subtotal: 13500,
      discount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 13500,
      advancePaid: 5000,
      paidAmount: 8500,
      totalReceivedOnBill: 13500,
      balanceDue: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      status: 'Active',
      amountInWords: numberToIndianRupeesWords(13500),
      notes: 'Delivered to 2nd floor.',
      invoiceDesign: 'classic',
      productFontFamily: 'Plus Jakarta Sans',
      productFontSize: 15,
      productTextAlign: 'center',
      stockDeductedMap: { 'prod-wardrobe-3d': 1 },
    },
    {
      id: 'inv-rf-103',
      billNumber: 'RF-103',
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shopName: DEFAULT_SHOP_SETTINGS.shopName,
      shopAddress: DEFAULT_SHOP_SETTINGS.address,
      shopPhone: DEFAULT_SHOP_SETTINGS.phone,
      customerId: 'cust-101',
      customerName: 'Rameshwar Jadhav',
      customerAddress: 'Sector 2, Mandala, Mankhurd, Mumbai',
      customerPhone: '9867123450',
      dueDate: today,
      items: [
        {
          id: 'item-103-1',
          srNo: 1,
          productId: 'prod-rack-5',
          description: 'Heavy Duty Steel Rack (5 Shelf)',
          qty: 2,
          rate: 1450,
          amount: 2900,
          isManualAmount: false,
          purchaseCostSnapshot: 950,
        },
        {
          id: 'item-103-2',
          srNo: 2,
          productId: 'prod-table-office',
          description: 'Engineered Wood Office / Study Table',
          qty: 2,
          rate: 1500,
          amount: 3000,
          isManualAmount: false,
          purchaseCostSnapshot: 1050,
        },
      ],
      subtotal: 5900,
      discount: 100,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 5800,
      advancePaid: 2000,
      paidAmount: 1800,
      totalReceivedOnBill: 3800,
      balanceDue: 2000,
      paymentMethod: 'UPI',
      paymentStatus: 'Partial',
      status: 'Active',
      amountInWords: numberToIndianRupeesWords(5800),
      notes: 'Remaining ₹2,000 Udhaar.',
      invoiceDesign: 'classic',
      productFontFamily: 'Plus Jakarta Sans',
      productFontSize: 15,
      productTextAlign: 'center',
      stockDeductedMap: { 'prod-rack-5': 2, 'prod-table-office': 2 },
    },
  ];
}

export const INITIAL_PAYMENTS: CustomerPaymentEntry[] = [
  {
    id: 'pay-rcp-101',
    receiptNumber: 'RCP-101',
    customerId: 'cust-102',
    customerName: 'Farhan Shaikh',
    customerPhone: '9820456789',
    invoiceId: 'inv-rf-101',
    billNumber: 'RF-101',
    date: '2026-10-21',
    createdAt: '2026-10-21T17:10:00.000Z',
    amount: 3000,
    method: 'UPI',
    notes: 'First Udhaar installment received via PhonePe',
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-init-1',
    productId: 'prod-bed-queen',
    productName: 'Queen Size Hydraulic Storage Bed (5x6.5)',
    sku: 'RF-BED-QN',
    type: 'SALE',
    quantityDelta: -1,
    stockAfter: 2,
    referenceBillNumber: 'RF-101',
    timestamp: '2026-10-18T11:30:00.000Z',
    note: 'Invoice RF-101 sale',
  },
  {
    id: 'mov-init-2',
    productId: 'prod-dressing',
    productName: 'Full Length Dressing Table with Storage',
    sku: 'RF-DRS-02',
    type: 'SALE',
    quantityDelta: -1,
    stockAfter: 1,
    referenceBillNumber: 'RF-101',
    timestamp: '2026-10-18T11:30:00.000Z',
    note: 'Invoice RF-101 sale',
  },
  {
    id: 'mov-init-3',
    productId: 'prod-wardrobe-3d',
    productName: 'Teak Finish 3-Door Wardrobe with Mirror',
    sku: 'RF-WRD-03',
    type: 'SALE',
    quantityDelta: -1,
    stockAfter: 4,
    referenceBillNumber: 'RF-102',
    timestamp: '2026-10-22T16:15:00.000Z',
    note: 'Invoice RF-102 sale',
  },
  {
    id: 'mov-init-4',
    productId: 'prod-rack-5',
    productName: 'Heavy Duty Steel Rack (5 Shelf)',
    sku: 'RF-SRK-05',
    type: 'SALE',
    quantityDelta: -2,
    stockAfter: 14,
    referenceBillNumber: 'RF-103',
    timestamp: new Date().toISOString(),
    note: 'Invoice RF-103 sale',
  },
  {
    id: 'mov-init-5',
    productId: 'prod-table-office',
    productName: 'Engineered Wood Office / Study Table',
    sku: 'RF-TBL-01',
    type: 'SALE',
    quantityDelta: -2,
    stockAfter: 9,
    referenceBillNumber: 'RF-103',
    timestamp: new Date().toISOString(),
    note: 'Invoice RF-103 sale',
  },
];

export function safeLoadFromStorage<T>(key: string, fallback: T): { data: T; error?: string } {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { data: fallback };
    const parsed = JSON.parse(raw) as T;
    return { data: parsed };
  } catch (err) {
    return {
      data: fallback,
      error: `Could not read ${key} from browser storage: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export function safeSaveToStorage<T>(key: string, value: T): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Browser storage is full or unavailable: ${err instanceof Error ? err.message : 'Storage quota exceeded'}`,
    };
  }
}

export function createEmptyLineItems(count = 5): InvoiceLineItem[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    srNo: idx + 1,
    description: '',
    qty: '',
    rate: '',
    amount: 0,
    isManualAmount: false,
  }));
}

export function exportRowsToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCSV = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
    [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBackupJSON(payload: BackupDataPayload): void {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const datePart = getTodayISO();
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `rohit-furniture-backup-${datePart}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildWhatsAppInvoiceMessage(invoice: InvoiceRecord, currency = '₹'): string {
  const activeItems = invoice.items.filter(
    (it) => it.description.trim() !== '' || it.amount > 0
  );
  const itemLines = activeItems.map((it, i) => {
    const qtyRate =
      it.qty !== '' && it.rate !== '' ? ` (${it.qty} × ${currency}${it.rate})` : '';
    return `${i + 1}. ${it.description || 'Furniture Item'}${qtyRate} = ${currency}${it.amount.toLocaleString('en-IN')}`;
  });

  const lines = [
    `*${invoice.shopName}*`,
    `${invoice.shopAddress}`,
    `Mob: ${invoice.shopPhone}`,
    `--------------------------------`,
    `*INVOICE: ${invoice.billNumber}*`,
    `Date: ${invoice.date}`,
    `Customer: ${invoice.customerName || 'Walk-in Customer'}`,
    invoice.customerPhone ? `Phone: ${invoice.customerPhone}` : '',
    `--------------------------------`,
    `*Items:*`,
    ...itemLines,
    `--------------------------------`,
    invoice.discount > 0 ? `Subtotal: ${currency}${invoice.subtotal.toLocaleString('en-IN')}` : '',
    invoice.discount > 0 ? `Discount: -${currency}${invoice.discount.toLocaleString('en-IN')}` : '',
    invoice.taxAmount > 0 ? `Tax (${invoice.taxPercent}%): +${currency}${invoice.taxAmount.toLocaleString('en-IN')}` : '',
    `*GRAND TOTAL: ${currency}${invoice.grandTotal.toLocaleString('en-IN')}*`,
    `Amount in Words: ${invoice.amountInWords}`,
    `Paid: ${currency}${invoice.totalReceivedOnBill.toLocaleString('en-IN')} (${invoice.paymentMethod})`,
    invoice.balanceDue > 0
      ? `*Balance Due (Udhaar): ${currency}${invoice.balanceDue.toLocaleString('en-IN')}*`
      : `*Status: PAID IN FULL*`,
    `--------------------------------`,
    `Thank you for shopping at ${invoice.shopName}!`,
  ].filter(Boolean);

  return lines.join('\n');
}
