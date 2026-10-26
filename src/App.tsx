import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FilePlus2,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import {
  BackupDataPayload,
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceRecord,
  InvoiceStatus,
  Product,
  ShopSettings,
  StockMovement,
} from './types/billing';
import {
  calculateInvoiceTotals,
  reconcileStockForInvoice,
} from './utils/billingLogic';
import {
  createEmptyLineItems,
  DEFAULT_SHOP_SETTINGS,
  exportBackupJSON,
  getInitialInvoices,
  getTodayISO,
  INITIAL_CUSTOMERS,
  INITIAL_PAYMENTS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_MOVEMENTS,
  safeLoadFromStorage,
  safeSaveToStorage,
  STORAGE_KEYS,
} from './utils/storage';
import { DashboardView } from './components/DashboardView';
import { BillGeneratorView } from './components/BillGeneratorView';
import { ProductsInventoryView } from './components/ProductsInventoryView';
import { CustomerLedgerView } from './components/CustomerLedgerView';
import { HistoryReportsView } from './components/HistoryReportsView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { AiPromptModal } from './components/AiPromptModal';
import { ShareInvoiceModal } from './components/ShareInvoiceModal';

type NavTab = 'dashboard' | 'billing' | 'products' | 'customers' | 'history' | 'settings';

function createFreshDraftInvoice(settings: ShopSettings): InvoiceRecord {
  const items = createEmptyLineItems(5);
  const totals = calculateInvoiceTotals({
    items,
    discount: settings.defaultDiscount || 0,
    taxPercent: settings.defaultTaxPercent || 0,
    advancePaid: 0,
    paidAmount: 0,
  });
  const now = new Date().toISOString();

  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    billNumber: `${settings.invoicePrefix}${settings.nextBillSequence}`,
    date: getTodayISO(),
    createdAt: now,
    updatedAt: now,
    shopName: settings.shopName,
    shopAddress: settings.address,
    shopPhone: settings.phone,
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    items,
    ...totals,
    paymentMethod: 'Cash',
    status: 'Active',
    invoiceDesign: settings.defaultInvoiceDesign,
    productFontFamily: settings.defaultProductFontFamily,
    productFontSize: settings.defaultProductFontSize,
    productTextAlign: settings.defaultProductTextAlign,
    stockDeductedMap: {},
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const loaded = safeLoadFromStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light');
    return loaded.data === 'dark' ? 'dark' : 'light';
  });

  // Core Persistent State
  const [settings, setSettings] = useState<ShopSettings>(() => {
    return safeLoadFromStorage<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS).data;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    return safeLoadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS).data;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    return safeLoadFromStorage<StockMovement[]>(
      STORAGE_KEYS.STOCK_MOVEMENTS,
      INITIAL_STOCK_MOVEMENTS
    ).data;
  });

  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => {
    return safeLoadFromStorage<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, getInitialInvoices()).data;
  });

  const [customers, setCustomers] = useState<CustomerProfile[]>(() => {
    return safeLoadFromStorage<CustomerProfile[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS).data;
  });

  const [payments, setPayments] = useState<CustomerPaymentEntry[]>(() => {
    return safeLoadFromStorage<CustomerPaymentEntry[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS)
      .data;
  });

  // Draft / Active Invoice in Bill Generator
  const [draftInvoice, setDraftInvoice] = useState<InvoiceRecord>(() => {
    const savedDraft = safeLoadFromStorage<InvoiceRecord | null>(
      STORAGE_KEYS.DRAFT_INVOICE,
      null
    ).data;
    if (savedDraft && savedDraft.billNumber && Array.isArray(savedDraft.items)) {
      return savedDraft;
    }
    const currentSettings = safeLoadFromStorage<ShopSettings>(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SHOP_SETTINGS
    ).data;
    return createFreshDraftInvoice(currentSettings);
  });

  // Modals
  const [aiPromptModalOpen, setAiPromptModalOpen] = useState(false);
  const [shareModalInvoice, setShareModalInvoice] = useState<InvoiceRecord | null>(null);

  // Apply Dark/Light Class on Document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeSaveToStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Persist changes to localStorage with graceful error handling
  useEffect(() => {
    const res = safeSaveToStorage(STORAGE_KEYS.SETTINGS, settings);
    if (!res.ok && res.error) setStorageWarning(res.error);
  }, [settings]);

  useEffect(() => {
    const res = safeSaveToStorage(STORAGE_KEYS.PRODUCTS, products);
    if (!res.ok && res.error) setStorageWarning(res.error);
  }, [products]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.STOCK_MOVEMENTS, stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    const res = safeSaveToStorage(STORAGE_KEYS.INVOICES, invoices);
    if (!res.ok && res.error) setStorageWarning(res.error);
  }, [invoices]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.PAYMENTS, payments);
  }, [payments]);

  useEffect(() => {
    safeSaveToStorage(STORAGE_KEYS.DRAFT_INVOICE, draftInvoice);
  }, [draftInvoice]);

  const isEditingExisting = invoices.some((inv) => inv.id === draftInvoice.id);

  // Start a fresh bill
  const handleStartNewBill = () => {
    const fresh = createFreshDraftInvoice(settings);
    setDraftInvoice(fresh);
    setActiveTab('billing');
    setMobileMenuOpen(false);
  };

  // Open an existing saved invoice for viewing/editing or printing
  const handleOpenInvoice = (invoice: InvoiceRecord, autoPrint = false) => {
    setDraftInvoice(invoice);
    setActiveTab('billing');
    setMobileMenuOpen(false);
    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  // Save or update an invoice, reconcile stock without duplicate deduction, and sync customer profile
  const handleSaveInvoice = (
    invoiceToSave: InvoiceRecord
  ): { ok: boolean; message: string; savedInvoice?: InvoiceRecord } => {
    const populatedItems = invoiceToSave.items.filter(
      (i) => i.description.trim() !== '' || i.amount > 0
    );

    if (populatedItems.length === 0) {
      return {
        ok: false,
        message: 'Please enter at least one product description and amount before saving the bill.',
      };
    }

    // Validate no negative rates or amounts
    for (const item of populatedItems) {
      if (item.amount < 0 || (item.qty !== '' && Number(item.qty) <= 0)) {
        return {
          ok: false,
          message: `Invalid quantity or amount on row ${item.srNo} (${item.description}).`,
        };
      }
    }

    const existingInvoice = invoices.find((inv) => inv.id === invoiceToSave.id);
    const previousDeductedMap = existingInvoice
      ? existingInvoice.stockDeductedMap
      : invoiceToSave.stockDeductedMap || {};

    // Reconcile stock idempotently
    const stockResult = reconcileStockForInvoice({
      products,
      invoice: { ...invoiceToSave, items: populatedItems },
      previousDeductedMap,
    });

    // Auto-link or create customer profile if customerName is provided
    let linkedCustomerId = invoiceToSave.customerId;
    const custNameTrimmed = invoiceToSave.customerName.trim();
    const custPhoneDigits = invoiceToSave.customerPhone.replace(/\D/g, '');

    if (custNameTrimmed) {
      const matchedCust = customers.find((c) => {
        if (linkedCustomerId && c.id === linkedCustomerId) return true;
        const cDigits = c.phone.replace(/\D/g, '');
        if (custPhoneDigits && cDigits && custPhoneDigits === cDigits) return true;
        return c.name.trim().toLowerCase() === custNameTrimmed.toLowerCase();
      });

      if (matchedCust) {
        linkedCustomerId = matchedCust.id;
      } else {
        const newCust: CustomerProfile = {
          id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: custNameTrimmed,
          phone: invoiceToSave.customerPhone.trim(),
          address: invoiceToSave.customerAddress.trim(),
          optionalDueDate: invoiceToSave.dueDate,
          createdAt: new Date().toISOString(),
        };
        linkedCustomerId = newCust.id;
        setCustomers((prev) => [newCust, ...prev]);
      }
    }

    const finalizedInvoice: InvoiceRecord = {
      ...invoiceToSave,
      customerId: linkedCustomerId,
      updatedAt: new Date().toISOString(),
      stockDeductedMap: stockResult.newDeductedMap,
    };

    setProducts(stockResult.updatedProducts);
    if (stockResult.movements.length > 0) {
      setStockMovements((prev) => [...stockResult.movements, ...prev]);
    }

    if (existingInvoice) {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === finalizedInvoice.id ? finalizedInvoice : inv))
      );
    } else {
      setInvoices((prev) => [finalizedInvoice, ...prev]);
      // Increment sequential bill number if it matches the current sequence
      const nextSeq = settings.nextBillSequence + 1;
      setSettings((prev) => ({
        ...prev,
        nextBillSequence: nextSeq,
      }));
    }

    setDraftInvoice(finalizedInvoice);

    return {
      ok: true,
      message: existingInvoice
        ? `Invoice ${finalizedInvoice.billNumber} updated. Stock and customer ledger synced.`
        : `Invoice ${finalizedInvoice.billNumber} saved! Stock updated (${stockResult.movements.length} product movement(s)).`,
      savedInvoice: finalizedInvoice,
    };
  };

  // Cancel or restore an invoice from History & automatically restore/re-deduct stock
  const handleChangeInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const updatedTotals = calculateInvoiceTotals({
      items: target.items,
      discount: target.discount,
      taxPercent: target.taxPercent,
      advancePaid: target.advancePaid,
      paidAmount: target.paidAmount,
      isCancelledOrRefunded: newStatus !== 'Active',
    });

    const updatedInvoice: InvoiceRecord = {
      ...target,
      ...updatedTotals,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const stockResult = reconcileStockForInvoice({
      products,
      invoice: updatedInvoice,
      previousDeductedMap: target.stockDeductedMap,
    });

    const finalized: InvoiceRecord = {
      ...updatedInvoice,
      stockDeductedMap: stockResult.newDeductedMap,
    };

    setProducts(stockResult.updatedProducts);
    if (stockResult.movements.length > 0) {
      setStockMovements((prev) => [...stockResult.movements, ...prev]);
    }
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? finalized : i)));
    if (draftInvoice.id === invoiceId) {
      setDraftInvoice(finalized);
    }
  };

  // Product Management Handlers
  const handleSaveProduct = (product: Product, isNew: boolean, initialStockDelta = 0) => {
    if (isNew) {
      setProducts((prev) => [product, ...prev]);
      if (initialStockDelta > 0) {
        const mov: StockMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'INITIAL',
          quantityDelta: initialStockDelta,
          stockAfter: product.stock,
          timestamp: new Date().toISOString(),
          note: 'Initial product catalogue stock',
        };
        setStockMovements((prev) => [mov, ...prev]);
      }
    } else {
      const existing = products.find((p) => p.id === product.id);
      const delta = existing ? product.stock - existing.stock : 0;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      if (delta !== 0) {
        const mov: StockMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'MANUAL_ADJUSTMENT',
          quantityDelta: delta,
          stockAfter: product.stock,
          timestamp: new Date().toISOString(),
          note: 'Stock updated via Product Edit',
        };
        setStockMovements((prev) => [mov, ...prev]);
      }
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAdjustStock = (productId: string, delta: number, note: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newStock = Math.max(0, p.stock + delta);
        const actualDelta = newStock - p.stock;
        if (actualDelta !== 0) {
          const mov: StockMovement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            type: 'MANUAL_ADJUSTMENT',
            quantityDelta: actualDelta,
            stockAfter: newStock,
            timestamp: new Date().toISOString(),
            note,
          };
          setStockMovements((old) => [mov, ...old]);
        }
        return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Customer & Udhaar Payment Handlers
  const handleSaveCustomer = (customer: CustomerProfile, isNew: boolean) => {
    if (isNew) {
      setCustomers((prev) => [customer, ...prev]);
    } else {
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
    }
  };

  const handleRecordPayment = (entry: CustomerPaymentEntry) => {
    setPayments((prev) => [entry, ...prev]);
  };

  // Settings & Backup Handlers
  const handleSaveSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    // Sync shop details onto draft if creating a new bill
    if (!isEditingExisting) {
      setDraftInvoice((prev) => ({
        ...prev,
        shopName: newSettings.shopName,
        shopAddress: newSettings.address,
        shopPhone: newSettings.phone,
        billNumber: `${newSettings.invoicePrefix}${newSettings.nextBillSequence}`,
      }));
    }
  };

  const handleRestoreBackup = (payload: BackupDataPayload) => {
    setSettings(payload.settings);
    setProducts(payload.products);
    setStockMovements(payload.stockMovements);
    setInvoices(payload.invoices);
    setCustomers(payload.customers);
    setPayments(payload.payments);
    setDraftInvoice(createFreshDraftInvoice(payload.settings));
  };

  const handleQuickBackupDownload = () => {
    exportBackupJSON({
      version: 1,
      exportedAt: new Date().toISOString(),
      shop: settings.shopName,
      settings,
      products,
      stockMovements,
      invoices,
      customers,
      payments,
    });
  };

  const NAV_ITEMS: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'billing', label: 'Bill Generator' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Udhaar Ledger' },
    { id: 'history', label: 'History & Reports' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121110] text-stone-900 dark:text-stone-100 flex flex-col">
      {/* =====================================================================
          TOP NAVIGATION BAR (Follows Strict 3-Zone Top Bar Contract)
         ===================================================================== */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-[#181615] text-[#FAF8F5]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
            setMobileMenuOpen(false);
          }}
          className="font-display-brand text-lg sm:text-xl font-bold tracking-wider text-amber-400 whitespace-nowrap shrink-0"
        >
          {settings.shopName}
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === item.id
                  ? 'text-amber-400 border-amber-400 font-semibold'
                  : 'border-transparent hover:text-white hover:border-stone-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action on desktop, mobile menu button on small viewports */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleStartNewBill}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>New Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Secondary Workspace Utility Strip (Settings & Theme Toggle below header) */}
      <div className="no-print border-b border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-900/80 px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 truncate">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Mob: {settings.phone}
            </span>
            <span aria-hidden="true">·</span>
            <span className="hidden sm:inline truncate">{settings.address}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-amber-700 text-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings &amp; Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-700" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Compact Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden border-b border-stone-800 bg-[#181615] text-stone-200 px-4 py-3 space-y-1">
          {[...NAV_ITEMS, { id: 'settings' as NavTab, label: 'Settings & Backup' }].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === item.id
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-stone-800 text-stone-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Storage Warning Banner (if browser quota is exceeded) */}
      {storageWarning && (
        <div className="no-print bg-red-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{storageWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setStorageWarning(null)}
            className="underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          MAIN WORKSPACE CONTENT
         ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            settings={settings}
            invoices={invoices}
            products={products}
            customers={customers}
            payments={payments}
            onNavigate={setActiveTab}
            onCreateNewBill={handleStartNewBill}
            onOpenInvoice={handleOpenInvoice}
            onTriggerBackup={handleQuickBackupDownload}
          />
        )}

        {activeTab === 'billing' && (
          <BillGeneratorView
            draftInvoice={draftInvoice}
            isEditingExisting={isEditingExisting}
            settings={settings}
            products={products}
            customers={customers}
            onChangeDraft={setDraftInvoice}
            onSaveInvoice={handleSaveInvoice}
            onResetToNewBill={() => setDraftInvoice(createFreshDraftInvoice(settings))}
            onOpenAiPromptModal={() => setAiPromptModalOpen(true)}
            onOpenShareModal={(inv) => setShareModalInvoice(inv)}
          />
        )}

        {activeTab === 'products' && (
          <ProductsInventoryView
            products={products}
            stockMovements={stockMovements}
            settings={settings}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerLedgerView
            customers={customers}
            invoices={invoices}
            payments={payments}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onRecordPayment={handleRecordPayment}
            onOpenInvoice={handleOpenInvoice}
          />
        )}

        {activeTab === 'history' && (
          <HistoryReportsView
            invoices={invoices}
            products={products}
            payments={payments}
            settings={settings}
            onOpenInvoice={handleOpenInvoice}
            onShareInvoice={(inv) => setShareModalInvoice(inv)}
            onChangeInvoiceStatus={handleChangeInvoiceStatus}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsBackupView
            settings={settings}
            products={products}
            stockMovements={stockMovements}
            invoices={invoices}
            customers={customers}
            payments={payments}
            onSaveSettings={handleSaveSettings}
            onRestoreBackup={handleRestoreBackup}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="no-print border-t border-stone-200 dark:border-stone-800 py-4 px-4 sm:px-8 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>{settings.shopName}</strong> · {settings.address} · Mob: {settings.phone}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className="hover:underline"
            >
              Bill Generator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="hover:underline"
            >
              Udhaar Ledger
            </button>
            <button
              type="button"
              onClick={handleQuickBackupDownload}
              className="hover:underline font-semibold text-amber-700 dark:text-amber-400"
            >
              Download JSON Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AiPromptModal
        isOpen={aiPromptModalOpen}
        onClose={() => setAiPromptModalOpen(false)}
      />

      <ShareInvoiceModal
        invoice={shareModalInvoice}
        currencySymbol={settings.currencySymbol || '₹'}
        onClose={() => setShareModalInvoice(null)}
        onPrintInvoice={() => {
          if (shareModalInvoice) {
            handleOpenInvoice(shareModalInvoice, true);
          }
        }}
      />
    </div>
  );
}
