export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
export type InvoiceDesign =
  | 'classic'
  | 'modern'
  | 'royal-gold'
  | 'gst-vyapar'
  | 'minimal-ivory'
  | 'emerald-heritage'
  | 'navy-corporate'
  | 'woodcraft-rustic'
  | 'compact-retail'
  | 'bold-maroon'
  | '3d-royal-emboss'
  | '3d-teak-carved'
  | '3d-layered-stack'
  | '3d-metallic-prism'
  | '3d-emerald-vault';

export interface InvoiceTemplateMeta {
  id: InvoiceDesign;
  code: string;
  name: string;
  subtitle: string;
  accentColor: string;
  is3D?: boolean;
}

export type ProductTextAlign = 'left' | 'center';
export type InvoiceStatus = 'Active' | 'Cancelled' | 'Refunded';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Cancelled';

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  invoicePrefix: string;
  nextBillSequence: number;
  currencySymbol: string;
  defaultInvoiceDesign: InvoiceDesign;
  defaultTaxPercent: number;
  defaultDiscount: number;
  defaultProductFontFamily: string;
  defaultProductFontSize: number;
  defaultProductTextAlign: ProductTextAlign;
  subHeading: string;
  proprietorTitle: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchaseCost: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  imageUrl?: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'SALE' | 'CANCELLATION_RESTORE' | 'EDIT_ADJUSTMENT' | 'MANUAL_ADJUSTMENT' | 'INITIAL';
  quantityDelta: number;
  stockAfter: number;
  referenceBillNumber?: string;
  timestamp: string;
  note: string;
}

export interface InvoiceLineItem {
  id: string;
  srNo: number;
  productId?: string;
  description: string;
  qty: number | '';
  rate: number | '';
  amount: number;
  isManualAmount: boolean;
  purchaseCostSnapshot?: number;
}

export interface InvoiceRecord {
  id: string;
  billNumber: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  customerId?: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  dueDate?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  paidAmount: number;
  totalReceivedOnBill: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  amountInWords: string;
  notes?: string;
  invoiceDesign: InvoiceDesign;
  productFontFamily: string;
  productFontSize: number;
  productTextAlign: ProductTextAlign;
  /** Tracks productId -> quantity already deducted from stock for this invoice to prevent duplicate deductions */
  stockDeductedMap: Record<string, number>;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  optionalDueDate?: string;
  createdAt: string;
}

export interface CustomerPaymentEntry {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId?: string;
  billNumber?: string;
  date: string;
  createdAt: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
}

export interface CustomerLedgerSummary {
  customer: CustomerProfile;
  totalBilled: number;
  paidOnInvoices: number;
  ledgerPaymentsReceived: number;
  totalReceived: number;
  outstandingBalance: number;
  invoiceCount: number;
  dueStatus: 'Clear' | 'Due' | 'Overdue';
  earliestDueDate?: string;
}

export interface BulkParseCandidate {
  lineNumber: number;
  rawLine: string;
  valid: boolean;
  description: string;
  qty: number | '';
  rate: number | '';
  amount: number;
  isManualAmount: boolean;
  error?: string;
}

export interface BackupDataPayload {
  version: number;
  exportedAt: string;
  shop: string;
  settings: ShopSettings;
  products: Product[];
  stockMovements: StockMovement[];
  invoices: InvoiceRecord[];
  customers: CustomerProfile[];
  payments: CustomerPaymentEntry[];
}
