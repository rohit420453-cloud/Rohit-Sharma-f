import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  BackupDataPayload,
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceDesign,
  InvoiceRecord,
  Product,
  ProductTextAlign,
  ShopSettings,
  StockMovement,
} from '../types/billing';
import { INVOICE_TEMPLATES, validateBackupPayload } from '../utils/billingLogic';
import { exportBackupJSON, exportRowsToCSV, getTodayISO } from '../utils/storage';

interface SettingsBackupViewProps {
  settings: ShopSettings;
  products: Product[];
  stockMovements: StockMovement[];
  invoices: InvoiceRecord[];
  customers: CustomerProfile[];
  payments: CustomerPaymentEntry[];
  onSaveSettings: (newSettings: ShopSettings) => void;
  onRestoreBackup: (payload: BackupDataPayload) => void;
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({
  settings,
  products,
  stockMovements,
  invoices,
  customers,
  payments,
  onSaveSettings,
  onRestoreBackup,
}) => {
  const [formState, setFormState] = useState<ShopSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Restore validation state
  const [pendingRestore, setPendingRestore] = useState<BackupDataPayload | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...formState,
      shopName: formState.shopName.trim() || 'ROHIT FURNITURE',
      invoicePrefix: formState.invoicePrefix.trim() || 'RF-',
      nextBillSequence: Math.max(1, Math.floor(Number(formState.nextBillSequence) || 101)),
      defaultTaxPercent: Math.max(0, Math.min(100, Number(formState.defaultTaxPercent) || 0)),
      defaultDiscount: Math.max(0, Number(formState.defaultDiscount) || 0),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadFullBackup = () => {
    const payload: BackupDataPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      shop: settings.shopName,
      settings,
      products,
      stockMovements,
      invoices,
      customers,
      payments,
    };
    exportBackupJSON(payload);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFeedback(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const validation = validateBackupPayload(parsed);
        if (!validation.valid || !validation.payload) {
          setRestoreFeedback({
            type: 'error',
            message: validation.error || 'Invalid backup file format.',
          });
          setPendingRestore(null);
          return;
        }
        setPendingRestore(validation.payload);
      } catch {
        setRestoreFeedback({
          type: 'error',
          message: 'Could not parse JSON file. Ensure you selected a valid ROHIT FURNITURE .json backup.',
        });
        setPendingRestore(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmRestoreAction = () => {
    if (!pendingRestore) return;
    onRestoreBackup(pendingRestore);
    setFormState(pendingRestore.settings);
    setPendingRestore(null);
    setRestoreFeedback({
      type: 'success',
      message: `Successfully restored ${pendingRestore.invoices.length} invoices, ${pendingRestore.products.length} products, and ${pendingRestore.customers.length} customer records.`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200 dark:border-stone-800">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Shop Details · Invoice Defaults · Validated JSON Backup &amp; CSV Export
        </p>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
          Settings, Backup &amp; Data Management
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Shop & Invoice Configuration Form */}
        <form
          onSubmit={handleSettingsSubmit}
          className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Shop Branding &amp; Invoice Defaults
            </h2>
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="sm:col-span-2">
              <label htmlFor="set-shop-name" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Shop Name
              </label>
              <input
                id="set-shop-name"
                type="text"
                required
                value={formState.shopName}
                onChange={(e) => setFormState({ ...formState, shopName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="set-shop-addr" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Shop Address
              </label>
              <input
                id="set-shop-addr"
                type="text"
                required
                value={formState.address}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              />
            </div>

            <div>
              <label htmlFor="set-shop-phone" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Shop Mobile Number
              </label>
              <input
                id="set-shop-phone"
                type="text"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
              />
            </div>

            <div>
              <label htmlFor="set-currency" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Currency Symbol
              </label>
              <input
                id="set-currency"
                type="text"
                value={formState.currencySymbol}
                onChange={(e) => setFormState({ ...formState, currencySymbol: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
              />
            </div>

            <div>
              <label htmlFor="set-inv-prefix" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Invoice Number Prefix
              </label>
              <input
                id="set-inv-prefix"
                type="text"
                value={formState.invoicePrefix}
                onChange={(e) => setFormState({ ...formState, invoicePrefix: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
              />
            </div>

            <div>
              <label htmlFor="set-next-seq" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Next Sequential Bill Number
              </label>
              <input
                id="set-next-seq"
                type="number"
                min="1"
                value={formState.nextBillSequence}
                onChange={(e) =>
                  setFormState({ ...formState, nextBillSequence: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
              />
            </div>

            <div>
              <label htmlFor="set-default-design" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Default Invoice Design (15 Templates — 10 Classic + 5 3D)
              </label>
              <select
                id="set-default-design"
                value={formState.defaultInvoiceDesign}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    defaultInvoiceDesign: e.target.value as InvoiceDesign,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              >
                {INVOICE_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.code}. {tpl.name} — {tpl.subtitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="set-default-tax" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Default GST / Tax (%)
              </label>
              <input
                id="set-default-tax"
                type="number"
                min="0"
                max="100"
                step="any"
                value={formState.defaultTaxPercent}
                onChange={(e) =>
                  setFormState({ ...formState, defaultTaxPercent: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
              />
            </div>

            <div>
              <label htmlFor="set-default-font" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Default Product Font Family
              </label>
              <select
                id="set-default-font"
                value={formState.defaultProductFontFamily}
                onChange={(e) =>
                  setFormState({ ...formState, defaultProductFontFamily: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
              >
                <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                <option value="Playfair Display, Georgia, serif">Playfair Display (Serif)</option>
                <option value="Georgia, serif">Georgia (Classic Serif)</option>
                <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                <option value="Arial, Helvetica, sans-serif">Arial</option>
              </select>
            </div>

            <div>
              <label htmlFor="set-default-size" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Default Product Font Size &amp; Align
              </label>
              <div className="flex gap-2">
                <select
                  id="set-default-size"
                  value={formState.defaultProductFontSize}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultProductFontSize: Number(e.target.value),
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                >
                  {[13, 14, 15, 16, 18, 20].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}px
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Default Product Text Alignment"
                  value={formState.defaultProductTextAlign}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultProductTextAlign: e.target.value as ProductTextAlign,
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                >
                  <option value="center">Center Align</option>
                  <option value="left">Left Align</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Shop Settings</span>
            </button>
          </div>
        </form>

        {/* Right 5 Cols: Backup, Validated Restore & Storage Disclosure */}
        <div className="lg:col-span-5 space-y-6">
          {/* Backup & Restore Card */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-amber-700 dark:text-amber-500 shrink-0" />
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Backup &amp; Restore Shop Data
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              Download a complete JSON snapshot of your shop settings, invoices ({invoices.length}),
              products ({products.length}), customers ({customers.length}), and Udhaar payment
              receipts ({payments.length}).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadFullBackup}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON Backup</span>
              </button>

              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center">
                <Upload className="w-4 h-4" />
                <span>Restore JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Pre-Restore Confirmation Box (Never silently overwrites existing records) */}
            {pendingRestore && (
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/50 space-y-3 text-xs">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Confirm Backup Restore ({pendingRestore.shop})
                </div>
                <p className="text-stone-700 dark:text-stone-300">
                  This backup contains{' '}
                  <strong>{pendingRestore.invoices.length} invoices</strong>,{' '}
                  <strong>{pendingRestore.products.length} products</strong>,{' '}
                  <strong>{pendingRestore.customers.length} customers</strong>, and{' '}
                  <strong>{pendingRestore.payments.length} payment receipts</strong>. Restoring will
                  replace current browser records with this backup.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={confirmRestoreAction}
                    className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
                  >
                    Confirm &amp; Restore Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRestore(null)}
                    className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {restoreFeedback && (
              <div
                role="status"
                className={`p-3.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                  restoreFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                {restoreFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{restoreFeedback.message}</span>
              </div>
            )}

            {/* Quick CSV Exports */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Export Spreadsheet Records (CSV / Excel-Compatible)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportRowsToCSV(
                      `rohit-furniture-invoices-${getTodayISO()}.csv`,
                      [
                        'Bill Number',
                        'Date',
                        'Customer',
                        'Phone',
                        'Grand Total',
                        'Paid',
                        'Balance Due',
                        'Method',
                        'Status',
                      ],
                      invoices.map((i) => [
                        i.billNumber,
                        i.date,
                        i.customerName,
                        i.customerPhone,
                        i.grandTotal,
                        i.totalReceivedOnBill,
                        i.balanceDue,
                        i.paymentMethod,
                        i.status,
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                  <span>All Invoices CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportRowsToCSV(
                      `rohit-furniture-products-${getTodayISO()}.csv`,
                      ['SKU', 'Name', 'Category', 'Purchase Cost', 'Selling Price', 'Stock'],
                      products.map((p) => [
                        p.sku,
                        p.name,
                        p.category,
                        p.purchaseCost,
                        p.sellingPrice,
                        p.stock,
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                  <span>Products CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Honest Data Storage Disclosure Card */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-5 space-y-2.5 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Where Your Shop Data is Stored</span>
            </div>
            <p className="leading-relaxed">
              All invoices, unfinished bill drafts, product stock levels, and customer Udhaar ledgers
              are automatically saved in your browser&apos;s local storage (
              <code className="font-mono">localStorage</code>) on this device for instant offline-ready
              speed.
            </p>
            <p className="leading-relaxed">
              <strong>Important:</strong> Browser local storage is tied to this specific browser and
              device—it is not automatic cloud synchronization. We recommend clicking{' '}
              <strong>Download JSON Backup</strong> at the end of each business day or before
              clearing browser data, and using <strong>Restore JSON File</strong> to transfer data
              between your phone and shop computer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
