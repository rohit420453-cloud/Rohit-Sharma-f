import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  FilePlus2,
  FileSpreadsheet,
  PackagePlus,
  Printer,
  Users,
} from 'lucide-react';
import {
  CustomerPaymentEntry,
  CustomerProfile,
  InvoiceRecord,
  Product,
  ShopSettings,
} from '../types/billing';
import {
  calculateEstimatedProfit,
  computeCustomerLedgers,
  formatINR,
} from '../utils/billingLogic';
import { getTodayISO } from '../utils/storage';

interface DashboardViewProps {
  settings: ShopSettings;
  invoices: InvoiceRecord[];
  products: Product[];
  customers: CustomerProfile[];
  payments: CustomerPaymentEntry[];
  onNavigate: (tab: 'dashboard' | 'billing' | 'products' | 'customers' | 'history' | 'settings') => void;
  onCreateNewBill: () => void;
  onOpenInvoice: (invoice: InvoiceRecord, autoPrint?: boolean) => void;
  onTriggerBackup: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  invoices,
  products,
  customers,
  payments,
  onNavigate,
  onCreateNewBill,
  onOpenInvoice,
  onTriggerBackup,
}) => {
  const todayISO = getTodayISO();
  const currentMonthPrefix = todayISO.slice(0, 7); // YYYY-MM
  const sym = settings.currencySymbol || '₹';

  const metrics = useMemo(() => {
    const activeInvoices = invoices.filter((inv) => inv.status === 'Active');
    const todayInvoices = activeInvoices.filter((inv) => inv.date === todayISO);
    const monthInvoices = activeInvoices.filter((inv) => inv.date.startsWith(currentMonthPrefix));

    const todaySales = todayInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
    const monthlySales = monthInvoices.reduce((s, inv) => s + inv.grandTotal, 0);

    const paidOnInvoices = activeInvoices.reduce((s, inv) => s + inv.totalReceivedOnBill, 0);
    const ledgerPayments = payments.reduce((s, pay) => s + pay.amount, 0);
    const totalReceived = paidOnInvoices + ledgerPayments;

    const totalBilledAllTime = activeInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
    const pendingCustomerPayments = Math.max(0, totalBilledAllTime - totalReceived);

    const ledgers = computeCustomerLedgers(customers, invoices, payments, todayISO);
    const customersWithUdhaar = ledgers.filter((l) => l.outstandingBalance > 0).length;

    const profitInfo = calculateEstimatedProfit(activeInvoices, products);
    const lowStockProducts = products.filter((p) => p.stock <= p.minStockAlert);

    // Recent transactions combining invoice creations and Udhaar receipts
    const recentTransactions = [
      ...activeInvoices.map((inv) => ({
        id: `tx-inv-${inv.id}`,
        date: inv.date,
        timestamp: inv.createdAt,
        title: `Invoice ${inv.billNumber} · ${inv.customerName || 'Walk-in'}`,
        subtitle: `Bill Total ${formatINR(inv.grandTotal, sym)} · Received ${formatINR(inv.totalReceivedOnBill, sym)} · ${inv.paymentMethod}`,
        amount: inv.totalReceivedOnBill,
        type: 'INVOICE' as const,
      })),
      ...payments.map((pay) => ({
        id: `tx-pay-${pay.id}`,
        date: pay.date,
        timestamp: pay.createdAt,
        title: `Udhaar Receipt ${pay.receiptNumber} · ${pay.customerName}`,
        subtitle: `${pay.billNumber ? `Against ${pay.billNumber} · ` : ''}${pay.method}${pay.notes ? ` · ${pay.notes}` : ''}`,
        amount: pay.amount,
        type: 'PAYMENT' as const,
      })),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 6);

    return {
      todaySales,
      todayCount: todayInvoices.length,
      monthlySales,
      monthCount: monthInvoices.length,
      totalBillsCreated: activeInvoices.length,
      cancelledBillsCount: invoices.length - activeInvoices.length,
      pendingCustomerPayments,
      customersWithUdhaar,
      totalReceived,
      estimatedProfit: profitInfo.estimatedProfit,
      itemsWithCostCount: profitInfo.itemsWithCostCount,
      lowStockProducts,
      recentBills: [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      recentTransactions,
    };
  }, [invoices, products, customers, payments, todayISO, currentMonthPrefix, sym]);

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Shop Overview · {settings.address}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mt-1">
            Business Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCreateNewBill}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create Bill</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <PackagePlus className="w-4 h-4 text-amber-700 dark:text-amber-500" />
            <span>Add Product</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Users className="w-4 h-4 text-amber-700 dark:text-amber-500" />
            <span>Customers</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-700 dark:text-amber-500" />
            <span>Sales Report</span>
          </button>
          <button
            type="button"
            onClick={onTriggerBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-amber-700 dark:text-amber-500" />
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* 6 Core Real Calculated KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Today&apos;s Sales ({todayISO})
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {formatINR(metrics.todaySales, sym)}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span>{metrics.todayCount} bills created today</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Monthly Sales ({currentMonthPrefix})
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {formatINR(metrics.monthlySales, sym)}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span>{metrics.monthCount} active invoices this month</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Total Bills Created
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {metrics.totalBillsCreated}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span>Active invoices</span>
            {metrics.cancelledBillsCount > 0 && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{metrics.cancelledBillsCount} cancelled/refunded</span>
              </>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Pending Customer Payments (Udhaar)
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {formatINR(metrics.pendingCustomerPayments, sym)}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span>Across {metrics.customersWithUdhaar} customer accounts</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Total Received Payments
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatINR(metrics.totalReceived, sym)}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span>Includes bill advances &amp; Udhaar collections</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Estimated Profit
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {formatINR(metrics.estimatedProfit, sym)}
          </div>
          <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            {metrics.itemsWithCostCount > 0 ? (
              <span>Calculated from {metrics.itemsWithCostCount} sold items with purchase cost</span>
            ) : (
              <span>Record purchase cost in Products to track profit</span>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert Strip */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Low-Stock Product Alerts ({metrics.lowStockProducts.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage Inventory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {metrics.lowStockProducts.length === 0 ? (
          <div className="p-6 text-sm text-stone-500 dark:text-stone-400">
            All catalogue products are currently above their minimum stock alert threshold.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-50/60 dark:bg-stone-950/50">
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">SKU · Category</th>
                  <th className="py-2.5 px-4 text-right">Selling Price</th>
                  <th className="py-2.5 px-4 text-right">Current Stock</th>
                  <th className="py-2.5 px-4 text-right">Alert Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {metrics.lowStockProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                      {prod.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-mono">{prod.sku}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{prod.category}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-800 dark:text-stone-200">
                      {formatINR(prod.sellingPrice, sym)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-red-600 dark:text-red-400">
                      {prod.stock} left
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-500 dark:text-stone-400">
                      Min {prod.minStockAlert}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-Column Split: Recent Bills & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Recent Bills */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Recent Bills
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All Bills</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.recentBills.length === 0 ? (
            <div className="p-8 text-center space-y-3 my-auto">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No bills have been saved yet.
              </p>
              <button
                type="button"
                onClick={onCreateNewBill}
                className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold"
              >
                Create First Bill
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {metrics.recentBills.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                      <span className="font-mono">{inv.billNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{inv.customerName || 'Walk-in Customer'}</span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      <span>{inv.date}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{inv.items.length} items</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span
                        className={
                          inv.paymentStatus === 'Paid'
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : inv.paymentStatus === 'Cancelled'
                            ? 'text-stone-400 line-through'
                            : 'text-amber-700 dark:text-amber-400 font-medium'
                        }
                      >
                        {inv.paymentStatus}
                        {inv.balanceDue > 0 && inv.status === 'Active'
                          ? ` (Due ${formatINR(inv.balanceDue, sym)})`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono tabular-nums text-sm font-bold text-stone-900 dark:text-stone-100">
                      {formatINR(inv.grandTotal, sym)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(inv, false)}
                        aria-label={`Open invoice ${inv.billNumber}`}
                        className="px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(inv, true)}
                        aria-label={`Print invoice ${inv.billNumber}`}
                        className="p-1.5 rounded-md border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payment Transactions */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Recent Payment Activity
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Udhaar Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.recentTransactions.length === 0 ? (
            <div className="p-8 text-center my-auto">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No payment transactions recorded yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {metrics.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {tx.title}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                      <span>{tx.date}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{tx.subtitle}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                    +{formatINR(tx.amount, sym)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
