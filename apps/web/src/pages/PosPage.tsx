import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  QrCode,
  CreditCard,
  Banknote,
  Coffee,
  Receipt,
  Sparkles,
  LayoutGrid,
  CupSoda,
  Leaf,
  Cookie,
  Sandwich,
  UtensilsCrossed,
} from 'lucide-react';
import { Category, Product, Bill } from '../types';
import { catalogService, billingService, analyticsService } from '../services/cafeServices';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { getProductImage } from '../utils/productImages';

interface PosPageProps {
  searchTerm: string;
}

export const PosPage: React.FC<PosPageProps> = ({ searchTerm }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [popularProductIds, setPopularProductIds] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');

  const {
    items: cartItems,
    addItem,
    updateQuantity,
    clearCart,
    paymentMode,
    setPaymentMode,
    discountAmount,
    setDiscountAmount,
    taxAmount,
    setTaxAmount,
    subtotal,
    totalAmount,
    itemCount,
  } = useCart();

  const { success: showSuccess, error: showError } = useToast();

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cats, prods, bestSellers] = await Promise.all([
        catalogService.getCategories(false),
        catalogService.getProducts({ active_only: true }),
        analyticsService.getBestSellers({ limit: 1 }).catch(() => []),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (bestSellers && bestSellers.length > 0) {
        setPopularProductIds(new Set(bestSellers.map((b) => b.product_id)));
      }
    } catch (err: any) {
      showError('Catalog Error', err.message || 'Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      const matchSearch = searchTerm
        ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchTerm]);

  // Cart quantity map
  const cartQtyMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cartItems) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cartItems]);

  const handleAddToCart = (prod: Product) => {
    if (prod.track_stock) {
      const stock = prod.stock_quantity ?? 0;
      if (stock <= 0) {
        showError('Item Sold Out', `'${prod.name}' is sold out for today!`);
        return;
      }
      const inCart = cartQtyMap.get(prod.id) || 0;
      if (inCart >= stock) {
        showError(
          'Stock Limit Reached',
          `Only ${stock} '${prod.name}' available in stock. Cannot add more.`
        );
        return;
      }
    }
    addItem(prod);
  };

  const handleSaveBill = async () => {
    if (cartItems.length === 0) {
      showError('Cart is Empty', 'Please add products before checking out');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        payment_mode: paymentMode,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        items: cartItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const bill = await billingService.createBill(payload);
      showSuccess(
        `Bill Created: ${bill.bill_number}`,
        `Total: ₹${parseFloat(bill.total_amount).toFixed(2)}`
      );
      setConfirmedBill(bill);
      clearCart();
      // Reload catalog so that stock counts decrement in real-time
      loadCatalog();
    } catch (err: any) {
      showError('Billing Rejected', err.message || 'Server validation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (categoryName: string, isSelected: boolean) => {
    const name = categoryName.toLowerCase();
    const iconClass = `w-5 h-5 transition-colors ${
      isSelected ? 'text-maroon-700' : 'text-slate-500 group-hover:text-slate-800'
    }`;

    if (name.includes('all')) return <LayoutGrid className={iconClass} strokeWidth={2} />;
    if (name.includes('espresso') || name.includes('brew') || name.includes('hot') || name.includes('coffee')) return <Coffee className={iconClass} strokeWidth={2} />;
    if (name.includes('cold') || name.includes('frappe') || name.includes('iced') || name.includes('soda')) return <CupSoda className={iconClass} strokeWidth={2} />;
    if (name.includes('tea') || name.includes('chai') || name.includes('matcha')) return <Leaf className={iconClass} strokeWidth={2} />;
    if (name.includes('baker') || name.includes('pastr') || name.includes('croissant') || name.includes('cake') || name.includes('muffin')) return <Cookie className={iconClass} strokeWidth={2} />;
    if (name.includes('savor') || name.includes('sandwich') || name.includes('panini') || name.includes('snack')) return <Sandwich className={iconClass} strokeWidth={2} />;
    
    return <UtensilsCrossed className={iconClass} strokeWidth={2} />;
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 p-2.5 sm:p-4 lg:p-6 overflow-hidden relative min-h-0">
      {/* Mobile Top View Switcher (Menu vs Cart) */}
      <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-2xl flex-shrink-0">
        <button
          onClick={() => setMobileView('menu')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobileView === 'menu'
              ? 'bg-white text-maroon-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Menu Catalog ({products.length})
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'cart'
              ? 'bg-white text-maroon-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Order Cart</span>
          {itemCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-maroon-700 text-white text-[10px] font-extrabold">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* LEFT CATALOG SECTION (Scrollable only: Categories + Select Menu) */}
      <div className={`flex-1 h-full overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6 min-w-0 ${mobileView === 'cart' ? 'hidden lg:block' : 'block'}`}>
        {/* Categories Row */}
        <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Categories</h3>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 no-scrollbar">
              {/* All Menu Card */}
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`group flex-shrink-0 w-24 sm:w-28 py-2.5 sm:py-3 px-2 rounded-2xl border text-center transition-all duration-150 select-none flex flex-col items-center justify-center ${
                  selectedCategoryId === null
                    ? 'border-2 border-maroon-700 bg-maroon-50/70 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                    selectedCategoryId === null ? 'bg-maroon-100/90' : 'bg-slate-100/90 group-hover:bg-slate-200/80'
                  }`}
                >
                  {getCategoryIcon('all', selectedCategoryId === null)}
                </div>
                <div
                  className={`text-xs font-bold truncate w-full px-1 ${
                    selectedCategoryId === null ? 'text-maroon-800' : 'text-slate-800'
                  }`}
                >
                  All Menu
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {products.length} Items
                </div>
              </button>

              {/* Dynamic Category Cards */}
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`group flex-shrink-0 w-24 sm:w-28 py-2.5 sm:py-3 px-2 rounded-2xl border text-center transition-all duration-150 select-none flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-2 border-maroon-700 bg-maroon-50/70 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                        isSelected ? 'bg-maroon-100/90' : 'bg-slate-100/90 group-hover:bg-slate-200/80'
                      }`}
                    >
                      {getCategoryIcon(cat.name, isSelected)}
                    </div>
                    <div
                      className={`text-xs font-bold truncate w-full px-1 ${
                        isSelected ? 'text-maroon-800' : 'text-slate-800'
                      }`}
                    >
                      {cat.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {cat.product_count !== undefined ? `${cat.product_count} Items` : 'Catalog'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Menu Section */}
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Select Menu</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Coffee className="w-8 h-8 animate-spin text-maroon-700 mb-2" />
                <span className="text-xs font-medium">Brewing cafe menu...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-8 text-center">
                <Coffee className="w-12 h-12 stroke-[1.5] text-maroon-700/60 mb-2" />
                <p className="text-sm font-bold text-slate-800">No menu items found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {products.length === 0
                    ? "Your cafe menu is currently empty. Go to the Menu Catalog tab in the sidebar to add your custom categories & products."
                    : "Try selecting another category or clearing your search."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-20 lg:pb-0">
                {filteredProducts.map((prod) => {
                  const inCartQty = cartQtyMap.get(prod.id) || 0;
                  const imgUrl = getProductImage(prod.name, prod.image_url);
                  const price = parseFloat(prod.selling_price);
                  const isTracked = prod.track_stock === true;
                  const stockQty = prod.stock_quantity ?? 0;
                  const isSoldOut = isTracked && stockQty <= 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddToCart(prod)}
                      className={`group bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border transition-all duration-200 select-none relative flex flex-col ${
                        isSoldOut
                          ? 'opacity-70 bg-slate-50/80 border-slate-200 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'border-maroon-700/60 ring-2 ring-maroon-700/15 shadow-sm cursor-pointer hover:shadow-card-hover'
                          : 'border-slate-100 shadow-card hover:border-slate-200 cursor-pointer hover:shadow-card-hover'
                      }`}
                    >
                      {/* Photo Image Card */}
                      <div className="relative h-28 sm:h-36 w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={imgUrl}
                          alt={prod.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isSoldOut
                              ? 'grayscale contrast-75'
                              : 'group-hover:scale-105'
                          }`}
                          loading="lazy"
                        />

                        {/* Sold Out Overlay vs Stock Badges */}
                        {isSoldOut ? (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
                              SOLD OUT
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Stock Availability Badge */}
                            {isTracked && (
                              <div
                                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[9px] sm:text-[10px] font-bold shadow-sm tracking-wide ${
                                  stockQty <= 3 ? 'bg-amber-600' : 'bg-emerald-600'
                                }`}
                              >
                                {stockQty <= 3 ? `Only ${stockQty} Left` : `${stockQty} Balance`}
                              </div>
                            )}

                            {/* Dynamic Popular / Best Seller Tag (when not tracked) */}
                            {!isTracked && popularProductIds.has(prod.id) && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-forest-700 text-white text-[9px] sm:text-[10px] font-bold shadow-sm tracking-wide">
                                Popular
                              </div>
                            )}

                            {/* In Cart Counter */}
                            {inCartQty > 0 && (
                              <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-maroon-700 text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center shadow-md animate-scale-in">
                                {inCartQty}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Title & Price Section */}
                      <div className="mt-2">
                        <h4
                          className={`font-extrabold text-xs sm:text-sm transition-colors line-clamp-1 ${
                            isSoldOut
                              ? 'text-slate-400 line-through'
                              : 'text-slate-900 group-hover:text-maroon-700'
                          }`}
                        >
                          {prod.name}
                        </h4>
                        <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                              ₹{price.toFixed(2)}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">/ Portion</span>
                          </div>
                          {isSoldOut ? (
                            <span className="text-[10px] font-extrabold text-rose-600 uppercase px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">
                              Sold Out
                            </span>
                          ) : (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-100 group-hover:bg-maroon-700 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sticky Floating Cart Button */}
        {mobileView === 'menu' && cartItems.length > 0 && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30 animate-slide-up">
            <button
              onClick={() => setMobileView('cart')}
              className="w-full py-3 px-4 bg-maroon-700 hover:bg-maroon-800 text-white rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs sm:text-sm border border-maroon-600/50"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] flex items-center justify-center font-extrabold">
                  {itemCount}
                </span>
                <span>View Order Cart</span>
              </div>
              <span className="font-mono text-sm sm:text-base font-black">₹{totalAmount.toFixed(2)} →</span>
            </button>
          </div>
        )}

        {/* RIGHT DETAIL ITEMS PANEL */}
        <div className={`w-full lg:w-[380px] xl:w-[410px] flex-1 lg:flex-initial lg:h-full bg-white rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 flex flex-col justify-between shadow-sm overflow-y-auto lg:overflow-hidden min-h-0 ${mobileView === 'menu' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Top Section: Header & Cart Items List */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0 gap-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  onClick={() => setMobileView('menu')}
                  className="lg:hidden px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 text-[11px] sm:text-xs font-bold transition-colors flex-shrink-0"
                >
                  ← Menu
                </button>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">Detail Items</h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] sm:text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 sm:px-2.5 py-1 rounded-xl transition-colors flex-shrink-0"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Items List (only this scrolls if cart has many items) */}
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0 my-1.5 pr-1">
              {cartItems.length === 0 ? (
                <div className="py-4 sm:py-8 flex flex-col items-center justify-center h-full text-center select-none">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-300">
                    <Receipt className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-700">No items selected</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 max-w-[180px] mx-auto">
                    Click menu cards to add items to customer order
                  </div>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => {
                  const unitPrice = parseFloat(product.selling_price) || 0;
                  const lineTotal = unitPrice * quantity;
                  const imgUrl = getProductImage(product.name, product.image_url);

                  return (
                    <div key={product.id} className="py-3 flex items-center gap-3">
                      {/* Thumbnail */}
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-12 h-12 rounded-2xl object-cover bg-slate-100 flex-shrink-0"
                      />

                      {/* Product Name & Category */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {product.name}
                          </span>
                          {product.track_stock && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                              {product.stock_quantity} left
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {product.category_name || 'Cafe Item'}
                        </div>

                        {/* Stepper with Stock Limit Guard */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-5 h-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 min-w-[14px] text-center font-mono">
                            {quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (product.track_stock) {
                                const avail = product.stock_quantity ?? 0;
                                if (quantity >= avail) {
                                  showError(
                                    'Stock Limit Reached',
                                    `Only ${avail} '${product.name}' available in stock`
                                  );
                                  return;
                                }
                              }
                              updateQuantity(product.id, 1);
                            }}
                            disabled={
                              product.track_stock &&
                              quantity >= (product.stock_quantity ?? 0)
                            }
                            className="w-5 h-5 rounded-lg bg-maroon-700 hover:bg-maroon-800 disabled:opacity-40 disabled:hover:bg-maroon-700 text-white flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-extrabold text-maroon-700 font-display">
                          ₹{lineTotal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {quantity} x ₹{unitPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Financial Breakdown & Payment (permanently pinned & static at bottom) */}
          <div className="pt-3 pb-3 lg:pb-0 border-t border-slate-100 space-y-3 flex-shrink-0">
            <div className="space-y-1 text-xs text-slate-500 font-medium">
              <div className="flex justify-between">
                <span>Item</span>
                <span className="font-bold text-slate-800">{itemCount} (Items)</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800 font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-forest-700 font-bold font-mono">-₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs font-mono text-forest-700 font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax (GST)</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-600 font-bold font-mono">+₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs font-mono text-slate-800 font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dotted Divider & Total */}
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-baseline">
              <span className="font-extrabold text-base text-slate-900">Total</span>
              <span className="font-black text-2xl text-slate-900 font-display">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Selector Matching Reference */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-1.5">Payment Method</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={`py-2 px-1.5 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold border transition-all ${
                    paymentMode === 'CASH'
                      ? 'border-2 border-maroon-700 bg-maroon-50/50 text-maroon-800 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Banknote
                    className={`w-4 h-4 ${
                      paymentMode === 'CASH' ? 'text-maroon-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('CARD')}
                  className={`py-2 px-1.5 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold border transition-all ${
                    paymentMode === 'CARD'
                      ? 'border-2 border-maroon-700 bg-maroon-50/50 text-maroon-800 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard
                    className={`w-4 h-4 ${
                      paymentMode === 'CARD' ? 'text-maroon-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Debit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`py-2 px-1.5 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold border transition-all ${
                    paymentMode === 'UPI'
                      ? 'border-2 border-maroon-700 bg-maroon-50/50 text-maroon-800 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <QrCode
                    className={`w-4 h-4 ${
                      paymentMode === 'UPI' ? 'text-maroon-700' : 'text-slate-400'
                    }`}
                  />
                  <span>QRIS / UPI</span>
                </button>
              </div>

              {/* Dynamic QR Code for UPI */}
              {paymentMode === 'UPI' && totalAmount > 0 && (
                <div className="mt-2.5 p-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 animate-fade-in">
                  <div className="w-10 h-10 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-8 h-8 text-slate-900" />
                  </div>
                  <div className="text-[11px] leading-tight text-slate-700">
                    <div className="font-bold text-maroon-700">Scan to Pay via UPI</div>
                    <div className="text-slate-400 font-mono text-[10px]">magicmug@upi</div>
                    <div className="font-extrabold text-slate-900 font-mono mt-0.5">
                      ₹{totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm & Save Button */}
            <button
              onClick={handleSaveBill}
              disabled={cartItems.length === 0 || isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white font-extrabold text-sm shadow-glow-maroon transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]"
            >
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Confirming Order...' : 'Confirm & Pay'}</span>
            </button>
          </div>
        </div>

      {/* Printable Receipt Modal */}
      {confirmedBill && (
        <PrintableReceipt
          bill={confirmedBill}
          onClose={() => setConfirmedBill(null)}
        />
      )}
    </div>
  );
};
