import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  ExternalLink,
  IndianRupee,
  Printer,
  Receipt,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CustomerLedgerSummary,
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceRecord,
  PaymentMethod,
  ShopSettings,
} from '../types/billing';
import {
  computeCustomerLedgers,
  formatINR,
  numberToIndianRupeesWords,
} from '../utils/billingLogic';
import { exportRowsToCSV, getTodayISO } from '../utils/storage';

interface CustomerLedgerViewProps {
  customers: CustomerProfile[];
  invoices: InvoiceRecord[];
  payments: CustomerPaymentEntry[];
  settings: ShopSettings;
  onSaveCustomer: (customer: CustomerProfile, isNew: boolean) => void;
  onRecordPayment: (entry: CustomerPaymentEntry) => void;
  onOpenInvoice: (invoice: InvoiceRecord, autoPrint?: boolean) => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  invoices,
  payments,
  settings,
  onSaveCustomer,
  onRecordPayment,
  onOpenInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'OVERDUE' | 'CLEAR'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers[0]?.id || null
  );

  // Customer Profile Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custDueDate, setCustDueDate] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custError, setCustError] = useState('');

  // Record Udhaar Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetLedger, setPaymentTargetLedger] = useState<CustomerLedgerSummary | null>(
    null
  );
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(getTodayISO());
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  // Printable Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<CustomerPaymentEntry | null>(null);

  const sym = settings.currencySymbol || '₹';
  const todayISO = getTodayISO();

  const ledgers = useMemo(
    () => computeCustomerLedgers(customers, invoices, payments, todayISO),
    [customers, invoices, payments, todayISO]
  );

  const filteredLedgers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ledgers.filter((l) => {
      if (statusFilter === 'DUE' && l.outstandingBalance <= 0) return false;
      if (statusFilter === 'OVERDUE' && l.dueStatus !== 'Overdue') return false;
      if (statusFilter === 'CLEAR' && l.outstandingBalance > 0) return false;
      if (!q) return true;
      return (
        l.customer.name.toLowerCase().includes(q) ||
        l.customer.phone.toLowerCase().includes(q) ||
        l.customer.address.toLowerCase().includes(q)
      );
    });
  }, [ledgers, searchQuery, statusFilter]);

  const activeLedger = useMemo(() => {
    return (
      ledgers.find((l) => l.customer.id === selectedCustomerId) ||
      filteredLedgers[0] ||
      null
    );
  }, [ledgers, filteredLedgers, selectedCustomerId]);

  const summaryTotals = useMemo(() => {
    const totalBilled = ledgers.reduce((s, l) => s + l.totalBilled, 0);
    const totalReceived = ledgers.reduce((s, l) => s + l.totalReceived, 0);
    const totalOutstanding = ledgers.reduce((s, l) => s + l.outstandingBalance, 0);
    const overdueCount = ledgers.filter((l) => l.dueStatus === 'Overdue').length;
    return { totalBilled, totalReceived, totalOutstanding, overdueCount };
  }, [ledgers]);

  // Customer-specific invoices and payment entries for the selected ledger
  const selectedCustomerDetails = useMemo(() => {
    if (!activeLedger) return { custInvoices: [], custPayments: [], timeline: [] };
    const c = activeLedger.customer;
    const normPhone = c.phone.replace(/\D/g, '');
    const normName = c.name.trim().toLowerCase();

    const custInvoices = invoices.filter((inv) => {
      if (inv.customerId && inv.customerId === c.id) return true;
      const invPhone = inv.customerPhone.replace(/\D/g, '');
      if (normPhone && invPhone && normPhone === invPhone) return true;
      return inv.customerName.trim().toLowerCase() === normName;
    });

    const custPayments = payments.filter((pay) => {
      if (pay.customerId === c.id) return true;
      const payPhone = pay.customerPhone.replace(/\D/g, '');
      if (normPhone && payPhone && normPhone === payPhone) return true;
      return pay.customerName.trim().toLowerCase() === normName;
    });

    const timeline = [
      ...custInvoices.map((inv) => ({
        id: `tl-inv-${inv.id}`,
        date: inv.date,
        timestamp: inv.createdAt,
        kind: 'INVOICE' as const,
        title: `Bill ${inv.billNumber} (${inv.status})`,
        subtitle: `${inv.items.length} item(s) · Paid on bill: ${formatINR(
          inv.totalReceivedOnBill,
          sym
        )} (${inv.paymentMethod})`,
        debitBilled: inv.status === 'Active' ? inv.grandTotal : 0,
        creditPaid: inv.status === 'Active' ? inv.totalReceivedOnBill : 0,
        invoiceRef: inv,
        paymentRef: undefined,
      })),
      ...custPayments.map((pay) => ({
        id: `tl-pay-${pay.id}`,
        date: pay.date,
        timestamp: pay.createdAt,
        kind: 'PAYMENT' as const,
        title: `Payment Receipt ${pay.receiptNumber}`,
        subtitle: `${pay.method}${pay.billNumber ? ` · Against ${pay.billNumber}` : ''}${
          pay.notes ? ` · ${pay.notes}` : ''
        }`,
        debitBilled: 0,
        creditPaid: pay.amount,
        invoiceRef: undefined,
        paymentRef: pay,
      })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { custInvoices, custPayments, timeline };
  }, [activeLedger, invoices, payments, sym]);

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustDueDate('');
    setCustNotes('');
    setCustError('');
    setCustomerModalOpen(true);
  };

  const openEditCustomerModal = (cust: CustomerProfile) => {
    setEditingCustomer(cust);
    setCustName(cust.name);
    setCustPhone(cust.phone);
    setCustAddress(cust.address);
    setCustDueDate(cust.optionalDueDate || '');
    setCustNotes(cust.notes || '');
    setCustError('');
    setCustomerModalOpen(true);
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      setCustError('Customer name is required.');
      return;
    }
    const isNew = !editingCustomer;
    const newCust: CustomerProfile = {
      id: editingCustomer?.id || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: custName.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim(),
      optionalDueDate: custDueDate || undefined,
      notes: custNotes.trim() || undefined,
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
    };
    onSaveCustomer(newCust, isNew);
    setSelectedCustomerId(newCust.id);
    setCustomerModalOpen(false);
  };

  const openRecordPaymentModal = (ledger: CustomerLedgerSummary) => {
    setPaymentTargetLedger(ledger);
    setPayAmount(ledger.outstandingBalance > 0 ? String(ledger.outstandingBalance) : '');
    setPayDate(getTodayISO());
    setPayMethod('UPI');
    setPayInvoiceId('');
    setPayNotes('');
    setPayError('');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetLedger) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setPayError('Payment amount must be greater than 0.');
      return;
    }

    const linkedInv = invoices.find((i) => i.id === payInvoiceId);
    const receiptNum = `RCP-${101 + payments.length}`;
    const entry: CustomerPaymentEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      receiptNumber: receiptNum,
      customerId: paymentTargetLedger.customer.id,
      customerName: paymentTargetLedger.customer.name,
      customerPhone: paymentTargetLedger.customer.phone,
      invoiceId: linkedInv?.id,
      billNumber: linkedInv?.billNumber,
      date: payDate || getTodayISO(),
      createdAt: new Date().toISOString(),
      amount: Math.round(amt * 100) / 100,
      method: payMethod,
      notes: payNotes.trim() || 'Udhaar ledger payment received',
    };

    onRecordPayment(entry);
    setPaymentModalOpen(false);
    setActiveReceipt(entry);
  };

  const handleExportLedgerCSV = () => {
    exportRowsToCSV(
      `rohit-furniture-udhaar-ledger-${todayISO}.csv`,
      [
        'Customer Name',
        'Phone',
        'Address',
        'Invoices Count',
        'Total Billed',
        'Total Received',
        'Outstanding Udhaar Balance',
        'Due Status',
        'Due Date',
      ],
      ledgers.map((l) => [
        l.customer.name,
        l.customer.phone,
        l.customer.address,
        l.invoiceCount,
        l.totalBilled,
        l.totalReceived,
        l.outstandingBalance,
        l.dueStatus,
        l.earliestDueDate || '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Customer Accounts · Partial Payments · Printable Receipts
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Customer Management &amp; Udhaar Ledger
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openAddCustomerModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>

          <button
            type="button"
            onClick={handleExportLedgerCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Total Billed to Customers
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {formatINR(summaryTotals.totalBilled, sym)}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Across {customers.length} saved customer profiles
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Total Payments Received
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatINR(summaryTotals.totalReceived, sym)}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Bill advances + {payments.length} Udhaar receipts
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Total Outstanding Udhaar
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {formatINR(summaryTotals.totalOutstanding, sym)}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Calculated from live bills &amp; payments
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Overdue Accounts
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
            {summaryTotals.overdueCount}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Past promised payment due date
          </div>
        </div>
      </div>

      {/* Main Split View: Customer Directory (Left) & Detailed Transaction Ledger (Right) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Directory */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search customers by name, phone, or address"
                placeholder="Search customer name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-stone-950">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'DUE', label: 'Udhaar Due' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'CLEAR', label: 'Clear' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredLedgers.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No customers match your filter.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[540px] overflow-y-auto">
              {filteredLedgers.map((l) => {
                const isSelected = activeLedger?.customer.id === l.customer.id;
                return (
                  <button
                    key={l.customer.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(l.customer.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 dark:bg-amber-950/30'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                        {l.customer.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                        <span className="font-mono">{l.customer.phone || 'No phone'}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{l.invoiceCount} bill(s)</span>
                        {l.earliestDueDate && l.outstandingBalance > 0 && (
                          <>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span
                              className={
                                l.dueStatus === 'Overdue'
                                  ? 'text-red-600 dark:text-red-400 font-semibold'
                                  : ''
                              }
                            >
                              Due {l.earliestDueDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono tabular-nums text-sm font-bold ${
                          l.outstandingBalance > 0
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {l.outstandingBalance > 0
                          ? formatINR(l.outstandingBalance, sym)
                          : 'Settled'}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {l.dueStatus}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Customer Ledger Detail Panel */}
        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {!activeLedger ? (
            <div className="p-12 text-center text-sm text-stone-500 dark:text-stone-400">
              Select a customer from the left list to view their full Udhaar ledger and record payments.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {/* Customer Profile Top Bar */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      {activeLedger.customer.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openEditCustomerModal(activeLedger.customer)}
                      aria-label={`Edit profile for ${activeLedger.customer.name}`}
                      className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 space-y-0.5">
                    <div>
                      <span className="font-mono font-semibold">
                        {activeLedger.customer.phone || 'No phone number'}
                      </span>
                      {activeLedger.customer.address && (
                        <>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{activeLedger.customer.address}</span>
                        </>
                      )}
                    </div>
                    {activeLedger.customer.notes && (
                      <div className="text-stone-500">Note: {activeLedger.customer.notes}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openRecordPaymentModal(activeLedger)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <IndianRupee className="w-4 h-4" />
                    <span>Record Payment</span>
                  </button>

                  {activeLedger.outstandingBalance > 0 && activeLedger.customer.phone && (
                    <a
                      href={`https://wa.me/91${activeLedger.customer.phone.replace(
                        /\D/g,
                        ''
                      )}?text=${encodeURIComponent(
                        `Namaste ${activeLedger.customer.name},\nThis is a gentle reminder from *${settings.shopName}* regarding your pending Udhaar balance of *${formatINR(
                          activeLedger.outstandingBalance,
                          sym
                        )}*.\nTotal Billed: ${formatINR(
                          activeLedger.totalBilled,
                          sym
                        )}\nTotal Received: ${formatINR(
                          activeLedger.totalReceived,
                          sym
                        )}\nThank you!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Reminder</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Customer Financial Summary Row */}
              <div className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-stone-800 bg-stone-50/60 dark:bg-stone-950/50 text-center">
                <div className="p-3.5">
                  <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    Total Billed
                  </div>
                  <div className="mt-1 text-base sm:text-lg font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
                    {formatINR(activeLedger.totalBilled, sym)}
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    Total Received
                  </div>
                  <div className="mt-1 text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatINR(activeLedger.totalReceived, sym)}
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    Outstanding Udhaar
                  </div>
                  <div
                    className={`mt-1 text-base sm:text-lg font-bold font-mono tabular-nums ${
                      activeLedger.outstandingBalance > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {formatINR(activeLedger.outstandingBalance, sym)}
                  </div>
                </div>
              </div>

              {/* Chronological Transaction Ledger */}
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Customer Transaction Ledger ({selectedCustomerDetails.timeline.length})
                </h3>

                {selectedCustomerDetails.timeline.length === 0 ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400 py-4">
                    No invoices or payment entries recorded for this customer yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 dark:text-stone-400">
                          <th className="py-2.5 pr-3">Date</th>
                          <th className="py-2.5 px-3">Particulars</th>
                          <th className="py-2.5 px-3 text-right">Billed</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 pl-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                        {selectedCustomerDetails.timeline.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                            <td className="py-3 pr-3 font-mono text-xs text-stone-600 dark:text-stone-400 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-stone-900 dark:text-stone-100">
                                {item.title}
                              </div>
                              <div className="text-xs text-stone-500 dark:text-stone-400">
                                {item.subtitle}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900 dark:text-stone-100">
                              {item.debitBilled > 0 ? formatINR(item.debitBilled, sym) : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                              {item.creditPaid > 0 ? `+${formatINR(item.creditPaid, sym)}` : '—'}
                            </td>
                            <td className="py-3 pl-3 text-right whitespace-nowrap">
                              {item.invoiceRef && (
                                <button
                                  type="button"
                                  onClick={() => onOpenInvoice(item.invoiceRef!, false)}
                                  className="px-2.5 py-1 rounded border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                                >
                                  Open Bill
                                </button>
                              )}
                              {item.paymentRef && (
                                <button
                                  type="button"
                                  onClick={() => setActiveReceipt(item.paymentRef!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                  <span>Receipt</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {customerModalOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setCustomerModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h2 id="customer-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h2>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                aria-label="Close customer modal"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-3.5 text-xs sm:text-sm">
              {custError && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs font-medium">
                  {custError}
                </div>
              )}
              <div>
                <label htmlFor="cust-name-field" className="block text-xs font-semibold mb-1">
                  Customer Full Name *
                </label>
                <input
                  id="cust-name-field"
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
              </div>

              <div>
                <label htmlFor="cust-phone-field" className="block text-xs font-semibold mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  id="cust-phone-field"
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label htmlFor="cust-addr-field" className="block text-xs font-semibold mb-1">
                  Address / Area
                </label>
                <input
                  id="cust-addr-field"
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="Mandala, Mankhurd"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
              </div>

              <div>
                <label htmlFor="cust-due-field" className="block text-xs font-semibold mb-1">
                  Promised Payment Due Date (Optional)
                </label>
                <input
                  id="cust-due-field"
                  type="date"
                  value={custDueDate}
                  onChange={(e) => setCustDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label htmlFor="cust-notes-field" className="block text-xs font-semibold mb-1">
                  Notes
                </label>
                <input
                  id="cust-notes-field"
                  type="text"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  placeholder="Reference or payment preference"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Udhaar Payment Modal */}
      {paymentModalOpen && paymentTargetLedger && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPaymentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-payment-modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h2 id="record-payment-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Record Payment — {paymentTargetLedger.customer.name}
                </h2>
                <p className="text-xs text-stone-500">
                  Current Udhaar Balance:{' '}
                  <strong className="font-mono text-amber-700 dark:text-amber-400">
                    {formatINR(paymentTargetLedger.outstandingBalance, sym)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                aria-label="Close payment modal"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs sm:text-sm">
              {payError && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs font-medium">
                  {payError}
                </div>
              )}

              <div>
                <label htmlFor="pay-amount-field" className="block text-xs font-semibold mb-1">
                  Amount Received ({sym}) *
                </label>
                <input
                  id="pay-amount-field"
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-base font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-date-field" className="block text-xs font-semibold mb-1">
                    Payment Date
                  </label>
                  <input
                    id="pay-date-field"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="pay-method-field" className="block text-xs font-semibold mb-1">
                    Payment Method
                  </label>
                  <select
                    id="pay-method-field"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-semibold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pay-invoice-link" className="block text-xs font-semibold mb-1">
                  Link to Specific Invoice (Optional)
                </label>
                <select
                  id="pay-invoice-link"
                  value={payInvoiceId}
                  onChange={(e) => setPayInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                >
                  <option value="">General Customer Account</option>
                  {selectedCustomerDetails.custInvoices
                    .filter((i) => i.status === 'Active')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.billNumber} ({inv.date}) — Bill Total {formatINR(inv.grandTotal, sym)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="pay-notes-field" className="block text-xs font-semibold mb-1">
                  Payment Remarks / Reference
                </label>
                <input
                  id="pay-notes-field"
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid via GPay / Cash installment"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Save &amp; Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Payment Receipt Modal */}
      {activeReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          onClick={() => setActiveReceipt(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-receipt-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-stone-200 dark:border-stone-800 bg-white text-black p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 id="payment-receipt-modal-title" className="text-base font-bold text-stone-900">
                Payment Receipt {activeReceipt.receiptNumber}
              </h2>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                aria-label="Close receipt modal"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              id="printable-receipt-area"
              className="border-2 border-black p-5 space-y-4 bg-white text-black"
            >
              <div className="text-center border-b-2 border-black pb-3">
                <div className="font-serif-invoice text-2xl font-extrabold text-[#b91c1c] uppercase">
                  {settings.shopName}
                </div>
                <div className="text-xs font-bold mt-0.5">{settings.address}</div>
                <div className="text-xs font-mono font-bold mt-0.5">Mob: {settings.phone}</div>
                <div className="mt-2 inline-block px-3 py-0.5 border border-black text-xs font-extrabold uppercase tracking-wider">
                  PAYMENT RECEIPT
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span>Receipt No: {activeReceipt.receiptNumber}</span>
                <span>Date: {activeReceipt.date}</span>
              </div>

              <div className="space-y-2 text-sm leading-relaxed">
                <p>
                  Received with thanks from{' '}
                  <strong className="border-b border-black px-1">
                    {activeReceipt.customerName}
                  </strong>{' '}
                  {activeReceipt.customerPhone ? `(${activeReceipt.customerPhone})` : ''}
                </p>
                <p>
                  a sum of{' '}
                  <strong className="font-mono text-base border-b border-black px-1">
                    {formatINR(activeReceipt.amount, sym)}
                  </strong>{' '}
                  ({numberToIndianRupeesWords(activeReceipt.amount)})
                </p>
                <p>
                  by <strong>{activeReceipt.method}</strong>{' '}
                  {activeReceipt.billNumber
                    ? `towards Invoice ${activeReceipt.billNumber}`
                    : 'towards Customer Udhaar Account'}
                  .
                </p>
                {activeReceipt.notes && (
                  <p className="text-xs text-stone-700">Remarks: {activeReceipt.notes}</p>
                )}
              </div>

              <div className="pt-6 flex items-end justify-between border-t border-black text-xs font-bold">
                <div>Thanking you,</div>
                <div className="text-right">
                  <div>For {settings.shopName}</div>
                  <div className="mt-4">{settings.proprietorTitle || 'PROPRIETOR'}</div>
                </div>
              </div>
            </div>

            <div className="no-print flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
