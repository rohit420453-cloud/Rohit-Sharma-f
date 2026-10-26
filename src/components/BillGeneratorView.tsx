import React, { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlertCircle,
  CheckCircle2,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  CustomerProfile,
  InvoiceDesign,
  InvoiceLineItem,
  InvoiceRecord,
  PaymentMethod,
  Product,
  ProductTextAlign,
  ShopSettings,
} from '../types/billing';
import {
  calculateInvoiceTotals,
  calculateLineItem,
  formatINR,
  INVOICE_TEMPLATES,
  mergeBulkItemsIntoInvoice,
  parseBulkAddInput,
  renumberLineItems,
} from '../utils/billingLogic';

interface BillGeneratorViewProps {
  draftInvoice: InvoiceRecord;
  isEditingExisting: boolean;
  settings: ShopSettings;
  products: Product[];
  customers: CustomerProfile[];
  onChangeDraft: (updated: InvoiceRecord) => void;
  onSaveInvoice: (invoice: InvoiceRecord) => { ok: boolean; message: string; savedInvoice?: InvoiceRecord };
  onResetToNewBill: () => void;
  onOpenAiPromptModal: () => void;
  onOpenShareModal: (invoice: InvoiceRecord) => void;
}

const FONT_FAMILIES = [
  { label: 'Sans (Plus Jakarta)', value: 'Plus Jakarta Sans, sans-serif' },
  { label: 'Serif (Playfair Display)', value: 'Playfair Display, Georgia, serif' },
  { label: 'Classic Serif (Georgia)', value: 'Georgia, serif' },
  { label: 'Monospace (Tabular)', value: 'JetBrains Mono, monospace' },
  { label: 'Clean Arial', value: 'Arial, Helvetica, sans-serif' },
];

const FONT_SIZES = [13, 14, 15, 16, 18, 20];

interface TemplateThemeConfig {
  sheetContainerClass: string;
  tableBorderClass: string;
  theadRowClass: string;
  cellBorderRightClass: string;
  tbodyRowClass: string;
  totalRowClass: string;
  signatureRightTitleClass: string;
}

function getTemplateThemeConfig(design: InvoiceDesign): TemplateThemeConfig {
  switch (design) {
    case 'classic':
      return {
        sheetContainerClass: 'bg-white text-black border-2 border-stone-900 shadow-lg p-4 sm:p-8',
        tableBorderClass: 'border-[1.5px] border-black',
        theadRowClass: 'border-b-[1.5px] border-black bg-stone-50 text-black font-extrabold',
        cellBorderRightClass: 'border-r-[1.5px] border-black',
        tbodyRowClass: 'border-b border-black hover:bg-amber-50/30',
        totalRowClass: 'border-t-[1.5px] border-black font-extrabold text-black bg-stone-50/60',
        signatureRightTitleClass: 'text-[#b91c1c] font-extrabold',
      };
    case 'modern':
      return {
        sheetContainerClass: 'bg-white text-stone-900 border border-stone-300 shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border border-stone-300',
        theadRowClass: 'border-b border-stone-300 bg-stone-900 text-white font-semibold',
        cellBorderRightClass: 'border-r border-stone-200',
        tbodyRowClass: 'border-b border-stone-200 hover:bg-stone-50',
        totalRowClass: 'border-t-2 border-stone-900 font-bold text-stone-900 bg-stone-100',
        signatureRightTitleClass: 'text-stone-900 font-extrabold',
      };
    case 'royal-gold':
      return {
        sheetContainerClass:
          'bg-[#FFFCF5] text-stone-900 border-4 border-double border-amber-700 shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border-2 border-amber-800',
        theadRowClass: 'border-b-2 border-amber-800 bg-amber-900 text-amber-50 font-bold',
        cellBorderRightClass: 'border-r border-amber-700/50',
        tbodyRowClass: 'border-b border-amber-200 hover:bg-amber-50/50',
        totalRowClass: 'border-t-2 border-amber-800 font-extrabold text-amber-950 bg-amber-100/70',
        signatureRightTitleClass: 'text-amber-900 font-extrabold',
      };
    case 'gst-vyapar':
      return {
        sheetContainerClass: 'bg-white text-slate-900 border-2 border-slate-800 shadow-lg p-4 sm:p-6',
        tableBorderClass: 'border-2 border-slate-800',
        theadRowClass: 'border-b-2 border-slate-800 bg-slate-200 text-slate-900 font-extrabold',
        cellBorderRightClass: 'border-r border-slate-700',
        tbodyRowClass: 'border-b border-slate-400 hover:bg-slate-50',
        totalRowClass: 'border-t-2 border-slate-800 font-extrabold text-slate-900 bg-slate-100',
        signatureRightTitleClass: 'text-slate-900 font-extrabold',
      };
    case 'minimal-ivory':
      return {
        sheetContainerClass: 'bg-white text-stone-900 border border-stone-200 shadow-md p-6 sm:p-10',
        tableBorderClass: 'border-t border-b border-stone-300',
        theadRowClass:
          'border-b-2 border-stone-800 bg-transparent text-stone-700 uppercase tracking-wider font-bold',
        cellBorderRightClass: 'border-r border-transparent',
        tbodyRowClass: 'border-b border-stone-200/80 hover:bg-stone-50/70',
        totalRowClass: 'border-t-2 border-stone-900 font-bold text-stone-900 bg-stone-50/80',
        signatureRightTitleClass: 'text-stone-800 font-bold',
      };
    case 'emerald-heritage':
      return {
        sheetContainerClass: 'bg-white text-stone-900 border-2 border-emerald-900 shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border border-emerald-800',
        theadRowClass: 'border-b border-emerald-900 bg-emerald-900 text-white font-bold',
        cellBorderRightClass: 'border-r border-emerald-200',
        tbodyRowClass: 'border-b border-emerald-100 hover:bg-emerald-50/40',
        totalRowClass:
          'border-t-2 border-emerald-900 font-extrabold text-emerald-950 bg-emerald-50/80',
        signatureRightTitleClass: 'text-emerald-900 font-extrabold',
      };
    case 'navy-corporate':
      return {
        sheetContainerClass: 'bg-white text-slate-900 border-2 border-blue-950 shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border border-blue-900',
        theadRowClass: 'border-b border-blue-950 bg-blue-950 text-white font-bold',
        cellBorderRightClass: 'border-r border-blue-200',
        tbodyRowClass: 'border-b border-blue-100 even:bg-blue-50/25 hover:bg-blue-50/60',
        totalRowClass: 'border-t-2 border-blue-950 font-extrabold text-blue-950 bg-blue-50',
        signatureRightTitleClass: 'text-blue-950 font-extrabold',
      };
    case 'woodcraft-rustic':
      return {
        sheetContainerClass:
          'bg-[#FDFBF7] text-stone-900 border-2 border-[#5C2D0C] shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border-[1.5px] border-[#5C2D0C]',
        theadRowClass: 'border-b-[1.5px] border-[#5C2D0C] bg-[#5C2D0C] text-amber-100 font-bold',
        cellBorderRightClass: 'border-r border-[#8B5A2B]/40',
        tbodyRowClass: 'border-b border-[#8B5A2B]/30 hover:bg-amber-50/40',
        totalRowClass:
          'border-t-2 border-[#5C2D0C] font-extrabold text-[#4A2208] bg-amber-100/50',
        signatureRightTitleClass: 'text-[#5C2D0C] font-extrabold',
      };
    case 'compact-retail':
      return {
        sheetContainerClass: 'bg-white text-black border-2 border-black shadow-md p-3 sm:p-5',
        tableBorderClass: 'border-[1.5px] border-black',
        theadRowClass: 'border-b-[1.5px] border-black bg-stone-100 text-black font-extrabold',
        cellBorderRightClass: 'border-r border-black',
        tbodyRowClass: 'border-b border-stone-400 hover:bg-stone-50',
        totalRowClass: 'border-t-[1.5px] border-black font-extrabold text-black bg-stone-100',
        signatureRightTitleClass: 'text-black font-extrabold',
      };
    case 'bold-maroon':
      return {
        sheetContainerClass: 'bg-white text-stone-900 border-2 border-rose-950 shadow-lg p-5 sm:p-8',
        tableBorderClass: 'border border-rose-900',
        theadRowClass: 'border-b border-rose-950 bg-rose-950 text-amber-200 font-bold',
        cellBorderRightClass: 'border-r border-rose-200',
        tbodyRowClass: 'border-b border-rose-100 hover:bg-rose-50/40',
        totalRowClass: 'border-t-2 border-rose-950 font-extrabold text-rose-950 bg-rose-50/80',
        signatureRightTitleClass: 'text-rose-950 font-extrabold',
      };
    case '3d-royal-emboss':
      return {
        sheetContainerClass:
          'bg-[#FFFDF7] text-stone-900 border-t-2 border-l-2 border-amber-400 border-b-[6px] border-r-[6px] border-amber-900 shadow-[8px_8px_0px_#78350f,0_18px_30px_rgba(0,0,0,0.16)] p-5 sm:p-8',
        tableBorderClass:
          'border-2 border-amber-900 shadow-[4px_4px_0px_#92400e]',
        theadRowClass:
          'border-b-2 border-amber-950 bg-gradient-to-b from-amber-700 to-amber-900 text-amber-50 font-extrabold',
        cellBorderRightClass: 'border-r border-amber-800/40',
        tbodyRowClass: 'border-b border-amber-300/70 hover:bg-amber-50/60',
        totalRowClass:
          'border-t-2 border-amber-900 font-extrabold text-amber-950 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100',
        signatureRightTitleClass: 'text-amber-900 font-extrabold',
      };
    case '3d-teak-carved':
      return {
        sheetContainerClass:
          'bg-[#FCF8F2] text-stone-900 border-t-2 border-l-2 border-[#A0522D] border-b-[7px] border-r-[7px] border-[#3E1C05] shadow-[8px_8px_0px_#2A1202,0_18px_30px_rgba(0,0,0,0.2)] p-5 sm:p-8',
        tableBorderClass:
          'border-2 border-[#3E1C05] shadow-[4px_4px_0px_#3E1C05]',
        theadRowClass:
          'border-b-2 border-[#2A1202] bg-gradient-to-b from-[#6E350F] to-[#3E1C05] text-amber-100 font-extrabold',
        cellBorderRightClass: 'border-r border-[#6E350F]/40',
        tbodyRowClass: 'border-b border-[#8B5A2B]/35 hover:bg-amber-50/50',
        totalRowClass:
          'border-t-2 border-[#3E1C05] font-extrabold text-[#3E1C05] bg-[#F3E5D0]',
        signatureRightTitleClass: 'text-[#3E1C05] font-extrabold',
      };
    case '3d-layered-stack':
      return {
        sheetContainerClass:
          'bg-white text-stone-900 border-2 border-stone-900 shadow-[5px_5px_0px_#fafaf9,7px_7px_0px_#1c1917,12px_12px_0px_#e7e5e4,14px_14px_0px_#1c1917] p-5 sm:p-8',
        tableBorderClass:
          'border-2 border-stone-900 shadow-[5px_5px_0px_#1c1917]',
        theadRowClass:
          'border-b-2 border-stone-900 bg-stone-900 text-white font-extrabold',
        cellBorderRightClass: 'border-r border-stone-300',
        tbodyRowClass: 'border-b border-stone-200 hover:bg-stone-50',
        totalRowClass:
          'border-t-2 border-stone-900 font-extrabold text-stone-900 bg-amber-50/80',
        signatureRightTitleClass: 'text-stone-900 font-extrabold',
      };
    case '3d-metallic-prism':
      return {
        sheetContainerClass:
          'bg-gradient-to-br from-white via-slate-50/70 to-slate-100 text-slate-900 border-t-2 border-l-2 border-slate-300 border-b-[6px] border-r-[6px] border-slate-900 shadow-[8px_8px_0px_#0f172a,0_18px_30px_rgba(15,23,42,0.18)] p-5 sm:p-8',
        tableBorderClass:
          'border-2 border-slate-900 shadow-[4px_4px_0px_#334155]',
        theadRowClass:
          'border-b-2 border-slate-950 bg-gradient-to-b from-slate-700 to-slate-950 text-white font-extrabold',
        cellBorderRightClass: 'border-r border-slate-300',
        tbodyRowClass: 'border-b border-slate-200 hover:bg-white',
        totalRowClass:
          'border-t-2 border-slate-900 font-extrabold text-slate-950 bg-slate-200/80',
        signatureRightTitleClass: 'text-slate-900 font-extrabold',
      };
    case '3d-emerald-vault':
      return {
        sheetContainerClass:
          'bg-[#F9FEFC] text-stone-900 border-t-2 border-l-2 border-emerald-400 border-b-[6px] border-r-[6px] border-emerald-950 shadow-[8px_8px_0px_#022c22,0_18px_30px_rgba(4,120,87,0.16)] p-5 sm:p-8',
        tableBorderClass:
          'border-2 border-emerald-950 shadow-[4px_4px_0px_#064e3b]',
        theadRowClass:
          'border-b-2 border-emerald-950 bg-gradient-to-b from-emerald-800 to-emerald-950 text-emerald-50 font-extrabold',
        cellBorderRightClass: 'border-r border-emerald-800/30',
        tbodyRowClass: 'border-b border-emerald-200/70 hover:bg-emerald-50/50',
        totalRowClass:
          'border-t-2 border-emerald-950 font-extrabold text-emerald-950 bg-emerald-100/70',
        signatureRightTitleClass: 'text-emerald-950 font-extrabold',
      };
  }
}

export const BillGeneratorView: React.FC<BillGeneratorViewProps> = ({
  draftInvoice,
  isEditingExisting,
  settings,
  products,
  customers,
  onChangeDraft,
  onSaveInvoice,
  onResetToNewBill,
  onOpenAiPromptModal,
  onOpenShareModal,
}) => {
  const [bulkText, setBulkText] = useState('');
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const sym = settings.currencySymbol || '₹';

  // Live recalculation of financial totals
  const totals = useMemo(
    () =>
      calculateInvoiceTotals({
        items: draftInvoice.items,
        discount: draftInvoice.discount,
        taxPercent: draftInvoice.taxPercent,
        advancePaid: draftInvoice.advancePaid,
        paidAmount: draftInvoice.paidAmount,
        isCancelledOrRefunded: draftInvoice.status !== 'Active',
      }),
    [
      draftInvoice.items,
      draftInvoice.discount,
      draftInvoice.taxPercent,
      draftInvoice.advancePaid,
      draftInvoice.paidAmount,
      draftInvoice.status,
    ]
  );

  // Sync calculated totals onto current invoice object for actions
  const currentFullInvoice: InvoiceRecord = useMemo(
    () => ({
      ...draftInvoice,
      ...totals,
    }),
    [draftInvoice, totals]
  );

  // Live Bulk Add parsing & validation
  const bulkCandidates = useMemo(() => parseBulkAddInput(bulkText), [bulkText]);
  const validBulkCount = bulkCandidates.filter((c) => c.valid).length;
  const invalidBulkCount = bulkCandidates.filter((c) => !c.valid).length;

  const updateField = <K extends keyof InvoiceRecord>(key: K, value: InvoiceRecord[K]) => {
    const next = { ...currentFullInvoice, [key]: value, updatedAt: new Date().toISOString() };
    const nextTotals = calculateInvoiceTotals({
      items: next.items,
      discount: next.discount,
      taxPercent: next.taxPercent,
      advancePaid: next.advancePaid,
      paidAmount: next.paidAmount,
      isCancelledOrRefunded: next.status !== 'Active',
    });
    onChangeDraft({ ...next, ...nextTotals });
  };

  const handleLineChange = (
    rowIndex: number,
    field: 'description' | 'qty' | 'rate' | 'amount' | 'productId',
    rawValue: string
  ) => {
    const updatedItems = currentFullInvoice.items.map((item, idx) => {
      if (idx !== rowIndex) return item;

      if (field === 'productId') {
        const chosenProd = products.find((p) => p.id === rawValue);
        if (!chosenProd) {
          return { ...item, productId: undefined };
        }
        const currentQty = item.qty === '' || Number(item.qty) <= 0 ? 1 : Number(item.qty);
        const calc = calculateLineItem(
          {
            qty: currentQty,
            rate: chosenProd.sellingPrice,
            amount: item.amount,
            isManualAmount: false,
          },
          'rate'
        );
        return {
          ...item,
          productId: chosenProd.id,
          description: chosenProd.name,
          qty: calc.qty,
          rate: calc.rate,
          amount: calc.amount,
          isManualAmount: false,
          purchaseCostSnapshot: chosenProd.purchaseCost,
        };
      }

      if (field === 'description') {
        const matchedProd = products.find(
          (p) => p.name.trim().toLowerCase() === rawValue.trim().toLowerCase()
        );
        if (matchedProd) {
          const defaultQty = item.qty === '' || Number(item.qty) <= 0 ? 1 : Number(item.qty);
          const calc = calculateLineItem(
            {
              qty: defaultQty,
              rate: matchedProd.sellingPrice,
              amount: item.amount,
              isManualAmount: false,
            },
            'rate'
          );
          return {
            ...item,
            productId: matchedProd.id,
            description: rawValue,
            qty: calc.qty,
            rate: calc.rate,
            amount: calc.amount,
            isManualAmount: false,
            purchaseCostSnapshot: matchedProd.purchaseCost,
          };
        }
        return { ...item, description: rawValue, productId: undefined };
      }

      // Numeric fields: prevent negative numbers
      if (rawValue.trim() === '') {
        const emptyUpdated = { ...item, [field]: field === 'amount' ? 0 : '' };
        const calc = calculateLineItem(emptyUpdated, field);
        return { ...item, ...calc };
      }

      const parsedNum = Number(rawValue);
      if (!Number.isFinite(parsedNum) || parsedNum < 0) {
        return item;
      }

      const candidate = { ...item, [field]: parsedNum };
      const calc = calculateLineItem(candidate, field);
      return { ...item, ...calc };
    });

    updateField('items', renumberLineItems(updatedItems));
  };

  const handleAddRow = () => {
    const newRow: InvoiceLineItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      srNo: currentFullInvoice.items.length + 1,
      description: '',
      qty: '',
      rate: '',
      amount: 0,
      isManualAmount: false,
    };
    updateField('items', renumberLineItems([...currentFullInvoice.items, newRow]));
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (currentFullInvoice.items.length <= 1) {
      updateField('items', [
        {
          id: `row-${Date.now()}`,
          srNo: 1,
          description: '',
          qty: '',
          rate: '',
          amount: 0,
          isManualAmount: false,
        },
      ]);
      return;
    }
    const next = currentFullInvoice.items.filter((_, idx) => idx !== rowIndex);
    updateField('items', renumberLineItems(next));
  };

  const handleSelectCustomer = (customerId: string) => {
    if (!customerId) {
      updateField('customerId', undefined);
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const next: InvoiceRecord = {
      ...currentFullInvoice,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address,
      dueDate: cust.optionalDueDate || currentFullInvoice.dueDate,
    };
    onChangeDraft(next);
  };

  const handleApplyBulkAdd = () => {
    if (validBulkCount === 0) {
      setBannerMessage({
        type: 'error',
        text: 'No valid product lines found to add. Check the format examples below.',
      });
      return;
    }

    const merged = mergeBulkItemsIntoInvoice(
      currentFullInvoice.items,
      bulkCandidates,
      products
    );
    updateField('items', merged);

    if (invalidBulkCount > 0) {
      const remainingInvalidLines = bulkCandidates
        .filter((c) => !c.valid)
        .map((c) => c.rawLine)
        .join('\n');
      setBulkText(remainingInvalidLines);
      setBannerMessage({
        type: 'warning',
        text: `Added ${validBulkCount} valid product(s) to invoice. ${invalidBulkCount} invalid line(s) were kept in the Bulk Add box for you to fix.`,
      });
    } else {
      setBulkText('');
      setBannerMessage({
        type: 'success',
        text: `Successfully added ${validBulkCount} product(s) to the bill and renumbered serial numbers.`,
      });
    }
  };

  const handleSaveClick = () => {
    const result = onSaveInvoice(currentFullInvoice);
    setBannerMessage({
      type: result.ok ? 'success' : 'error',
      text: result.message,
    });
  };

  const handlePrintClick = () => {
    window.print();
  };

  const hasPopulatedData = useMemo(() => {
    const hasItems = currentFullInvoice.items.some(
      (i) => i.description.trim() !== '' || i.amount > 0
    );
    const hasCustomer =
      currentFullInvoice.customerName.trim() !== '' ||
      currentFullInvoice.customerPhone.trim() !== '';
    return hasItems || hasCustomer;
  }, [currentFullInvoice]);

  const handleRequestClearOrNew = () => {
    if (hasPopulatedData && !isEditingExisting) {
      setConfirmClearOpen(true);
    } else {
      onResetToNewBill();
      setBannerMessage({ type: 'success', text: 'Ready for a fresh invoice.' });
    }
  };

  const activeDesign: InvoiceDesign = currentFullInvoice.invoiceDesign || 'classic';
  const themeCfg = getTemplateThemeConfig(activeDesign);
  const currentTemplateMeta =
    INVOICE_TEMPLATES.find((t) => t.id === activeDesign) || INVOICE_TEMPLATES[0];

  // Shared Header Rendering for all 10 Distinct Bill Templates
  const renderInvoiceHeaderByTemplate = () => {
    switch (activeDesign) {
      case 'classic':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-black">
              <div className="flex items-center gap-1.5">
                <span>Bill No :</span>
                <input
                  type="text"
                  aria-label="Invoice Bill Number"
                  value={currentFullInvoice.billNumber}
                  onChange={(e) => updateField('billNumber', e.target.value)}
                  className="font-mono font-bold w-28 border-b border-transparent hover:border-stone-400 focus:border-black focus:outline-none bg-transparent text-black"
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span>Mob :</span>
                <input
                  type="text"
                  aria-label="Shop Mobile Number"
                  value={currentFullInvoice.shopPhone}
                  onChange={(e) => updateField('shopPhone', e.target.value)}
                  className="font-mono font-bold w-28 sm:w-32 text-right border-b border-transparent hover:border-stone-400 focus:border-black focus:outline-none bg-transparent text-black"
                />
              </div>
            </div>

            <div className="text-center py-1">
              <input
                type="text"
                aria-label="Shop Name"
                value={currentFullInvoice.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                className="w-full text-center font-serif-invoice text-3xl sm:text-5xl font-extrabold tracking-wide text-[#b91c1c] bg-transparent border-b border-transparent hover:border-red-300 focus:border-red-700 focus:outline-none uppercase"
              />
            </div>

            <div className="mx-auto max-w-2xl border-[1.5px] border-black px-2 sm:px-3 py-1.5 text-center">
              <input
                type="text"
                aria-label="Shop Address"
                value={currentFullInvoice.shopAddress}
                onChange={(e) => updateField('shopAddress', e.target.value)}
                className="w-full text-center text-[11px] sm:text-base font-bold text-black bg-transparent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 items-start">
              <div className="sm:col-span-7 space-y-1.5">
                <div className="text-sm font-bold text-black">To,</div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Customer Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full border-b border-black pb-1 text-sm sm:text-base font-semibold text-black placeholder:text-stone-400 bg-transparent focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    aria-label="Customer Address"
                    placeholder="Address / Area"
                    value={currentFullInvoice.customerAddress}
                    onChange={(e) => updateField('customerAddress', e.target.value)}
                    className="w-full border-b border-black pb-1 text-xs sm:text-sm text-black placeholder:text-stone-400 bg-transparent focus:outline-none"
                  />
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Customer Mobile No."
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="w-full border-b border-black pb-1 text-xs sm:text-sm font-mono text-black placeholder:text-stone-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-5 flex flex-col sm:items-end justify-end space-y-2 pt-1 sm:pt-5">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <label htmlFor="invoice-date-input" className="text-sm font-bold text-black">
                    Date :
                  </label>
                  <input
                    id="invoice-date-input"
                    type="date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="border-b border-black pb-0.5 text-sm font-mono font-semibold text-black bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="text-center pt-2 pb-1">
              <span className="inline-block text-sm sm:text-base font-extrabold tracking-wider text-black border-b-2 border-black px-1">
                {settings.subHeading || 'SUB : BILL'}
              </span>
            </div>
          </div>
        );

      case 'royal-gold':
        return (
          <div className="space-y-3 pb-4">
            <div className="rounded-lg bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-50 p-4 sm:p-6 border border-amber-600 text-center space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                <span>SHREE GANESHAY NAMAH</span>
                <div className="flex items-center gap-1">
                  <span>Mob:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono font-bold w-28 text-right bg-transparent text-amber-100 focus:outline-none"
                  />
                </div>
              </div>
              <input
                type="text"
                aria-label="Shop Name"
                value={currentFullInvoice.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                className="w-full text-center font-display-brand text-2xl sm:text-4xl font-extrabold tracking-widest text-amber-300 bg-transparent focus:outline-none uppercase"
              />
              <input
                type="text"
                aria-label="Shop Address"
                value={currentFullInvoice.shopAddress}
                onChange={(e) => updateField('shopAddress', e.target.value)}
                className="w-full text-center text-xs sm:text-sm font-medium text-amber-100 bg-transparent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-lg border-2 border-amber-800/70 bg-amber-50/50">
              <div className="sm:col-span-8 space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Customer Details
                </div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Customer Full Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full border-b border-amber-800/40 pb-1 text-sm sm:text-base font-bold text-stone-900 bg-transparent focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    aria-label="Customer Address"
                    placeholder="Delivery Address"
                    value={currentFullInvoice.customerAddress}
                    onChange={(e) => updateField('customerAddress', e.target.value)}
                    className="w-full border-b border-amber-800/40 pb-1 text-xs sm:text-sm text-stone-800 bg-transparent focus:outline-none"
                  />
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Customer Mobile"
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="w-full border-b border-amber-800/40 pb-1 text-xs sm:text-sm font-mono text-stone-900 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-4 flex flex-col justify-between sm:border-l border-amber-800/30 sm:pl-4 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Royal Showroom Invoice
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span>Bill No:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono w-24 text-right bg-transparent border-b border-amber-800/40 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span>Date:</span>
                  <input
                    type="date"
                    aria-label="Invoice Date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'gst-vyapar':
        return (
          <div className="border-2 border-slate-800 border-b-0">
            <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>TAX / COMMERCIAL INVOICE</span>
              <span>ORIGINAL FOR RECIPIENT</span>
            </div>
            <div className="p-3 sm:p-4 text-center border-b-2 border-slate-800 space-y-1">
              <input
                type="text"
                aria-label="Shop Name"
                value={currentFullInvoice.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                className="w-full text-center text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 bg-transparent focus:outline-none uppercase"
              />
              <input
                type="text"
                aria-label="Shop Address"
                value={currentFullInvoice.shopAddress}
                onChange={(e) => updateField('shopAddress', e.target.value)}
                className="w-full text-center text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
              />
              <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold text-slate-900">
                <span>Contact Mobile:</span>
                <input
                  type="text"
                  aria-label="Shop Mobile Number"
                  value={currentFullInvoice.shopPhone}
                  onChange={(e) => updateField('shopPhone', e.target.value)}
                  className="font-mono w-28 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-800 bg-slate-50/50">
              <div className="sm:col-span-7 p-3 space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase text-slate-600">
                  Buyer / Billed To:
                </div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Buyer Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full border-b border-slate-300 pb-0.5 text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Customer Address"
                  placeholder="Buyer Address"
                  value={currentFullInvoice.customerAddress}
                  onChange={(e) => updateField('customerAddress', e.target.value)}
                  className="w-full border-b border-slate-300 pb-0.5 text-xs text-slate-800 bg-transparent focus:outline-none"
                />
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span>Phone:</span>
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Mobile Number"
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="flex-1 font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <span className="font-bold text-slate-600">Invoice No:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono font-bold text-right w-28 bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <span className="font-bold text-slate-600">Invoice Date:</span>
                  <input
                    type="date"
                    aria-label="Invoice Date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="font-mono font-semibold bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Payment Mode:</span>
                  <span className="font-bold text-slate-900">{currentFullInvoice.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'minimal-ivory':
        return (
          <div className="pb-6 mb-4 border-b border-stone-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Invoice Statement
                </div>
                <input
                  type="text"
                  aria-label="Shop Name"
                  value={currentFullInvoice.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  className="w-full text-2xl sm:text-4xl font-light tracking-tight text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
              <div className="sm:text-right font-mono text-xs text-stone-600 space-y-1">
                <div className="flex sm:justify-end items-center gap-1.5">
                  <span className="text-stone-400">NO.</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-bold text-stone-900 w-24 sm:text-right bg-transparent focus:outline-none"
                  />
                </div>
                <input
                  type="date"
                  aria-label="Invoice Date"
                  value={currentFullInvoice.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="bg-transparent text-stone-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-stone-200 text-xs">
              <div className="space-y-1">
                <div className="uppercase tracking-wider text-stone-400 font-semibold">From</div>
                <input
                  type="text"
                  aria-label="Shop Address"
                  value={currentFullInvoice.shopAddress}
                  onChange={(e) => updateField('shopAddress', e.target.value)}
                  className="w-full text-stone-700 bg-transparent focus:outline-none"
                />
                <div className="flex items-center gap-1 text-stone-700">
                  <span>Tel:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="uppercase tracking-wider text-stone-400 font-semibold">
                  Billed To
                </div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Client Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full font-semibold text-sm text-stone-900 border-b border-stone-200 pb-0.5 bg-transparent focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    aria-label="Customer Address"
                    placeholder="Client Address"
                    value={currentFullInvoice.customerAddress}
                    onChange={(e) => updateField('customerAddress', e.target.value)}
                    className="w-full text-stone-600 border-b border-stone-200 pb-0.5 bg-transparent focus:outline-none"
                  />
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Client Phone"
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="w-full font-mono text-stone-600 border-b border-stone-200 pb-0.5 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'emerald-heritage':
      case 'navy-corporate':
      case 'bold-maroon': {
        const bannerBg =
          activeDesign === 'emerald-heritage'
            ? 'bg-emerald-900 text-white border-emerald-950'
            : activeDesign === 'navy-corporate'
            ? 'bg-blue-950 text-white border-blue-950'
            : 'bg-rose-950 text-amber-100 border-rose-950';
        const subBoxBg =
          activeDesign === 'emerald-heritage'
            ? 'bg-emerald-50/60 border-emerald-800/30'
            : activeDesign === 'navy-corporate'
            ? 'bg-blue-50/60 border-blue-900/30'
            : 'bg-rose-50/60 border-rose-900/30';

        return (
          <div className="space-y-3 pb-3">
            <div className={`rounded-lg p-4 sm:p-6 ${bannerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="space-y-1 flex-1">
                <input
                  type="text"
                  aria-label="Shop Name"
                  value={currentFullInvoice.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  className="w-full font-display-brand text-2xl sm:text-4xl font-extrabold tracking-wide bg-transparent focus:outline-none uppercase"
                />
                <input
                  type="text"
                  aria-label="Shop Address"
                  value={currentFullInvoice.shopAddress}
                  onChange={(e) => updateField('shopAddress', e.target.value)}
                  className="w-full text-xs sm:text-sm opacity-90 bg-transparent focus:outline-none"
                />
              </div>
              <div className="sm:text-right text-xs sm:text-sm space-y-1 shrink-0">
                <div className="flex sm:justify-end items-center gap-1 font-bold">
                  <span>Mob:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono w-28 sm:text-right bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex sm:justify-end items-center gap-1 font-bold">
                  <span>Bill #:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono w-24 sm:text-right bg-transparent border-b border-white/40 focus:outline-none"
                  />
                </div>
                <div className="flex sm:justify-end items-center gap-1">
                  <span>Date:</span>
                  <input
                    type="date"
                    aria-label="Invoice Date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className={`p-3.5 rounded-lg border ${subBoxBg} grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm`}>
              <div>
                <span className="block text-[11px] font-bold uppercase opacity-70">
                  Customer Name
                </span>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Enter Customer Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full mt-0.5 font-bold text-stone-900 border-b border-stone-400/60 pb-0.5 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase opacity-70">
                  Mobile Number
                </span>
                <input
                  type="tel"
                  aria-label="Customer Phone Number"
                  placeholder="Customer Mobile"
                  value={currentFullInvoice.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="w-full mt-0.5 font-mono font-semibold text-stone-900 border-b border-stone-400/60 pb-0.5 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase opacity-70">
                  Address / Location
                </span>
                <input
                  type="text"
                  aria-label="Customer Address"
                  placeholder="Delivery Address"
                  value={currentFullInvoice.customerAddress}
                  onChange={(e) => updateField('customerAddress', e.target.value)}
                  className="w-full mt-0.5 text-stone-900 border-b border-stone-400/60 pb-0.5 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'woodcraft-rustic':
        return (
          <div className="space-y-3 pb-3">
            <div className="border-y-4 border-double border-[#5C2D0C] py-3 text-center space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#5C2D0C]">
                <div className="flex items-center gap-1">
                  <span>No:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono w-24 bg-transparent border-b border-[#5C2D0C] focus:outline-none"
                  />
                </div>
                <span className="uppercase tracking-widest text-[11px]">
                  Fine Furniture &amp; Interior Craft
                </span>
                <div className="flex items-center gap-1">
                  <span>Mob:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono w-28 text-right bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <input
                type="text"
                aria-label="Shop Name"
                value={currentFullInvoice.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                className="w-full text-center font-serif-invoice text-3xl sm:text-5xl font-extrabold tracking-wide text-[#4A2208] bg-transparent focus:outline-none uppercase"
              />
              <input
                type="text"
                aria-label="Shop Address"
                value={currentFullInvoice.shopAddress}
                onChange={(e) => updateField('shopAddress', e.target.value)}
                className="w-full text-center text-xs sm:text-sm font-bold text-[#5C2D0C] bg-transparent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
              <div className="sm:col-span-8 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#5C2D0C] shrink-0">M/s :</span>
                  <input
                    type="text"
                    aria-label="Customer Name"
                    placeholder="Customer Name"
                    value={currentFullInvoice.customerName}
                    onChange={(e) => updateField('customerName', e.target.value)}
                    className="w-full border-b border-[#5C2D0C] pb-0.5 text-sm font-bold text-stone-900 bg-transparent focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    aria-label="Customer Address"
                    placeholder="Address"
                    value={currentFullInvoice.customerAddress}
                    onChange={(e) => updateField('customerAddress', e.target.value)}
                    className="w-full border-b border-[#5C2D0C] pb-0.5 text-xs text-stone-800 bg-transparent focus:outline-none"
                  />
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Phone"
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="w-full border-b border-[#5C2D0C] pb-0.5 text-xs font-mono text-stone-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-4 flex items-center sm:justify-end gap-2">
                <span className="text-xs font-extrabold text-[#5C2D0C]">Date:</span>
                <input
                  type="date"
                  aria-label="Invoice Date"
                  value={currentFullInvoice.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="border-b border-[#5C2D0C] pb-0.5 text-xs font-mono font-bold bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'compact-retail':
        return (
          <div className="space-y-2 pb-2 border-b-2 border-black">
            <div className="flex items-center justify-between text-xs font-bold border-b border-black pb-1">
              <span className="px-2 py-0.5 bg-black text-white uppercase tracking-wider text-[10px]">
                CASH / CREDIT MEMO
              </span>
              <div className="flex items-center gap-1">
                <span>Mob:</span>
                <input
                  type="text"
                  aria-label="Shop Mobile Number"
                  value={currentFullInvoice.shopPhone}
                  onChange={(e) => updateField('shopPhone', e.target.value)}
                  className="font-mono font-bold w-28 text-right bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="text-center">
              <input
                type="text"
                aria-label="Shop Name"
                value={currentFullInvoice.shopName}
                onChange={(e) => updateField('shopName', e.target.value)}
                className="w-full text-center text-2xl sm:text-3xl font-black tracking-tight text-black bg-transparent focus:outline-none uppercase"
              />
              <input
                type="text"
                aria-label="Shop Address"
                value={currentFullInvoice.shopAddress}
                onChange={(e) => updateField('shopAddress', e.target.value)}
                className="w-full text-center text-[11px] sm:text-xs font-bold text-stone-800 bg-transparent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs border-t border-black">
              <div>
                <span className="font-bold">Bill No: </span>
                <input
                  type="text"
                  aria-label="Invoice Bill Number"
                  value={currentFullInvoice.billNumber}
                  onChange={(e) => updateField('billNumber', e.target.value)}
                  className="font-mono font-bold w-20 border-b border-stone-400 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <span className="font-bold">Date: </span>
                <input
                  type="date"
                  aria-label="Invoice Date"
                  value={currentFullInvoice.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="font-mono bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Customer Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full font-bold border-b border-stone-400 bg-transparent focus:outline-none"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="tel"
                  aria-label="Customer Phone Number"
                  placeholder="Mobile"
                  value={currentFullInvoice.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="w-1/2 font-mono border-b border-stone-400 bg-transparent focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Customer Address"
                  placeholder="Area"
                  value={currentFullInvoice.customerAddress}
                  onChange={(e) => updateField('customerAddress', e.target.value)}
                  className="w-1/2 border-b border-stone-400 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case '3d-royal-emboss':
      case '3d-teak-carved':
      case '3d-layered-stack':
      case '3d-metallic-prism':
      case '3d-emerald-vault': {
        const plaqueStyles: Record<
          string,
          {
            plaqueBox: string;
            badgeClass: string;
            badgeLabel: string;
            shopTitleClass: string;
            subCardClass: string;
            invoiceChipClass: string;
          }
        > = {
          '3d-royal-emboss': {
            plaqueBox:
              'rounded-xl bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 text-amber-50 border-t-2 border-l-2 border-amber-400 border-b-[6px] border-r-[6px] border-amber-950 shadow-[6px_6px_0px_#78350f] p-4 sm:p-6',
            badgeClass:
              'bg-amber-400 text-amber-950 border-b-2 border-r-2 border-amber-950 shadow-[2px_2px_0px_#451a03]',
            badgeLabel: '3D ROYAL GOLD PLAQUE · ORIGINAL',
            shopTitleClass:
              'text-amber-200 drop-shadow-[0_3px_0_rgba(69,26,3,0.95)] tracking-widest',
            subCardClass:
              'rounded-xl bg-amber-50/90 border-2 border-amber-900 shadow-[5px_5px_0px_#92400e] p-3.5',
            invoiceChipClass:
              'rounded-lg bg-white border-2 border-amber-900 shadow-[3px_3px_0px_#78350f] p-3',
          },
          '3d-teak-carved': {
            plaqueBox:
              'rounded-xl bg-gradient-to-b from-[#6E350F] via-[#4A2208] to-[#2A1202] text-amber-100 border-t-2 border-l-2 border-[#B87333] border-b-[6px] border-r-[6px] border-[#1F0D01] shadow-[6px_6px_0px_#2A1202] p-4 sm:p-6',
            badgeClass:
              'bg-[#D29046] text-[#2A1202] border-b-2 border-r-2 border-[#1F0D01] shadow-[2px_2px_0px_#1F0D01]',
            badgeLabel: '3D CARVED TEAK BLOCK · HANDCRAFTED',
            shopTitleClass:
              'text-[#FDE68A] drop-shadow-[0_3px_0_rgba(31,13,1,0.95)] tracking-wider',
            subCardClass:
              'rounded-xl bg-[#F6EADA] border-2 border-[#3E1C05] shadow-[5px_5px_0px_#3E1C05] p-3.5',
            invoiceChipClass:
              'rounded-lg bg-[#FFFDF9] border-2 border-[#3E1C05] shadow-[3px_3px_0px_#3E1C05] p-3',
          },
          '3d-layered-stack': {
            plaqueBox:
              'rounded-xl bg-stone-900 text-white border-2 border-stone-950 shadow-[5px_5px_0px_#d97706,8px_8px_0px_#1c1917] p-4 sm:p-6',
            badgeClass:
              'bg-amber-400 text-stone-950 border-2 border-stone-950 shadow-[2px_2px_0px_#000]',
            badgeLabel: '3D LAYERED DECK · COMMERCIAL BILL',
            shopTitleClass:
              'text-white drop-shadow-[0_3px_0_rgba(217,119,6,0.85)] tracking-wide',
            subCardClass:
              'rounded-xl bg-stone-50 border-2 border-stone-900 shadow-[5px_5px_0px_#1c1917] p-3.5',
            invoiceChipClass:
              'rounded-lg bg-amber-50 border-2 border-stone-900 shadow-[3px_3px_0px_#1c1917] p-3',
          },
          '3d-metallic-prism': {
            plaqueBox:
              'rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white border-t-2 border-l-2 border-slate-400 border-b-[6px] border-r-[6px] border-slate-950 shadow-[6px_6px_0px_#1e293b] p-4 sm:p-6',
            badgeClass:
              'bg-slate-200 text-slate-950 border-b-2 border-r-2 border-slate-950 shadow-[2px_2px_0px_#0f172a]',
            badgeLabel: '3D CHROME & OBSIDIAN · EXECUTIVE',
            shopTitleClass:
              'text-slate-100 drop-shadow-[0_3px_0_rgba(2,6,23,0.95)] tracking-wider',
            subCardClass:
              'rounded-xl bg-slate-100/90 border-2 border-slate-900 shadow-[5px_5px_0px_#334155] p-3.5',
            invoiceChipClass:
              'rounded-lg bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] p-3',
          },
          '3d-emerald-vault': {
            plaqueBox:
              'rounded-xl bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 text-emerald-50 border-t-2 border-l-2 border-emerald-400 border-b-[6px] border-r-[6px] border-emerald-950 shadow-[6px_6px_0px_#022c22] p-4 sm:p-6',
            badgeClass:
              'bg-amber-300 text-emerald-950 border-b-2 border-r-2 border-emerald-950 shadow-[2px_2px_0px_#022c22]',
            badgeLabel: '3D EMERALD JEWEL VAULT · SHOWROOM',
            shopTitleClass:
              'text-emerald-100 drop-shadow-[0_3px_0_rgba(2,44,34,0.95)] tracking-widest',
            subCardClass:
              'rounded-xl bg-emerald-50/80 border-2 border-emerald-950 shadow-[5px_5px_0px_#064e3b] p-3.5',
            invoiceChipClass:
              'rounded-lg bg-white border-2 border-emerald-950 shadow-[3px_3px_0px_#022c22] p-3',
          },
        };

        const st = plaqueStyles[activeDesign] || plaqueStyles['3d-royal-emboss'];

        return (
          <div className="space-y-4 pb-4">
            {/* 3D Extruded Header Plaque */}
            <div className={st.plaqueBox}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${st.badgeClass}`}
                >
                  {st.badgeLabel}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="opacity-80">Mob:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono font-extrabold w-28 sm:w-32 text-right bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-center py-1">
                <input
                  type="text"
                  aria-label="Shop Name"
                  value={currentFullInvoice.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  className={`w-full text-center font-display-brand text-2xl sm:text-4xl font-black uppercase bg-transparent focus:outline-none ${st.shopTitleClass}`}
                />
                <input
                  type="text"
                  aria-label="Shop Address"
                  value={currentFullInvoice.shopAddress}
                  onChange={(e) => updateField('shopAddress', e.target.value)}
                  className="w-full text-center text-xs sm:text-sm font-semibold opacity-95 bg-transparent mt-1 focus:outline-none"
                />
              </div>
            </div>

            {/* 3D Raised Customer & Invoice Number Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
              <div className={`sm:col-span-8 space-y-2 ${st.subCardClass}`}>
                <div className="text-[11px] font-black uppercase tracking-wider text-stone-700">
                  Billed To Customer
                </div>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Enter Customer Full Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full border-b-2 border-stone-900/40 pb-1 text-sm sm:text-base font-extrabold text-stone-900 bg-transparent focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    aria-label="Customer Address"
                    placeholder="Delivery Address / City"
                    value={currentFullInvoice.customerAddress}
                    onChange={(e) => updateField('customerAddress', e.target.value)}
                    className="w-full border-b border-stone-800/40 pb-1 text-xs sm:text-sm font-medium text-stone-800 bg-transparent focus:outline-none"
                  />
                  <input
                    type="tel"
                    aria-label="Customer Phone Number"
                    placeholder="Customer Mobile No."
                    value={currentFullInvoice.customerPhone}
                    onChange={(e) => updateField('customerPhone', e.target.value)}
                    className="w-full border-b border-stone-800/40 pb-1 text-xs sm:text-sm font-mono font-bold text-stone-900 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className={`sm:col-span-4 flex flex-col justify-between space-y-2 ${st.invoiceChipClass}`}>
                <div className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                  3D Voucher Details
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold text-stone-900">
                  <span>Bill No:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono font-black w-24 text-right border-b border-stone-400 bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900">
                  <span>Date:</span>
                  <input
                    type="date"
                    aria-label="Invoice Date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'modern':
      default:
        return (
          <div className="pb-5 mb-4 border-b-2 border-stone-900">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <input
                  type="text"
                  aria-label="Shop Name"
                  value={currentFullInvoice.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  className="w-full font-display-brand text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 bg-transparent focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Shop Address"
                  value={currentFullInvoice.shopAddress}
                  onChange={(e) => updateField('shopAddress', e.target.value)}
                  className="w-full text-xs sm:text-sm text-stone-600 bg-transparent focus:outline-none"
                />
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-800">
                  <span>Phone:</span>
                  <input
                    type="text"
                    aria-label="Shop Mobile Number"
                    value={currentFullInvoice.shopPhone}
                    onChange={(e) => updateField('shopPhone', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:text-right space-y-1.5 bg-stone-50 p-3.5 rounded-lg border border-stone-200">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Tax / Commercial Invoice
                </div>
                <div className="flex items-center sm:justify-end gap-2 text-sm font-bold">
                  <span className="text-stone-500">Invoice #:</span>
                  <input
                    type="text"
                    aria-label="Invoice Bill Number"
                    value={currentFullInvoice.billNumber}
                    onChange={(e) => updateField('billNumber', e.target.value)}
                    className="font-mono w-28 sm:text-right bg-transparent border-b border-stone-300 focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center sm:justify-end gap-2 text-xs">
                  <span className="text-stone-500 font-semibold">Date:</span>
                  <input
                    type="date"
                    aria-label="Invoice Date"
                    value={currentFullInvoice.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500">
                  Billed To (Customer Name)
                </label>
                <input
                  type="text"
                  aria-label="Customer Name"
                  placeholder="Enter Customer Name"
                  value={currentFullInvoice.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full mt-0.5 border-b border-stone-300 pb-1 text-sm font-semibold text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  aria-label="Customer Phone Number"
                  placeholder="10-digit Mobile"
                  value={currentFullInvoice.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="w-full mt-0.5 border-b border-stone-300 pb-1 text-sm font-mono text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500">
                  Delivery Address
                </label>
                <input
                  type="text"
                  aria-label="Customer Address"
                  placeholder="Area / Street Address"
                  value={currentFullInvoice.customerAddress}
                  onChange={(e) => updateField('customerAddress', e.target.value)}
                  className="w-full mt-0.5 border-b border-stone-300 pb-1 text-sm text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Non-Print Control Panel */}
      <div className="no-print rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
              <span>
                {isEditingExisting
                  ? `Editing Saved Invoice ${currentFullInvoice.billNumber}`
                  : `Creating Invoice ${currentFullInvoice.billNumber}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>Template: {currentTemplateMeta.code}. {currentTemplateMeta.name}</span>
              <span aria-hidden="true">·</span>
              <span>Draft auto-saved locally</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              Smart Bill Generator
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{isEditingExisting ? 'Update Saved Bill' : 'Save Bill'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareModal(currentFullInvoice)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Share WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onOpenAiPromptModal}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Bulk Image to Add</span>
            </button>

            <button
              type="button"
              onClick={handleRequestClearOrNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>{isEditingExisting ? 'New Bill' : 'Clear / Reset'}</span>
            </button>
          </div>
        </div>

        {/* 15 Bill Templates Interactive Quick-Selector Strip (10 Standard + 5 3D) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
              <LayoutTemplate className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Choose Bill Template (15 Ready-to-Print Designs — 10 Classic + 5 3D Edition)</span>
            </div>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline">
              Active: {currentTemplateMeta.code}. {currentTemplateMeta.name} — {currentTemplateMeta.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {INVOICE_TEMPLATES.map((tpl) => {
              const isSelected = activeDesign === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => updateField('invoiceDesign', tpl.id)}
                  className={`text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/50 text-stone-900 dark:text-white ring-1 ring-amber-600'
                      : tpl.is3D
                      ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/30 dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:border-amber-500 shadow-[2px_2px_0px_rgba(180,83,9,0.25)]'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 text-stone-700 dark:text-stone-300 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] font-bold opacity-75">{tpl.code}</span>
                      {tpl.is3D && (
                        <span className="px-1 py-0.2 rounded bg-amber-700 text-white font-mono text-[9px] font-extrabold uppercase leading-none">
                          3D
                        </span>
                      )}
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: tpl.accentColor }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="text-[11px] font-semibold leading-tight mt-1 truncate w-full">
                    {tpl.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance, Font & Customer Quick-Fill Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
          {/* Template Dropdown Selector */}
          <div>
            <label
              htmlFor="invoice-template-select"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Invoice Layout Template
            </label>
            <select
              id="invoice-template-select"
              value={activeDesign}
              onChange={(e) => updateField('invoiceDesign', e.target.value as InvoiceDesign)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-semibold"
            >
              {INVOICE_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.code}. {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Font Family */}
          <div>
            <label
              htmlFor="product-font-family-select"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Product Font Family
            </label>
            <select
              id="product-font-family-select"
              value={currentFullInvoice.productFontFamily}
              onChange={(e) => updateField('productFontFamily', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-medium"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Font Size & Alignment */}
          <div>
            <label
              htmlFor="product-font-size-select"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Product Text Size &amp; Align
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="product-font-size-select"
                aria-label="Product Font Size"
                value={currentFullInvoice.productFontSize}
                onChange={(e) => updateField('productFontSize', Number(e.target.value))}
                className="flex-1 px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-mono"
              >
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}px
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg border border-stone-300 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-950">
                <button
                  type="button"
                  onClick={() => updateField('productTextAlign', 'left' as ProductTextAlign)}
                  aria-label="Align product text left"
                  title="Left align product description"
                  className={`p-1.5 rounded ${
                    currentFullInvoice.productTextAlign === 'left'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateField('productTextAlign', 'center' as ProductTextAlign)}
                  aria-label="Align product text center"
                  title="Center align product description"
                  className={`p-1.5 rounded ${
                    currentFullInvoice.productTextAlign === 'center'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500'
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Saved Customer Quick Select */}
          <div>
            <label
              htmlFor="saved-customer-picker"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Fill from Saved Customer
            </label>
            <div className="relative">
              <select
                id="saved-customer-picker"
                value={currentFullInvoice.customerId || ''}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-medium"
              >
                <option value="">-- Walk-in / New Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Udhaar Due Date */}
          <div>
            <label
              htmlFor="invoice-due-date"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Udhaar Due Date (Optional)
            </label>
            <input
              id="invoice-due-date"
              type="date"
              value={currentFullInvoice.dueDate || ''}
              onChange={(e) => updateField('dueDate', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-mono"
            />
          </div>
        </div>

        {/* Status Feedback Banner */}
        {bannerMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-xs sm:text-sm font-medium border ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : bannerMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Datalist of saved products for quick typing autocomplete */}
      <datalist id="rohit-furniture-product-catalogue">
        {products.map((p) => (
          <option key={p.id} value={p.name}>
            {formatINR(p.sellingPrice, sym)} · Stock: {p.stock}
          </option>
        ))}
      </datalist>

      {/* =====================================================================
          PRINTABLE A4 INVOICE SHEET (#printable-invoice-area)
         ===================================================================== */}
      <div
        id="printable-invoice-area"
        data-template={activeDesign}
        className={`mx-auto max-w-4xl rounded-xl transition-all ${themeCfg.sheetContainerClass}`}
      >
        {/* Dynamic Header for all 10 Templates */}
        {renderInvoiceHeaderByTemplate()}

        {/* LINE ITEMS TABLE */}
        <div className={activeDesign === 'gst-vyapar' ? 'overflow-x-auto' : 'mt-2 overflow-x-auto'}>
          <table className={`w-full border-collapse ${themeCfg.tableBorderClass}`}>
            <thead>
              <tr className={`text-[11px] sm:text-sm ${themeCfg.theadRowClass}`}>
                <th
                  className={`py-2 px-1 sm:px-2 text-center w-9 sm:w-14 ${themeCfg.cellBorderRightClass}`}
                >
                  Sr.
                </th>
                <th className={`py-2 px-1.5 sm:px-3 text-center ${themeCfg.cellBorderRightClass}`}>
                  Description
                </th>
                <th
                  className={`py-2 px-1 sm:px-2 text-center w-11 sm:w-20 ${themeCfg.cellBorderRightClass}`}
                >
                  Qty
                </th>
                <th
                  className={`py-2 px-1 sm:px-2 text-center w-16 sm:w-28 ${themeCfg.cellBorderRightClass}`}
                >
                  Rate
                </th>
                <th className="py-2 px-1 sm:px-2 text-center w-20 sm:w-32">Amount</th>
                <th className="no-print py-2 px-1 text-center w-8 sm:w-10 bg-stone-100 text-stone-600">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>

            <tbody
              style={{
                fontFamily: currentFullInvoice.productFontFamily,
                fontSize: `${currentFullInvoice.productFontSize}px`,
              }}
            >
              {currentFullInvoice.items.map((item, idx) => (
                <tr key={item.id} className={themeCfg.tbodyRowClass}>
                  {/* Sr. No. */}
                  <td
                    className={`py-2 px-1 sm:px-2 text-center font-mono font-semibold text-black ${themeCfg.cellBorderRightClass}`}
                  >
                    {item.srNo}
                  </td>

                  {/* Description + Catalogue Picker */}
                  <td className={`py-1.5 px-1.5 sm:px-2.5 ${themeCfg.cellBorderRightClass}`}>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        list="rohit-furniture-product-catalogue"
                        aria-label={`Row ${item.srNo} Product Description`}
                        placeholder="Furniture item..."
                        value={item.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        style={{ textAlign: currentFullInvoice.productTextAlign }}
                        className="w-full font-medium text-black placeholder:text-stone-400 bg-transparent focus:outline-none"
                      />
                      <div className="no-print flex items-center justify-between gap-1">
                        <select
                          aria-label={`Row ${item.srNo} Select Catalogue Product`}
                          value={item.productId || ''}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                          className="text-[10px] sm:text-[11px] text-stone-500 bg-stone-100 hover:bg-stone-200 rounded px-1 py-0.5 max-w-[115px] sm:max-w-[240px] truncate focus:outline-none"
                        >
                          <option value="">Catalogue quick-fill...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatINR(p.sellingPrice, sym)} ({p.stock} in stock)
                            </option>
                          ))}
                        </select>
                        {item.isManualAmount && (
                          <span className="text-[10px] text-amber-700 font-sans hidden sm:inline">
                            Direct amount
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Qty */}
                  <td className={`py-1.5 px-1 sm:px-2 ${themeCfg.cellBorderRightClass}`}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      aria-label={`Row ${item.srNo} Quantity`}
                      placeholder="-"
                      value={item.qty}
                      onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                      className="w-full text-center font-mono tabular-nums text-black placeholder:text-stone-300 bg-transparent focus:outline-none"
                    />
                  </td>

                  {/* Rate */}
                  <td className={`py-1.5 px-1 sm:px-2 ${themeCfg.cellBorderRightClass}`}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      aria-label={`Row ${item.srNo} Rate`}
                      placeholder="-"
                      value={item.rate}
                      onChange={(e) => handleLineChange(idx, 'rate', e.target.value)}
                      className="w-full text-center font-mono tabular-nums text-black placeholder:text-stone-300 bg-transparent focus:outline-none"
                    />
                  </td>

                  {/* Amount (Auto Qty x Rate OR Manually Editable) */}
                  <td className="py-1.5 px-1 sm:px-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      aria-label={`Row ${item.srNo} Amount`}
                      value={item.amount === 0 && !item.description ? '' : item.amount}
                      placeholder="0"
                      onChange={(e) => handleLineChange(idx, 'amount', e.target.value)}
                      className="w-full text-center font-mono tabular-nums font-bold text-black placeholder:text-stone-300 bg-transparent focus:outline-none"
                    />
                  </td>

                  {/* Remove Row button (No Print) */}
                  <td className="no-print py-1.5 px-1 text-center bg-stone-50/70">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      aria-label={`Remove row ${item.srNo}`}
                      title="Remove Row"
                      className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW INSIDE TABLE */}
              <tr className={`text-sm sm:text-base ${themeCfg.totalRowClass}`}>
                <td className={`py-2 ${themeCfg.cellBorderRightClass}`} />
                <td
                  className={`py-2 px-3 text-right text-xs font-semibold text-stone-600 ${themeCfg.cellBorderRightClass}`}
                >
                  {totals.discount > 0 || totals.taxAmount > 0 ? (
                    <span>
                      Subtotal: {formatINR(totals.subtotal, sym)}
                      {totals.discount > 0 ? ` · Disc: -${formatINR(totals.discount, sym)}` : ''}
                      {totals.taxAmount > 0 ? ` · Tax: +${formatINR(totals.taxAmount, sym)}` : ''}
                    </span>
                  ) : null}
                </td>
                <td className={`py-2 ${themeCfg.cellBorderRightClass}`} />
                <td
                  className={`py-2.5 px-2 text-center font-extrabold tracking-wide ${themeCfg.cellBorderRightClass}`}
                >
                  TOTAL
                </td>
                <td className="py-2.5 px-2 text-center font-mono tabular-nums text-base sm:text-lg font-extrabold text-black">
                  {formatINR(totals.grandTotal, sym)}
                </td>
                <td className="no-print bg-stone-100" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Row / Clear Empty Rows Bar (No Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nonEmpty = currentFullInvoice.items.filter(
                  (i) => i.description.trim() !== '' || i.amount > 0
                );
                updateField(
                  'items',
                  nonEmpty.length > 0
                    ? renumberLineItems(nonEmpty)
                    : [
                        {
                          id: `row-${Date.now()}`,
                          srNo: 1,
                          description: '',
                          qty: '',
                          rate: '',
                          amount: 0,
                          isManualAmount: false,
                        },
                      ]
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Remove Blank Rows</span>
            </button>
          </div>

          <span className="text-xs text-stone-500">
            Tip: Qty × Rate calculates automatically, or type directly into Amount.
          </span>
        </div>

        {/* Discount, Advance, Paid, Payment Method & Balance Breakdown */}
        <div className="mt-4 pt-3 border-t border-stone-300 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Rupees in Words + Payment Status */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 text-sm text-black">
              <span className="font-extrabold shrink-0">Rupees :</span>
              <span className="font-semibold border-b border-black pb-0.5 flex-1">
                {totals.amountInWords}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-stone-800">
              <span>Payment Mode: {currentFullInvoice.paymentMethod}</span>
              <span aria-hidden="true">·</span>
              <span>Received: {formatINR(totals.totalReceivedOnBill, sym)}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  totals.balanceDue > 0 ? 'text-red-700 font-bold' : 'text-emerald-800 font-bold'
                }
              >
                {totals.balanceDue > 0
                  ? `Balance Due (Udhaar): ${formatINR(totals.balanceDue, sym)}`
                  : 'Status: PAID IN FULL'}
              </span>
            </div>

            <div className="no-print">
              <input
                type="text"
                aria-label="Invoice Notes"
                placeholder="Optional bill note (delivery remarks, warranty, Udhaar promise date)..."
                value={currentFullInvoice.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-stone-300 text-xs text-stone-800 bg-stone-50 focus:outline-none"
              />
            </div>
            {currentFullInvoice.notes && (
              <div className="hidden print:block text-xs text-stone-700">
                Note: {currentFullInvoice.notes}
              </div>
            )}
          </div>

          {/* Interactive Financial Adjustments Box */}
          <div className="no-print md:col-span-5 rounded-lg border border-stone-200 bg-stone-50 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bill-discount-input" className="font-semibold text-stone-700">
                Discount ({sym})
              </label>
              <input
                id="bill-discount-input"
                type="number"
                min="0"
                step="any"
                value={currentFullInvoice.discount === 0 ? '' : currentFullInvoice.discount}
                placeholder="0"
                onChange={(e) =>
                  updateField('discount', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 px-2.5 py-1 rounded border border-stone-300 bg-white text-right font-mono font-semibold text-black"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bill-tax-input" className="font-semibold text-stone-700">
                GST / Tax (%)
              </label>
              <input
                id="bill-tax-input"
                type="number"
                min="0"
                max="100"
                step="any"
                value={currentFullInvoice.taxPercent === 0 ? '' : currentFullInvoice.taxPercent}
                placeholder="0%"
                onChange={(e) =>
                  updateField('taxPercent', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 px-2.5 py-1 rounded border border-stone-300 bg-white text-right font-mono font-semibold text-black"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200">
              <label htmlFor="bill-advance-input" className="font-semibold text-stone-700">
                Advance Paid ({sym})
              </label>
              <input
                id="bill-advance-input"
                type="number"
                min="0"
                step="any"
                value={currentFullInvoice.advancePaid === 0 ? '' : currentFullInvoice.advancePaid}
                placeholder="0"
                onChange={(e) =>
                  updateField('advancePaid', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 px-2.5 py-1 rounded border border-stone-300 bg-white text-right font-mono font-semibold text-black"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor="bill-paid-input" className="font-semibold text-stone-700">
                  Paid Now ({sym})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const remainingAfterAdvance = Math.max(
                      0,
                      totals.grandTotal - currentFullInvoice.advancePaid
                    );
                    updateField('paidAmount', remainingAfterAdvance);
                  }}
                  className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold transition-colors"
                >
                  Full Paid
                </button>
              </div>
              <input
                id="bill-paid-input"
                type="number"
                min="0"
                step="any"
                value={currentFullInvoice.paidAmount === 0 ? '' : currentFullInvoice.paidAmount}
                placeholder="0"
                onChange={(e) =>
                  updateField('paidAmount', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 px-2.5 py-1 rounded border border-stone-300 bg-white text-right font-mono font-semibold text-black"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bill-payment-method" className="font-semibold text-stone-700">
                Payment Method
              </label>
              <select
                id="bill-payment-method"
                value={currentFullInvoice.paymentMethod}
                onChange={(e) => updateField('paymentMethod', e.target.value as PaymentMethod)}
                className="w-28 px-2 py-1 rounded border border-stone-300 bg-white text-stone-900 font-semibold"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-300 text-sm font-bold">
              <span className="text-stone-800">Balance Due (Udhaar):</span>
              <span
                className={`font-mono tabular-nums ${
                  totals.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {formatINR(totals.balanceDue, sym)}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Footer ("Thanking you," and "For ROHIT FURNITURE / PROPRIETOR") */}
        <div className="mt-8 pt-4 flex items-end justify-between text-black">
          <div className="text-sm sm:text-base font-medium">Thanking you,</div>
          <div className="text-right space-y-8">
            <div className={`text-sm sm:text-base ${themeCfg.signatureRightTitleClass}`}>
              For {currentFullInvoice.shopName}
            </div>
            <div className="text-xs sm:text-sm font-extrabold tracking-wider">
              {settings.proprietorTitle || 'PROPRIETOR'}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BULK ADD PRODUCTS SECTION (Bottom of Page)
         ===================================================================== */}
      <div className="no-print rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-700 dark:text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Bulk Add Products
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Enter one product per line using <code className="font-mono">Product, Qty, Rate</code> or{' '}
              <code className="font-mono">Product, Amount</code>. Appends after existing populated rows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setBulkText('Rack, 6, 200\nTable, 2, 1500\nRack, 2000')
              }
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Fill Sample Format
            </button>
            <button
              type="button"
              onClick={onOpenAiPromptModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Bulk Image to Add</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 space-y-2">
            <label
              htmlFor="bulk-add-textarea"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Paste or Type Product Lines
            </label>
            <textarea
              id="bulk-add-textarea"
              rows={5}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Rack, 6, 200\nTable, 2, 1500\nRack, 2000`}
              className="w-full p-3.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {bulkCandidates.length === 0
                  ? 'No lines entered yet'
                  : `${validBulkCount} valid · ${invalidBulkCount} need attention`}
              </span>
              <div className="flex items-center gap-2">
                {bulkText.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setBulkText('')}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Clear Box
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApplyBulkAdd}
                  disabled={validBulkCount === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {validBulkCount > 0 ? `${validBulkCount} ` : ''}Products to Bill</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Review / Validation Preview Table */}
          <div className="lg:col-span-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
              <span>Live Parse &amp; Validation Preview</span>
              {bulkCandidates.length > 0 && (
                <span className="font-mono">
                  Total Preview:{' '}
                  {formatINR(
                    bulkCandidates
                      .filter((c) => c.valid)
                      .reduce((s, c) => s + c.amount, 0),
                    sym
                  )}
                </span>
              )}
            </div>

            {bulkCandidates.length === 0 ? (
              <div className="p-6 text-xs text-stone-500 dark:text-stone-400 space-y-1">
                <p className="font-medium text-stone-700 dark:text-stone-300">
                  Supported Bulk Formats:
                </p>
                <p className="font-mono">Rack, 6, 200 → Qty 6 × Rate ₹200 = ₹1,200</p>
                <p className="font-mono">Table, 2, 1500 → Qty 2 × Rate ₹1,500 = ₹3,000</p>
                <p className="font-mono">Rack, 2000 → Direct Amount = ₹2,000</p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                {bulkCandidates.map((cand) => (
                  <div
                    key={cand.lineNumber}
                    className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                      cand.valid
                        ? 'text-stone-800 dark:text-stone-200'
                        : 'bg-red-50/80 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        Line {cand.lineNumber}:{' '}
                        {cand.valid ? (
                          <span>
                            {cand.description}{' '}
                            {cand.qty !== '' && cand.rate !== ''
                              ? `(Qty: ${cand.qty} × ${formatINR(Number(cand.rate), sym)})`
                              : '(Direct Amount)'}
                          </span>
                        ) : (
                          <span className="font-mono">{cand.rawLine}</span>
                        )}
                      </div>
                      {!cand.valid && (
                        <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                          {cand.error}
                        </div>
                      )}
                    </div>
                    <div className="font-mono tabular-nums font-bold shrink-0">
                      {cand.valid ? formatINR(cand.amount, sym) : 'Invalid'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal before clearing populated invoice */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print"
          onClick={() => setConfirmClearOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-clear-bill-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 id="confirm-clear-bill-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                Clear Current Unsaved Bill?
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              This invoice currently contains product or customer entries. Clearing it will reset the form to a blank bill.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearOpen(false);
                  onResetToNewBill();
                  setBannerMessage({ type: 'success', text: 'Invoice cleared.' });
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Yes, Clear Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
