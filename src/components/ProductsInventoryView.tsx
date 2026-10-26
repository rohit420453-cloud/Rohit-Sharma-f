import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Edit3,
  History,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Product, ShopSettings, StockMovement } from '../types/billing';
import { formatINR } from '../utils/billingLogic';
import { exportRowsToCSV, getTodayISO } from '../utils/storage';

interface ProductsInventoryViewProps {
  products: Product[];
  stockMovements: StockMovement[];
  settings: ShopSettings;
  onSaveProduct: (product: Product, isNew: boolean, initialStockDelta?: number) => void;
  onDeleteProduct: (productId: string) => void;
  onAdjustStock: (productId: string, delta: number, note: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Racks & Storage',
  'Almirah & Wardrobes',
  'Beds & Mattresses',
  'Tables & Desks',
  'Sofa & Living',
  'Bedroom',
  'Chairs & Seating',
  'Custom Order',
];

export const ProductsInventoryView: React.FC<ProductsInventoryViewProps> = ({
  products,
  stockMovements,
  settings,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock-asc'>('name');
  const [activeSubView, setActiveSubView] = useState<'catalogue' | 'movements'>('catalogue');

  // Add/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Racks & Storage');
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('3');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const sym = settings.currencySymbol || '₹';

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
        if (onlyLowStock && p.stock > p.minStockAlert) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
        return a.stock - b.stock;
      });
  }, [products, searchQuery, selectedCategory, onlyLowStock, sortBy]);

  const inventoryStats = useMemo(() => {
    const totalItems = products.length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const totalStockCostValue = products.reduce((s, p) => s + p.stock * p.purchaseCost, 0);
    const totalStockRetailValue = products.reduce((s, p) => s + p.stock * p.sellingPrice, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;
    return {
      totalItems,
      totalUnits,
      totalStockCostValue,
      totalStockRetailValue,
      lowStockCount,
    };
  }, [products]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormSku(`RF-ITM-${String(products.length + 1).padStart(2, '0')}`);
    setFormCategory('Racks & Storage');
    setFormPurchaseCost('');
    setFormSellingPrice('');
    setFormStock('5');
    setFormMinStock('3');
    setFormImageUrl('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingId(prod.id);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormCategory(prod.category);
    setFormPurchaseCost(String(prod.purchaseCost));
    setFormSellingPrice(String(prod.sellingPrice));
    setFormStock(String(prod.stock));
    setFormMinStock(String(prod.minStockAlert));
    setFormImageUrl(prod.imageUrl || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formSku.trim()) {
      setFormError('Product SKU is required.');
      return;
    }
    const sellingPrice = Number(formSellingPrice);
    const purchaseCost = Number(formPurchaseCost || 0);
    const stock = Number(formStock || 0);
    const minStockAlert = Number(formMinStock || 0);

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setFormError('Selling price must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(purchaseCost) || purchaseCost < 0) {
      setFormError('Purchase cost cannot be negative.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setFormError('Stock quantity cannot be negative.');
      return;
    }

    const isNew = !editingId;
    const productObj: Product = {
      id: editingId || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: formName.trim(),
      sku: formSku.trim().toUpperCase(),
      category: formCategory.trim() || 'General Furniture',
      purchaseCost: Math.round(purchaseCost * 100) / 100,
      sellingPrice: Math.round(sellingPrice * 100) / 100,
      stock: Math.floor(stock),
      minStockAlert: Math.max(0, Math.floor(minStockAlert)),
      imageUrl: formImageUrl.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(productObj, isNew, Math.floor(stock));
    setModalOpen(false);
  };

  const handleExportProductsCSV = () => {
    exportRowsToCSV(
      `rohit-furniture-inventory-${getTodayISO()}.csv`,
      ['SKU', 'Product Name', 'Category', 'Purchase Cost', 'Selling Price', 'Current Stock', 'Low Stock Limit'],
      products.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.purchaseCost,
        p.sellingPrice,
        p.stock,
        p.minStockAlert,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Catalogue · Stock Tracking · Automatic Sale Deductions
          </p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Product Catalogue &amp; Inventory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={handleExportProductsCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Catalogue Products
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {inventoryStats.totalItems}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {inventoryStats.totalUnits} total units in stock
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Stock Purchase Value
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {formatINR(inventoryStats.totalStockCostValue, sym)}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Based on recorded purchase cost
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Stock Selling Value
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatINR(inventoryStats.totalStockRetailValue, sym)}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Estimated retail value
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Low-Stock Alerts
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {inventoryStats.lowStockCount}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Items at or below alert limit
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs: Catalogue vs Stock Movement History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-200/70 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 self-start">
          <button
            type="button"
            onClick={() => setActiveSubView('catalogue')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeSubView === 'catalogue'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({products.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('movements')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeSubView === 'movements'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movement History ({stockMovements.length})</span>
          </button>
        </div>

        {activeSubView === 'catalogue' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search products by name or SKU"
                placeholder="Search name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 w-48 sm:w-56"
              />
            </div>

            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200"
            >
              <option value="name">Sort: Name (A–Z)</option>
              <option value="stock-asc">Sort: Stock (Low to High)</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                onlyLowStock
                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                  : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300'
              }`}
            >
              Low Stock Only
            </button>
          </div>
        )}
      </div>

      {/* View Content */}
      {activeSubView === 'catalogue' ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No products match your current search or filter criteria.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold"
              >
                Add New Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-50/70 dark:bg-stone-950/50">
                    <th className="py-3 px-4">Product · SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Purchase Cost</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredProducts.map((prod) => {
                    const isLow = prod.stock <= prod.minStockAlert;
                    const unitMargin = prod.sellingPrice - prod.purchaseCost;
                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                                className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-400 shrink-0">
                                {prod.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-stone-900 dark:text-stone-100">
                                {prod.name}
                              </div>
                              <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                                {prod.sku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-stone-600 dark:text-stone-300">
                          {prod.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                          {formatINR(prod.purchaseCost, sym)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                          {formatINR(prod.sellingPrice, sym)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400">
                          {unitMargin >= 0 ? `+${formatINR(unitMargin, sym)}` : formatINR(unitMargin, sym)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onAdjustStock(prod.id, -1, 'Manual stock decrease (-1)')
                              }
                              disabled={prod.stock <= 0}
                              aria-label={`Decrease stock for ${prod.name}`}
                              className="w-6 h-6 rounded border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40"
                            >
                              -
                            </button>
                            <span
                              className={`font-mono tabular-nums font-bold min-w-[3.5rem] text-center ${
                                isLow
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-stone-900 dark:text-stone-100'
                              }`}
                            >
                              {prod.stock}
                              {isLow && (
                                <AlertTriangle
                                  className="w-3.5 h-3.5 inline ml-1 text-amber-600"
                                  aria-label="Low stock alert"
                                />
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onAdjustStock(prod.id, 1, 'Manual stock restock (+1)')
                              }
                              aria-label={`Increase stock for ${prod.name}`}
                              className="w-6 h-6 rounded border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              aria-label={`Edit ${prod.name}`}
                              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(prod)}
                              aria-label={`Delete ${prod.name}`}
                              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
        /* Stock Movements History Table */
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {stockMovements.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-500 dark:text-stone-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-50/70 dark:bg-stone-950/50">
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Product · SKU</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Qty Change</th>
                    <th className="py-3 px-4 text-right">Stock After</th>
                    <th className="py-3 px-4">Reference / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {stockMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 font-mono text-xs text-stone-500 dark:text-stone-400">
                        {mov.timestamp.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                        {mov.productName}{' '}
                        <span className="font-mono text-xs text-stone-500">({mov.sku})</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {mov.type === 'SALE'
                          ? 'Invoice Sale'
                          : mov.type === 'CANCELLATION_RESTORE'
                          ? 'Cancelled Bill Restore'
                          : mov.type === 'EDIT_ADJUSTMENT'
                          ? 'Invoice Edit Sync'
                          : 'Manual Adjustment'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                          mov.quantityDelta >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {mov.quantityDelta >= 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-800 dark:text-stone-200">
                        {mov.stockAfter}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600 dark:text-stone-400">
                        {mov.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h2 id="product-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                {editingId ? 'Edit Product' : 'Add New Furniture Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close product modal"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3.5 text-xs sm:text-sm">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="prod-name-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Product Name *
                </label>
                <input
                  id="prod-name-input"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Steel Wardrobe 3-Door"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-sku-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    SKU Code *
                  </label>
                  <input
                    id="prod-sku-input"
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="RF-WRD-04"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label htmlFor="prod-category-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <input
                    id="prod-category-input"
                    type="text"
                    list="default-furniture-categories"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                  />
                  <datalist id="default-furniture-categories">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-cost-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Purchase Cost ({sym})
                  </label>
                  <input
                    id="prod-cost-input"
                    type="number"
                    min="0"
                    step="any"
                    value={formPurchaseCost}
                    onChange={(e) => setFormPurchaseCost(e.target.value)}
                    placeholder="9000"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label htmlFor="prod-price-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Selling Price ({sym}) *
                  </label>
                  <input
                    id="prod-price-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="13500"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-stock-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    id="prod-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label htmlFor="prod-min-stock-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    id="prod-min-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prod-img-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Product Image URL (Optional)
                </label>
                <input
                  id="prod-img-input"
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Delete &ldquo;{deleteTarget.name}&rdquo;?
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Removing this product from the catalogue will not alter past saved invoices, but it will no longer appear in quick-fill suggestions.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
