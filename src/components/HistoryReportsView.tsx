import React, { useMemo, useState } from 'react';
import {
  Ban,
  BarChart3,
  Download,
  Edit3,
  FileText,
  Printer,
  RotateCcw,
  Search,
  Share2,
} from 'lucide-react';
import {
  CustomerPaymentEntry,
  InvoiceRecord,
  InvoiceStatus,
  PaymentMethod,
  Product,
  ShopSettings,
} from '../types/billing';
import { calculateEstimatedProfit, formatINR } from '../utils/billingLogic';
import { exportRowsToCSV, getTodayISO } from '../utils/storage';

interface HistoryReportsViewProps {
  invoices: InvoiceRecord[];
  products: Product[];
  payments: CustomerPaymentEntry[];
  settings: ShopSettings;
  onOpenInvoice: (invoice: InvoiceRecord, autoPrint?: boolean) => void;
  onShareInvoice: (invoice: InvoiceRecord) => void;
  onChangeInvoiceStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
}

export const HistoryReportsView: React.FC<HistoryReportsViewProps> = ({
  invoices,
  products,
  payments,
  settings,
  onOpenInvoice,
  onShareInvoice,
  onChangeInvoiceStatus,
}) => {
  const [subTab, setSubTab] = useState<'history' | 'reports'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Paid' | 'Partial' | 'Unpaid' | 'Cancelled'
  >('ALL');

  const sym = settings.currencySymbol || '₹';
  const todayISO = getTodayISO();

  const applyDatePreset = (preset: 'all' | 'today' | 'week' | 'month') => {
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    if (preset === 'today') {
      setDateFrom(todayISO);
      setDateTo(todayISO);
      return;
    }
    if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(todayISO);
      return;
    }
    if (preset === 'month') {
      setDateFrom(`${todayISO.slice(0, 7)}-01`);
      setDateTo(todayISO);
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...invoices]
      .filter((inv) => {
        if (dateFrom && inv.date < dateFrom) return false;
        if (dateTo && inv.date > dateTo) return false;
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'Cancelled') {
            if (inv.status === 'Active') return false;
          } else {
            if (inv.status !== 'Active' || inv.paymentStatus !== statusFilter) return false;
          }
        }
        if (!q) return true;
        return (
          inv.billNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.toLowerCase().includes(q) ||
          inv.date.includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, searchQuery, dateFrom, dateTo, statusFilter]);

  // Comprehensive Reports Computation on Active Filtered Invoices
  const reportsData = useMemo(() => {
    const activeFiltered = filteredInvoices.filter((inv) => inv.status === 'Active');

    const totalSales = activeFiltered.reduce((s, inv) => s + inv.grandTotal, 0);
    const totalDiscount = activeFiltered.reduce((s, inv) => s + inv.discount, 0);
    const receivedOnBills = activeFiltered.reduce((s, inv) => s + inv.totalReceivedOnBill, 0);

    // Filter Udhaar ledger payments within the same date window
    const filteredPayments = payments.filter((p) => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      return true;
    });
    const receivedViaLedger = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const totalCollected = receivedOnBills + receivedViaLedger;
    const pendingBalance = Math.max(0, totalSales - totalCollected);

    const profitCalc = calculateEstimatedProfit(activeFiltered, products);

    // Daily / Monthly Sales Grouping
    const dailyMap = new Map<string, { date: string; billsCount: number; sales: number; collected: number }>();
    for (const inv of activeFiltered) {
      const existing = dailyMap.get(inv.date) || {
        date: inv.date,
        billsCount: 0,
        sales: 0,
        collected: 0,
      };
      existing.billsCount += 1;
      existing.sales += inv.grandTotal;
      existing.collected += inv.totalReceivedOnBill;
      dailyMap.set(inv.date, existing);
    }
    const dailySummary = Array.from(dailyMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    // Product-wise Sales Summary
    const prodMap = new Map<
      string,
      { name: string; qtySold: number; revenue: number; estimatedCost: number; estimatedProfit: number }
    >();
    const productById = new Map(products.map((p) => [p.id, p]));
    const productByName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

    for (const inv of activeFiltered) {
      const discountRatio =
        inv.subtotal > 0 ? Math.max(0, (inv.subtotal - inv.discount) / inv.subtotal) : 1;

      for (const item of inv.items) {
        if (!item.description.trim() && item.amount <= 0) continue;
        const key = item.description.trim();
        const existing = prodMap.get(key) || {
          name: key,
          qtySold: 0,
          revenue: 0,
          estimatedCost: 0,
          estimatedProfit: 0,
        };
        const qty = item.qty === '' ? 1 : Math.max(1, Number(item.qty) || 1);
        const rev = Math.round(item.amount * discountRatio * 100) / 100;
        const matched =
          (item.productId ? productById.get(item.productId) : undefined) ||
          productByName.get(key.toLowerCase());
        const unitCost =
          typeof item.purchaseCostSnapshot === 'number' && item.purchaseCostSnapshot > 0
            ? item.purchaseCostSnapshot
            : matched?.purchaseCost || 0;
        const cost = unitCost * qty;

        existing.qtySold += qty;
        existing.revenue = Math.round((existing.revenue + rev) * 100) / 100;
        existing.estimatedCost = Math.round((existing.estimatedCost + cost) * 100) / 100;
        existing.estimatedProfit = Math.round(
          (existing.revenue - existing.estimatedCost) * 100
        ) / 100;
        prodMap.set(key, existing);
      }
    }
    const productSalesSummary = Array.from(prodMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Payment Method Summary
    const methods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
    const paymentMethodSummary = methods.map((m) => {
      const fromBills = activeFiltered
        .filter((inv) => inv.paymentMethod === m)
        .reduce((s, inv) => s + inv.totalReceivedOnBill, 0);
      const fromLedger = filteredPayments
        .filter((p) => p.method === m)
        .reduce((s, p) => s + p.amount, 0);
      return {
        method: m,
        fromBills,
        fromLedger,
        total: fromBills + fromLedger,
      };
    });

    return {
      activeCount: activeFiltered.length,
      totalSales,
      totalDiscount,
      totalCollected,
      pendingBalance,
      estimatedProfit: profitCalc.estimatedProfit,
      dailySummary,
      productSalesSummary,
      paymentMethodSummary,
    };
  }, [filteredInvoices, payments, products, dateFrom, dateTo]);

  const handleExportBillsCSV = () => {
    exportRowsToCSV(
      `rohit-furniture-bills-${todayISO}.csv`,
      [
        'Bill Number',
        'Date',
        'Customer Name',
        'Customer Phone',
        'Items Count',
        'Subtotal',
        'Discount',
        'Grand Total',
        'Total Received',
        'Balance Due',
        'Payment Method',
        'Payment Status',
        'Invoice Status',
      ],
      filteredInvoices.map((inv) => [
        inv.billNumber,
        inv.date,
        inv.customerName || 'Walk-in',
        inv.customerPhone,
        inv.items.length,
        inv.subtotal,
        inv.discount,
        inv.grandTotal,
        inv.totalReceivedOnBill,
        inv.balanceDue,
        inv.paymentMethod,
        inv.paymentStatus,
        inv.status,
      ])
    );
  };

  const handleExportProductSalesCSV = () => {
    exportRowsToCSV(
      `rohit-furniture-product-sales-${todayISO}.csv`,
      ['Product Description', 'Quantity Sold', 'Net Revenue', 'Estimated Cost', 'Estimated Profit'],
      reportsData.productSalesSummary.map((p) => [
        p.name,
        p.qtySold,
        p.revenue,
        p.estimatedCost,
        p.estimatedProfit,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Invoice Register · Reprints &amp; Refunds · Sales &amp; Profit Analytics
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Bill History &amp; Sales Reports
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-200/70 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setSubTab('history')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === 'history'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Saved Bills ({filteredInvoices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('reports')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === 'reports'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Sales &amp; Profit Reports</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportBillsCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Bills CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Shared by History & Reports) */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4">
            <label
              htmlFor="history-search-input"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              Search Bill #, Customer Name, or Phone
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="history-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. RF-101 or Farhan..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="history-date-from"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              From Date
            </label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="history-date-to"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1"
            >
              To Date
            </label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Quick Date Range
            </label>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className="flex-1 py-2 px-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'Paid', 'Partial', 'Unpaid', 'Cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
            Filtered Active Sales: <strong>{formatINR(reportsData.totalSales, sym)}</strong>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SUB-VIEW 1: SAVED BILLS REGISTER
         ===================================================================== */}
      {subTab === 'history' ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-500 dark:text-stone-400">
              No saved invoices match your current filter settings.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-50/70 dark:bg-stone-950/50">
                    <th className="py-3 px-4">Bill # · Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredInvoices.map((inv) => {
                    const isCancelled = inv.status !== 'Active';
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                          isCancelled ? 'opacity-65' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {inv.billNumber}
                          </div>
                          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                            {inv.date}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {inv.customerName || 'Walk-in Customer'}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">
                            {inv.customerPhone || inv.customerAddress || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-stone-600 dark:text-stone-300 max-w-xs truncate">
                          {inv.items.map((it) => it.description).filter(Boolean).join(', ') ||
                            `${inv.items.length} item(s)`}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                          {formatINR(inv.grandTotal, sym)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatINR(inv.totalReceivedOnBill, sym)}
                          <div className="text-[11px] text-stone-400">{inv.paymentMethod}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                          {isCancelled ? '—' : formatINR(inv.balanceDue, sym)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          {isCancelled ? (
                            <span className="text-red-600 dark:text-red-400">
                              {inv.status} (Stock Restored)
                            </span>
                          ) : (
                            <span
                              className={
                                inv.paymentStatus === 'Paid'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }
                            >
                              {inv.paymentStatus}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(inv, false)}
                              title="Open & Edit Bill"
                              aria-label={`Edit invoice ${inv.billNumber}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenInvoice(inv, true)}
                              title="Print / Download PDF"
                              aria-label={`Print invoice ${inv.billNumber}`}
                              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onShareInvoice(inv)}
                              title="Share via WhatsApp"
                              aria-label={`Share invoice ${inv.billNumber}`}
                              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-emerald-600 dark:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {inv.status === 'Active' ? (
                              <button
                                type="button"
                                onClick={() => onChangeInvoiceStatus(inv.id, 'Cancelled')}
                                title="Cancel Invoice & Restore Stock"
                                aria-label={`Cancel invoice ${inv.billNumber}`}
                                className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onChangeInvoiceStatus(inv.id, 'Active')}
                                title="Restore Cancelled Invoice"
                                aria-label={`Restore invoice ${inv.billNumber}`}
                                className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================
           SUB-VIEW 2: SALES, PAYMENT METHODS & PROFIT REPORTS
           =================================================================== */
        <div className="space-y-6">
          {/* 4 Report KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Net Sales ({reportsData.activeCount} Active Bills)
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
                {formatINR(reportsData.totalSales, sym)}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Discounts given: {formatINR(reportsData.totalDiscount, sym)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Total Payments Collected
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatINR(reportsData.totalCollected, sym)}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Bills + Udhaar receipts in period
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Pending Receivables
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {formatINR(reportsData.pendingBalance, sym)}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Remaining Udhaar from period sales
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Estimated Profit
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
                {formatINR(reportsData.estimatedProfit, sym)}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Net revenue minus recorded purchase cost
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Product-wise Sales & Profit Breakdown */}
            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Product-Wise Sales &amp; Profit Summary
                </h2>
                <button
                  type="button"
                  onClick={handleExportProductSalesCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {reportsData.productSalesSummary.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-500">
                  No product sales in the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 bg-stone-50/70 dark:bg-stone-950/50">
                        <th className="py-2.5 px-4">Product Description</th>
                        <th className="py-2.5 px-3 text-right">Qty Sold</th>
                        <th className="py-2.5 px-3 text-right">Revenue</th>
                        <th className="py-2.5 px-4 text-right">Est. Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                      {reportsData.productSalesSummary.map((prod) => (
                        <tr key={prod.name} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                          <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                            {prod.name}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {prod.qtySold}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                            {formatINR(prod.revenue, sym)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            {prod.estimatedCost > 0
                              ? formatINR(prod.estimatedProfit, sym)
                              : 'Cost N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Payment Methods + Date-wise Sales */}
            <div className="lg:col-span-5 space-y-6">
              {/* Payment Method Summary */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Collections by Payment Method
                  </h2>
                </div>
                <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs sm:text-sm">
                  {reportsData.paymentMethodSummary.map((pm) => (
                    <div
                      key={pm.method}
                      className="px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                          {pm.method}
                        </div>
                        <div className="text-xs text-stone-500">
                          Bills: {formatINR(pm.fromBills, sym)} · Udhaar: {formatINR(pm.fromLedger, sym)}
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                        {formatINR(pm.total, sym)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Sales Breakdown */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Day-Wise Sales Summary
                  </h2>
                </div>
                {reportsData.dailySummary.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500">
                    No daily records in selected period.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs sm:text-sm max-h-64 overflow-y-auto">
                    {reportsData.dailySummary.map((d) => (
                      <div
                        key={d.date}
                        className="px-5 py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {d.date}
                          </div>
                          <div className="text-xs text-stone-500">{d.billsCount} bill(s)</div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {formatINR(d.sales, sym)}
                          </div>
                          <div className="text-xs text-emerald-700 dark:text-emerald-400">
                            Recd: {formatINR(d.collected, sym)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
