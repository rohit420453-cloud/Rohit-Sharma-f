import {
  BackupDataPayload,
  BulkParseCandidate,
  CustomerLedgerSummary,
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceLineItem,
  InvoiceRecord,
  InvoiceTemplateMeta,
  PaymentStatus,
  Product,
  StockMovement,
} from '../types/billing';

export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  {
    id: 'classic',
    code: '01',
    name: 'Classic Red Bill',
    subtitle: 'Original ROHIT FURNITURE Red Header & Black Grid',
    accentColor: '#b91c1c',
  },
  {
    id: 'modern',
    code: '02',
    name: 'Modern Slate A4',
    subtitle: 'Clean Charcoal Corporate Header & Structured Box',
    accentColor: '#1c1917',
  },
  {
    id: 'royal-gold',
    code: '03',
    name: 'Royal Gold & Teak',
    subtitle: 'Luxury Double-Border Frame with Warm Gold Header',
    accentColor: '#b45309',
  },
  {
    id: 'gst-vyapar',
    code: '04',
    name: 'Vyapar Tax Grid',
    subtitle: 'Full Boxed Multi-Cell Commercial Tax Invoice Layout',
    accentColor: '#334155',
  },
  {
    id: 'minimal-ivory',
    code: '05',
    name: 'Minimalist Studio',
    subtitle: 'Editorial Boutique Layout with Hairline Dividers',
    accentColor: '#57534e',
  },
  {
    id: 'emerald-heritage',
    code: '06',
    name: 'Emerald Showroom',
    subtitle: 'Rich Forest Green Header Band & Crisp Ledger Table',
    accentColor: '#065f46',
  },
  {
    id: 'navy-corporate',
    code: '07',
    name: 'Navy Crest Pro',
    subtitle: 'Deep Royal Navy Split Header & Striped Rows',
    accentColor: '#1e3a8a',
  },
  {
    id: 'woodcraft-rustic',
    code: '08',
    name: 'Teak Woodcraft',
    subtitle: 'Warm Walnut Brown Furniture Craft Crest & Borders',
    accentColor: '#78350f',
  },
  {
    id: 'compact-retail',
    code: '09',
    name: 'Compact Cash Memo',
    subtitle: 'Fast Counter Cash/Credit Memo with High-Density Grid',
    accentColor: '#0f172a',
  },
  {
    id: 'bold-maroon',
    code: '10',
    name: 'Samrat Maroon Deluxe',
    subtitle: 'Royal Maroon Banner with Gold Accents & Bold Totals',
    accentColor: '#881337',
  },
  {
    id: '3d-royal-emboss',
    code: '11',
    name: '3D Royal Gold Emboss',
    subtitle: '3D Raised Gold Plaque, Chiseled Frame & Embossed Title',
    accentColor: '#d97706',
    is3D: true,
  },
  {
    id: '3d-teak-carved',
    code: '12',
    name: '3D Carved Teak Block',
    subtitle: '3D Beveled Mahogany Wood Plaque & Inset Customer Box',
    accentColor: '#7c2d12',
    is3D: true,
  },
  {
    id: '3d-layered-stack',
    code: '13',
    name: '3D Layered Paper Stack',
    subtitle: '3D Extruded Shadow Sheet, Ribbon Header & Raised Cells',
    accentColor: '#0f172a',
    is3D: true,
  },
  {
    id: '3d-metallic-prism',
    code: '14',
    name: '3D Chrome & Obsidian',
    subtitle: '3D Brushed Metallic Bevel Frame & Elevated Dark Banner',
    accentColor: '#334155',
    is3D: true,
  },
  {
    id: '3d-emerald-vault',
    code: '15',
    name: '3D Emerald Jewel Box',
    subtitle: '3D Faceted Emerald Banner with Deep Gold Ledge & Shadow',
    accentColor: '#047857',
    is3D: true,
  },
];

export const AI_EXTRACTION_PROMPT = `You are an expert Indian furniture shop billing assistant for ROHIT FURNITURE.
Carefully read the attached handwritten or printed furniture bill image and extract every product line item into plain text for our Bulk Add tool.

Output ONLY the extracted product lines using these exact formats (one product per line, no bullets, no numbering, no currency symbols, no extra commentary):

Format 1 (when Quantity and Rate are visible):
Product Description, Quantity, Rate

Format 2 (when only Product Description and final Amount are visible):
Product Description, Amount

Examples of valid output:
Rack, 6, 200
Table, 2, 1500
Wooden Wardrobe 3-Door, 1, 14500
Steel Almirah Repair, 2000

Rules:
1. Do not include Sr. No., headers, subtotals, or grand total rows.
2. Convert Hindi/Marathi/Hinglish furniture item names into clean, readable English or Hinglish words (e.g., "4x6 Bed", "Dressing Table", "Sofa Set 5 Seater", "Shoe Rack", "Plastic Chair").
3. Remove commas inside numbers (write 1500 instead of 1,500).
4. Verify that Quantity × Rate matches the written amount; if only a lump-sum amount is written without quantity/rate, use Format 2 (Product Description, Amount).
5. If any word or number is unclear, write your best reading and add [CHECK] in the product description so the shop owner can review it before billing.`;

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const rem = n % 10;
  return rem === 0 ? TENS[ten] : `${TENS[ten]} ${ONES[rem]}`;
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const rem = n % 100;
  const hundredPart = hundred > 0 ? `${ONES[hundred]} Hundred` : '';
  const remPart = twoDigitsToWords(rem);
  if (hundredPart && remPart) return `${hundredPart} and ${remPart}`;
  return hundredPart || remPart;
}

/**
 * Converts a numeric amount into Indian Rupees in words (Crore, Lakh, Thousand, Hundred).
 */
export function numberToIndianRupeesWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return 'Zero Rupees Only';
  }
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Rupees Only';
  }

  const parts: string[] = [];
  let remaining = rupees;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    parts.push(`${threeDigitsToWords(crore)} Crore`);
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  }

  if (remaining > 0) {
    parts.push(threeDigitsToWords(remaining));
  }

  const rupeesWords = parts.length > 0 ? `${parts.join(' ')} Rupees` : '';
  const paiseWords = paise > 0 ? `${twoDigitsToWords(paise)} Paise` : '';

  if (rupeesWords && paiseWords) {
    return `${rupeesWords} and ${paiseWords} Only`;
  }
  if (rupeesWords) {
    return `${rupeesWords} Only`;
  }
  return `${paiseWords} Only`;
}

export function formatINR(amount: number, symbol = '₹'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${safe.toLocaleString('en-IN', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculates a line item's amount from Qty and Rate unless manually overridden.
 */
export function calculateLineItem(
  item: Pick<InvoiceLineItem, 'qty' | 'rate' | 'amount' | 'isManualAmount'>,
  changedField?: 'qty' | 'rate' | 'amount'
): { qty: number | ''; rate: number | ''; amount: number; isManualAmount: boolean } {
  const rawQty = item.qty === '' ? '' : Number(item.qty);
  const rawRate = item.rate === '' ? '' : Number(item.rate);

  if (changedField === 'amount') {
    const manualAmt = Math.max(0, Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0);
    return {
      qty: rawQty !== '' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : '',
      rate: rawRate !== '' && Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : '',
      amount: Math.round(manualAmt * 100) / 100,
      isManualAmount: true,
    };
  }

  if (changedField === 'qty' || changedField === 'rate') {
    if (
      rawQty !== '' &&
      rawRate !== '' &&
      Number.isFinite(rawQty) &&
      Number.isFinite(rawRate) &&
      rawQty > 0 &&
      rawRate >= 0
    ) {
      return {
        qty: rawQty,
        rate: rawRate,
        amount: Math.round(rawQty * rawRate * 100) / 100,
        isManualAmount: false,
      };
    }
    return {
      qty: rawQty !== '' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : '',
      rate: rawRate !== '' && Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : '',
      amount: 0,
      isManualAmount: false,
    };
  }

  // Default evaluation
  if (item.isManualAmount) {
    return {
      qty: rawQty !== '' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : '',
      rate: rawRate !== '' && Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : '',
      amount: Math.max(0, Math.round((Number(item.amount) || 0) * 100) / 100),
      isManualAmount: true,
    };
  }

  if (
    rawQty !== '' &&
    rawRate !== '' &&
    Number.isFinite(rawQty) &&
    Number.isFinite(rawRate) &&
    rawQty > 0 &&
    rawRate >= 0
  ) {
    return {
      qty: rawQty,
      rate: rawRate,
      amount: Math.round(rawQty * rawRate * 100) / 100,
      isManualAmount: false,
    };
  }

  return {
    qty: rawQty !== '' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : '',
    rate: rawRate !== '' && Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : '',
    amount: Math.max(0, Math.round((Number(item.amount) || 0) * 100) / 100),
    isManualAmount: item.isManualAmount,
  };
}

export function renumberLineItems(items: InvoiceLineItem[]): InvoiceLineItem[] {
  return items.map((item, idx) => ({
    ...item,
    srNo: idx + 1,
  }));
}

export interface InvoiceFinancialTotals {
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  paidAmount: number;
  totalReceivedOnBill: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  amountInWords: string;
}

export function calculateInvoiceTotals(params: {
  items: InvoiceLineItem[];
  discount: number;
  taxPercent: number;
  advancePaid: number;
  paidAmount: number;
  isCancelledOrRefunded?: boolean;
}): InvoiceFinancialTotals {
  const populatedItems = params.items.filter(
    (it) => it.description.trim() !== '' || it.amount > 0
  );
  const rawSubtotal = populatedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const subtotal = Math.max(0, Math.round(rawSubtotal * 100) / 100);
  const safeDiscount = Math.max(
    0,
    Math.min(subtotal, Math.round((Number(params.discount) || 0) * 100) / 100)
  );
  const taxableBase = Math.max(0, subtotal - safeDiscount);
  const safeTaxPercent = Math.max(0, Math.min(100, Number(params.taxPercent) || 0));
  const taxAmount = Math.round(((taxableBase * safeTaxPercent) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;

  const advancePaid = Math.max(0, Math.round((Number(params.advancePaid) || 0) * 100) / 100);
  const paidAmount = Math.max(0, Math.round((Number(params.paidAmount) || 0) * 100) / 100);
  const totalReceivedOnBill = Math.min(
    grandTotal,
    Math.round((advancePaid + paidAmount) * 100) / 100
  );
  const balanceDue = Math.max(0, Math.round((grandTotal - totalReceivedOnBill) * 100) / 100);

  let paymentStatus: PaymentStatus = 'Unpaid';
  if (params.isCancelledOrRefunded) {
    paymentStatus = 'Cancelled';
  } else if (grandTotal === 0) {
    paymentStatus = 'Unpaid';
  } else if (balanceDue === 0) {
    paymentStatus = 'Paid';
  } else if (totalReceivedOnBill > 0) {
    paymentStatus = 'Partial';
  } else {
    paymentStatus = 'Unpaid';
  }

  return {
    subtotal,
    discount: safeDiscount,
    taxPercent: safeTaxPercent,
    taxAmount,
    grandTotal,
    advancePaid,
    paidAmount,
    totalReceivedOnBill,
    balanceDue,
    paymentStatus,
    amountInWords: numberToIndianRupeesWords(grandTotal),
  };
}

/**
 * Parses multi-line Bulk Add input supporting:
 * - "Rack, 6, 200" (Description, Qty, Rate -> Amount = 1200)
 * - "Table, 2, 1500" (Description, Qty, Rate -> Amount = 3000)
 * - "Rack, 2000" (Description, Direct Amount -> Amount = 2000)
 * Never silently discards invalid lines; returns every non-empty line with validation status.
 */
export function parseBulkAddInput(rawInput: string): BulkParseCandidate[] {
  const lines = rawInput.split(/\r?\n/);
  const results: BulkParseCandidate[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lineNumber = index + 1;
    const parts = trimmed.split(',').map((p) => p.trim());

    if (parts.length < 2) {
      results.push({
        lineNumber,
        rawLine: trimmed,
        valid: false,
        description: trimmed,
        qty: '',
        rate: '',
        amount: 0,
        isManualAmount: false,
        error: 'Expected "Product, Qty, Rate" or "Product, Amount" separated by commas.',
      });
      return;
    }

    if (parts.length === 2) {
      const [desc, rawAmt] = parts;
      const amt = Number(rawAmt);
      if (!desc) {
        results.push({
          lineNumber,
          rawLine: trimmed,
          valid: false,
          description: '',
          qty: '',
          rate: '',
          amount: 0,
          isManualAmount: true,
          error: 'Product description is missing.',
        });
        return;
      }
      if (rawAmt === '' || !Number.isFinite(amt) || amt < 0) {
        results.push({
          lineNumber,
          rawLine: trimmed,
          valid: false,
          description: desc,
          qty: '',
          rate: '',
          amount: 0,
          isManualAmount: true,
          error: `Invalid amount "${rawAmt}". Must be a non-negative number.`,
        });
        return;
      }
      results.push({
        lineNumber,
        rawLine: trimmed,
        valid: true,
        description: desc,
        qty: '',
        rate: '',
        amount: Math.round(amt * 100) / 100,
        isManualAmount: true,
      });
      return;
    }

    // 3 or more parts: last two parts are Qty and Rate, preceding parts joined as Description
    const rawRate = parts[parts.length - 1];
    const rawQty = parts[parts.length - 2];
    const desc = parts.slice(0, parts.length - 2).join(', ').trim();

    const qty = Number(rawQty);
    const rate = Number(rawRate);

    if (!desc) {
      results.push({
        lineNumber,
        rawLine: trimmed,
        valid: false,
        description: '',
        qty: '',
        rate: '',
        amount: 0,
        isManualAmount: false,
        error: 'Product description is missing.',
      });
      return;
    }

    if (rawQty === '' || !Number.isFinite(qty) || qty <= 0) {
      results.push({
        lineNumber,
        rawLine: trimmed,
        valid: false,
        description: desc,
        qty: '',
        rate: '',
        amount: 0,
        isManualAmount: false,
        error: `Invalid quantity "${rawQty}". Quantity must be greater than 0.`,
      });
      return;
    }

    if (rawRate === '' || !Number.isFinite(rate) || rate < 0) {
      results.push({
        lineNumber,
        rawLine: trimmed,
        valid: false,
        description: desc,
        qty,
        rate: '',
        amount: 0,
        isManualAmount: false,
        error: `Invalid rate "${rawRate}". Rate must be 0 or greater.`,
      });
      return;
    }

    results.push({
      lineNumber,
      rawLine: trimmed,
      valid: true,
      description: desc,
      qty,
      rate,
      amount: Math.round(qty * rate * 100) / 100,
      isManualAmount: false,
    });
  });

  return results;
}

/**
 * Merges parsed valid bulk candidates after existing populated rows, preserving existing products
 * and renumbering serial numbers automatically.
 */
export function mergeBulkItemsIntoInvoice(
  existingItems: InvoiceLineItem[],
  candidates: BulkParseCandidate[],
  productsCatalogue: Product[] = [],
  idGenerator: () => string = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
): InvoiceLineItem[] {
  const validCandidates = candidates.filter((c) => c.valid);
  if (validCandidates.length === 0) {
    return renumberLineItems(existingItems);
  }

  const populatedExisting = existingItems.filter(
    (item) =>
      item.description.trim() !== '' ||
      item.amount > 0 ||
      (item.qty !== '' && Number(item.qty) > 0) ||
      (item.rate !== '' && Number(item.rate) > 0)
  );

  const appendedItems: InvoiceLineItem[] = validCandidates.map((cand, index) => {
    const matchedProduct = productsCatalogue.find(
      (p) => p.name.trim().toLowerCase() === cand.description.trim().toLowerCase()
    );
    return {
      id: idGenerator(),
      srNo: populatedExisting.length + index + 1,
      productId: matchedProduct?.id,
      description: cand.description,
      qty: cand.qty,
      rate: cand.rate,
      amount: cand.amount,
      isManualAmount: cand.isManualAmount,
      purchaseCostSnapshot: matchedProduct?.purchaseCost,
    };
  });

  const combined = renumberLineItems([...populatedExisting, ...appendedItems]);
  return combined;
}

/**
 * Reconciles product stock when an invoice is created, updated, or cancelled/refunded.
 * Uses invoice.stockDeductedMap to guarantee idempotency (saving the same invoice twice
 * never deducts stock twice, and cancelling/reversing restores the exact deducted stock).
 */
export function reconcileStockForInvoice(params: {
  products: Product[];
  invoice: InvoiceRecord;
  previousDeductedMap?: Record<string, number>;
  timestamp?: string;
}): {
  updatedProducts: Product[];
  newDeductedMap: Record<string, number>;
  movements: StockMovement[];
} {
  const now = params.timestamp || new Date().toISOString();
  const prevMap: Record<string, number> = { ...(params.previousDeductedMap || {}) };
  const targetMap: Record<string, number> = {};

  if (params.invoice.status === 'Active') {
    for (const item of params.invoice.items) {
      if (!item.productId) continue;
      if (item.description.trim() === '' && item.amount <= 0) continue;
      const qtyNum = item.qty === '' ? 1 : Math.max(0, Number(item.qty) || 0);
      if (qtyNum > 0) {
        targetMap[item.productId] = (targetMap[item.productId] || 0) + qtyNum;
      }
    }
  }

  const allProductIds = new Set([...Object.keys(prevMap), ...Object.keys(targetMap)]);
  const movements: StockMovement[] = [];

  const updatedProducts = params.products.map((product) => {
    if (!allProductIds.has(product.id)) return product;

    const previouslyDeducted = prevMap[product.id] || 0;
    const newlyRequired = targetMap[product.id] || 0;
    const additionalDeduction = newlyRequired - previouslyDeducted;

    if (additionalDeduction === 0) {
      return product;
    }

    const newStock = Math.max(0, product.stock - additionalDeduction);
    const actualDelta = newStock - product.stock;

    let movementType: StockMovement['type'] = 'SALE';
    let note = `Invoice ${params.invoice.billNumber} sale`;
    if (params.invoice.status !== 'Active' && additionalDeduction < 0) {
      movementType = 'CANCELLATION_RESTORE';
      note = `Restored from ${params.invoice.status.toLowerCase()} invoice ${params.invoice.billNumber}`;
    } else if (previouslyDeducted > 0) {
      movementType = 'EDIT_ADJUSTMENT';
      note = `Adjusted on editing invoice ${params.invoice.billNumber}`;
    }

    movements.push({
      id: `mov-${Date.now()}-${product.id}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: movementType,
      quantityDelta: actualDelta,
      stockAfter: newStock,
      referenceBillNumber: params.invoice.billNumber,
      timestamp: now,
      note,
    });

    return {
      ...product,
      stock: newStock,
      updatedAt: now,
    };
  });

  return {
    updatedProducts,
    newDeductedMap: targetMap,
    movements,
  };
}

/**
 * Calculates real customer ledger summaries from saved invoices and payment entries.
 */
export function computeCustomerLedgers(
  customers: CustomerProfile[],
  invoices: InvoiceRecord[],
  payments: CustomerPaymentEntry[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): CustomerLedgerSummary[] {
  return customers.map((customer) => {
    const normPhone = customer.phone.replace(/\D/g, '');
    const normName = customer.name.trim().toLowerCase();

    const customerInvoices = invoices.filter((inv) => {
      if (inv.status !== 'Active') return false;
      if (inv.customerId && inv.customerId === customer.id) return true;
      const invPhone = inv.customerPhone.replace(/\D/g, '');
      if (normPhone && invPhone && normPhone === invPhone) return true;
      return inv.customerName.trim().toLowerCase() === normName;
    });

    const customerPayments = payments.filter((pay) => {
      if (pay.customerId === customer.id) return true;
      const payPhone = pay.customerPhone.replace(/\D/g, '');
      if (normPhone && payPhone && normPhone === payPhone) return true;
      return pay.customerName.trim().toLowerCase() === normName;
    });

    const totalBilled = customerInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
    const paidOnInvoices = customerInvoices.reduce((s, inv) => s + inv.totalReceivedOnBill, 0);
    const ledgerPaymentsReceived = customerPayments.reduce((s, pay) => s + pay.amount, 0);
    const totalReceived = Math.round((paidOnInvoices + ledgerPaymentsReceived) * 100) / 100;
    const outstandingBalance = Math.max(0, Math.round((totalBilled - totalReceived) * 100) / 100);

    // Find earliest due date from active unpaid invoices or customer profile
    const dueDates = customerInvoices
      .filter((inv) => inv.balanceDue > 0 && inv.dueDate)
      .map((inv) => inv.dueDate!)
      .concat(customer.optionalDueDate ? [customer.optionalDueDate] : [])
      .sort();

    const earliestDueDate = dueDates[0];
    let dueStatus: CustomerLedgerSummary['dueStatus'] = 'Clear';
    if (outstandingBalance > 0) {
      if (earliestDueDate && earliestDueDate < todayStr) {
        dueStatus = 'Overdue';
      } else {
        dueStatus = 'Due';
      }
    }

    return {
      customer,
      totalBilled: Math.round(totalBilled * 100) / 100,
      paidOnInvoices: Math.round(paidOnInvoices * 100) / 100,
      ledgerPaymentsReceived: Math.round(ledgerPaymentsReceived * 100) / 100,
      totalReceived,
      outstandingBalance,
      invoiceCount: customerInvoices.length,
      dueStatus,
      earliestDueDate,
    };
  });
}

/**
 * Estimates profit for active invoices where purchase costs are known (from item snapshot or product lookup).
 */
export function calculateEstimatedProfit(
  invoices: InvoiceRecord[],
  products: Product[]
): { estimatedProfit: number; costCoveredSales: number; itemsWithCostCount: number } {
  const productById = new Map(products.map((p) => [p.id, p]));
  const productByName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

  let estimatedProfit = 0;
  let costCoveredSales = 0;
  let itemsWithCostCount = 0;

  for (const inv of invoices) {
    if (inv.status !== 'Active') continue;
    const discountRatio = inv.subtotal > 0 ? Math.max(0, (inv.subtotal - inv.discount) / inv.subtotal) : 1;

    for (const item of inv.items) {
      if (!item.description.trim() && item.amount <= 0) continue;
      const matched =
        (item.productId ? productById.get(item.productId) : undefined) ||
        productByName.get(item.description.trim().toLowerCase());

      const unitCost =
        typeof item.purchaseCostSnapshot === 'number' && item.purchaseCostSnapshot > 0
          ? item.purchaseCostSnapshot
          : matched?.purchaseCost || 0;

      if (unitCost > 0) {
        const qty = item.qty === '' ? 1 : Math.max(1, Number(item.qty) || 1);
        const totalCost = unitCost * qty;
        const effectiveRevenue = item.amount * discountRatio;
        estimatedProfit += effectiveRevenue - totalCost;
        costCoveredSales += effectiveRevenue;
        itemsWithCostCount += 1;
      }
    }
  }

  return {
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    costCoveredSales: Math.round(costCoveredSales * 100) / 100,
    itemsWithCostCount,
  };
}

/**
 * Validates a JSON backup object before restoring to prevent corrupting shop data.
 */
export function validateBackupPayload(raw: unknown): {
  valid: boolean;
  error?: string;
  payload?: BackupDataPayload;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Backup file must be a valid JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.settings || typeof obj.settings !== 'object') {
    return { valid: false, error: 'Missing or invalid "settings" section in backup file.' };
  }
  const settings = obj.settings as Record<string, unknown>;
  if (typeof settings.shopName !== 'string' || !settings.shopName.trim()) {
    return { valid: false, error: 'Backup settings must contain a valid shopName.' };
  }
  if (!Array.isArray(obj.products)) {
    return { valid: false, error: 'Missing or invalid "products" array in backup file.' };
  }
  if (!Array.isArray(obj.invoices)) {
    return { valid: false, error: 'Missing or invalid "invoices" array in backup file.' };
  }
  if (!Array.isArray(obj.customers)) {
    return { valid: false, error: 'Missing or invalid "customers" array in backup file.' };
  }
  if (!Array.isArray(obj.payments)) {
    return { valid: false, error: 'Missing or invalid "payments" array in backup file.' };
  }

  // Validate individual invoices have billNumber and items array
  for (const inv of obj.invoices as Record<string, unknown>[]) {
    if (!inv || typeof inv.billNumber !== 'string' || !Array.isArray(inv.items)) {
      return {
        valid: false,
        error: 'One or more invoices in the backup file are missing billNumber or items.',
      };
    }
  }

  return {
    valid: true,
    payload: {
      version: typeof obj.version === 'number' ? obj.version : 1,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      shop: typeof obj.shop === 'string' ? obj.shop : String(settings.shopName),
      settings: obj.settings as BackupDataPayload['settings'],
      products: obj.products as Product[],
      stockMovements: Array.isArray(obj.stockMovements) ? (obj.stockMovements as StockMovement[]) : [],
      invoices: obj.invoices as InvoiceRecord[],
      customers: obj.customers as CustomerProfile[],
      payments: obj.payments as CustomerPaymentEntry[],
    },
  };
}
