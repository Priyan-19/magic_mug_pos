import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Layers,
  Coffee,
  Image as ImageIcon,
  Upload,
  Sparkles,
  X,
  Check,
  Power,
  Package,
} from 'lucide-react';
import { Category, Product } from '../types';
import { catalogService } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';
import { getProductImage, SUGGESTED_IMAGE_PRESETS } from '../utils/productImages';

export const CatalogPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState(0);
  const [catIsActive, setCatIsActive] = useState(true);

  // Product Modal
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodCategoryId, setProdCategoryId] = useState<number>(0);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodIsActive, setProdIsActive] = useState<boolean>(true);
  const [prodTrackStock, setProdTrackStock] = useState<boolean>(false);
  const [prodStockQuantity, setProdStockQuantity] = useState<number>(10);
  const [showPresetPicker, setShowPresetPicker] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success: showSuccess, error: showError } = useToast();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cats, prods] = await Promise.all([
        catalogService.getCategories(true),
        catalogService.getProducts({ active_only: false }),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0 && prodCategoryId === 0) {
        setProdCategoryId(cats[0].id);
      }
    } catch (err: any) {
      showError('Catalog Error', err.message || 'Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  }, [prodCategoryId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await catalogService.updateCategory(editingCategory.id, {
          name: catName,
          description: catDesc,
          display_order: catOrder,
          is_active: catIsActive,
        });
        showSuccess('Category Updated', `Updated '${catName}'`);
      } else {
        await catalogService.createCategory({
          name: catName,
          description: catDesc,
          display_order: catOrder,
          is_active: catIsActive,
        });
        showSuccess('Category Created', `Created '${catName}'`);
      }
      setIsCatModalOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatOrder(0);
      setCatIsActive(true);
      loadData();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const hasProducts = (cat.product_count ?? 0) > 0;
    const confirmMessage = hasProducts
      ? `Are you sure you want to permanently delete category '${cat.name}' and all ${cat.product_count} product(s) in it? This action cannot be undone.`
      : `Are you sure you want to permanently delete category '${cat.name}'? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await catalogService.deleteCategory(cat.id);
      showSuccess(
        'Category Deleted',
        `'${cat.name}' has been permanently deleted from catalog`
      );
      loadData();
    } catch (err: any) {
      showError('Delete Failed', err.message || 'Failed to delete category');
    }
  };

  const handleToggleCategoryStatus = async (cat: Category) => {
    try {
      const nextStatus = !cat.is_active;
      await catalogService.updateCategory(cat.id, { is_active: nextStatus });
      showSuccess(
        nextStatus ? 'Category Activated' : 'Category Deactivated',
        `'${cat.name}' is now ${nextStatus ? 'active' : 'inactive'}`
      );
      loadData();
    } catch (err: any) {
      showError('Update Failed', err.message || 'Failed to update category status');
    }
  };

  const compressImageFile = (file: File, maxDim = 400, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const webp = canvas.toDataURL('image/webp', quality);
            if (webp.startsWith('data:image/webp')) {
              resolve(webp);
              return;
            }
          } catch {
            // fallback to jpeg
          }
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please select an image file (PNG, JPG, WEBP)');
      return;
    }

    try {
      // Automatically compress and resize to max 400x400 (tiny 15-25 KB payload)
      const compressedDataUrl = await compressImageFile(file, 400, 0.75);
      setProdImageUrl(compressedDataUrl);
      showSuccess('Image Uploaded', 'Dish photo auto-compressed for lightning fast loading');
    } catch {
      showError('Upload Error', 'Failed to process image file');
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdImageUrl('');
    setProdIsActive(true);
    setProdTrackStock(false);
    setProdStockQuantity(10);
    setShowPresetPicker(false);
    if (categories.length > 0) setProdCategoryId(categories[0].id);
    setIsProdModalOpen(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdCategoryId(prod.category_id);
    setProdName(prod.name);
    setProdDesc(prod.description || '');
    setProdPrice(prod.selling_price);
    setProdImageUrl(prod.image_url || getProductImage(prod.name));
    setProdIsActive(prod.is_active);
    setProdTrackStock(!!prod.track_stock);
    setProdStockQuantity(prod.stock_quantity ?? 0);
    setShowPresetPicker(false);
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanImageUrl = prodImageUrl.trim() || undefined;
      const initialStock = prodTrackStock ? Math.max(0, prodStockQuantity) : 0;

      if (editingProduct) {
        await catalogService.updateProduct(editingProduct.id, {
          category_id: prodCategoryId,
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          selling_price: prodPrice,
          image_url: cleanImageUrl,
          is_active: prodIsActive,
          track_stock: prodTrackStock,
          stock_quantity: initialStock,
        });
        showSuccess('Product Updated', `Updated '${prodName}'`);
      } else {
        await catalogService.createProduct({
          category_id: prodCategoryId,
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          selling_price: prodPrice,
          image_url: cleanImageUrl,
          track_stock: prodTrackStock,
          stock_quantity: initialStock,
        });
        showSuccess('Product Created', `Added '${prodName}' to catalog`);
      }
      setIsProdModalOpen(false);
      setEditingProduct(null);
      setProdName('');
      setProdDesc('');
      setProdPrice('');
      setProdImageUrl('');
      setProdIsActive(true);
      setProdTrackStock(false);
      setProdStockQuantity(10);
      setShowPresetPicker(false);
      loadData();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save product');
    }
  };

  const handleToggleStock = async (prod: Product) => {
    try {
      const nextTrackStock = !prod.track_stock;
      const nextStockQty = nextTrackStock
        ? prod.stock_quantity && prod.stock_quantity > 0
          ? prod.stock_quantity
          : 10
        : (prod.stock_quantity ?? 0);

      // Optimistic state update for instant UI feedback
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id
            ? { ...p, track_stock: nextTrackStock, stock_quantity: nextStockQty }
            : p
        )
      );

      await catalogService.updateStock(prod.id, {
        track_stock: nextTrackStock,
        stock_quantity: nextStockQty,
      });

      showSuccess(
        nextTrackStock ? 'Stock Tracking ON' : 'Stock Tracking OFF',
        nextTrackStock
          ? `'${prod.name}' set to ${nextStockQty} units. POS will track availability.`
          : `'${prod.name}' set to unlimited availability.`
      );
    } catch (err: any) {
      showError('Update Failed', err.message || 'Failed to update stock setting');
      loadData();
    }
  };

  const handleAdjustStock = async (prod: Product, delta: number) => {
    try {
      const currentQty = prod.stock_quantity ?? 0;
      const nextQty = Math.max(0, currentQty + delta);

      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id
            ? { ...p, track_stock: true, stock_quantity: nextQty }
            : p
        )
      );

      await catalogService.updateStock(prod.id, {
        track_stock: true,
        stock_quantity: nextQty,
      });

      showSuccess(
        'Stock Updated',
        `'${prod.name}' balance updated to ${nextQty} units`
      );
    } catch (err: any) {
      showError('Update Failed', err.message || 'Failed to adjust stock');
      loadData();
    }
  };

  const handleSetExactStock = async (prod: Product, exactQty: number) => {
    try {
      const qty = Math.max(0, Math.floor(exactQty));

      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id
            ? { ...p, track_stock: true, stock_quantity: qty }
            : p
        )
      );

      await catalogService.updateStock(prod.id, {
        track_stock: true,
        stock_quantity: qty,
      });
    } catch (err: any) {
      showError('Update Failed', err.message || 'Failed to update stock quantity');
      loadData();
    }
  };

  const handleToggleProductStatus = async (prod: Product) => {
    try {
      const nextStatus = !prod.is_active;
      await catalogService.updateProduct(prod.id, { is_active: nextStatus });
      showSuccess(
        nextStatus ? 'Dish Activated' : 'Dish Deactivated',
        `'${prod.name}' is now ${nextStatus ? 'visible on POS' : 'hidden from POS'}`
      );
      loadData();
    } catch (err: any) {
      showError('Update Failed', err.message || 'Failed to update dish status');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete '${prod.name}' from the catalog? This action cannot be undone.`
      )
    )
      return;
    try {
      await catalogService.deleteProduct(prod.id);
      showSuccess('Product Deleted', `'${prod.name}' has been permanently deleted from catalog`);
      loadData();
    } catch (err: any) {
      showError('Delete Failed', err.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategoryFilter
      ? p.category_id.toString() === selectedCategoryFilter
      : true;
    const matchSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCat && matchSearch;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-maroon-700" />
            <span>Menu & Product Catalog</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Configure items, categories, pricing, and soft activation flags
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex-1 sm:flex-initial flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setActiveSubTab('products')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'products'
                  ? 'bg-maroon-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Products ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('categories')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'categories'
                  ? 'bg-maroon-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories ({categories.length})</span>
            </button>
          </div>

          {activeSubTab === 'products' ? (
            <button
              onClick={openCreateProduct}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-bold shadow-glow-maroon transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Dish</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setCatDesc('');
                setCatOrder(categories.length + 1);
                setCatIsActive(true);
                setIsCatModalOpen(true);
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-bold shadow-glow-maroon transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* PRODUCTS VIEW */}
      {activeSubTab === 'products' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-5 font-bold">Product Item</th>
                    <th className="py-4 px-5 font-bold">Category</th>
                    <th className="py-4 px-5 font-bold text-right">Selling Price</th>
                    <th className="py-4 px-5 font-bold text-center">Status</th>
                    <th className="py-4 px-5 font-bold text-center">Add Stock</th>
                    <th className="py-4 px-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 flex items-center gap-3">
                        <div
                          onClick={() => openEditProduct(prod)}
                          className="relative group/thumb cursor-pointer flex-shrink-0"
                          title="Click to edit dish & photo"
                        >
                          <img
                            src={getProductImage(prod.name, prod.image_url)}
                            alt={prod.name}
                            className="w-12 h-12 rounded-2xl object-cover bg-slate-100 border border-slate-200/80 shadow-xs group-hover/thumb:ring-2 group-hover/thumb:ring-maroon-700/30 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                          {prod.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {prod.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {prod.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-display font-extrabold text-slate-900 text-sm">
                        ₹{parseFloat(prod.selling_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(prod)}
                          title="Click to toggle status on POS"
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
                            prod.is_active
                              ? 'bg-forest-50 text-forest-700 border border-forest-200 hover:bg-forest-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span>{prod.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* ADD STOCK COLUMN WITH TOGGLE BUTTON & LIVE BALANCE */}
                      <td className="py-3 px-5 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={prod.track_stock}
                              onClick={() => handleToggleStock(prod)}
                              title={
                                prod.track_stock
                                  ? 'Stock tracking is ON (Click to set unlimited)'
                                  : 'Stock tracking is OFF (Click to track daily stock)'
                              }
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                prod.track_stock ? 'bg-maroon-700' : 'bg-slate-300 hover:bg-slate-400'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  prod.track_stock ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[11px] font-extrabold ${
                                prod.track_stock ? 'text-maroon-900' : 'text-slate-400'
                              }`}
                            >
                              {prod.track_stock ? 'ON' : 'OFF'}
                            </span>
                          </div>

                          {/* When Stock Tracking is Active: Show Stepper & Balance Indicator */}
                          {prod.track_stock ? (
                            <div className="flex flex-col items-center gap-1 animate-fade-in">
                              <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/90 rounded-xl p-0.5 shadow-xs">
                                <button
                                  type="button"
                                  disabled={(prod.stock_quantity ?? 0) <= 0}
                                  onClick={() => handleAdjustStock(prod, -1)}
                                  title="Reduce stock by 1"
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 active:scale-95 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs touch-manipulation select-none"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={prod.stock_quantity ?? 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                      handleSetExactStock(prod, val);
                                    }
                                  }}
                                  className="w-10 text-center text-xs font-mono font-black text-slate-900 bg-transparent focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(prod, 1)}
                                  title="Add 1 to stock"
                                  className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs touch-manipulation select-none"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(prod, 10)}
                                  title="Quick Add 10 to stock"
                                  className="px-2 h-6 rounded-lg bg-maroon-50 hover:bg-maroon-100 active:scale-95 text-maroon-700 font-extrabold text-[10px] transition-all border border-maroon-100 touch-manipulation select-none"
                                >
                                  +10
                                </button>
                              </div>

                              {/* Availability Status Badge without bullet dots */}
                              {(prod.stock_quantity ?? 0) <= 0 ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                  SOLD OUT
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    (prod.stock_quantity ?? 0) <= 3
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  <span>{prod.stock_quantity} Balance</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Unlimited
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Edit Dish & Image"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            title="Delete Dish Permanently"
                            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIES VIEW */}
      {activeSubTab === 'categories' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5 font-bold">Category Name</th>
                  <th className="py-4 px-5 font-bold text-center">Display Order</th>
                  <th className="py-4 px-5 font-bold text-center">Active Products</th>
                  <th className="py-4 px-5 font-bold text-center">Status</th>
                  <th className="py-4 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                      {cat.description && (
                        <div className="text-[11px] text-slate-400">{cat.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono">{cat.display_order}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-maroon-700 font-display">
                      {cat.product_count || 0}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryStatus(cat)}
                        title={`Click to ${cat.is_active ? 'deactivate' : 'activate'} category`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer ${
                          cat.is_active
                            ? 'bg-forest-50 text-forest-700 border border-forest-200 hover:bg-forest-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatName(cat.name);
                            setCatDesc(cat.description || '');
                            setCatOrder(cat.display_order);
                            setCatIsActive(cat.is_active);
                            setIsCatModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          title="Delete Category Permanently"
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Specialty Cold Brews"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Optional category description"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={catOrder}
                  onChange={(e) => setCatOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Category Status</div>
                  <div className="text-[11px] text-slate-500">
                    {catIsActive ? 'Active (Items visible on POS)' : 'Inactive (Items hidden from POS)'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={catIsActive}
                  onClick={() => setCatIsActive(!catIsActive)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    catIsActive ? 'bg-forest-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      catIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200/90 w-full max-w-xl rounded-3xl shadow-2xl p-4 sm:p-7 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 flex-shrink-0">
                  <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {editingProduct ? 'Edit Dish & Menu Item' : 'Add New Dish to Menu'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium line-clamp-1">
                    {editingProduct
                      ? 'Update dish photo, pricing, and live POS menu visibility'
                      : 'Configure photo, category, and portion pricing for your cafe'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProdModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 pt-4">
              {/* IMAGE MANAGER SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-maroon-700" />
                    <span>Dish Photo & Visual</span>
                  </label>
                  {prodImageUrl && (
                    <button
                      type="button"
                      onClick={() => setProdImageUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold underline"
                    >
                      Clear custom image
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Visual Preview */}
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-200 border-2 border-dashed border-slate-300 flex-shrink-0 flex items-center justify-center shadow-xs">
                    {prodImageUrl ? (
                      <img
                        src={prodImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-7 h-7 mx-auto mb-1 stroke-1" />
                        <span className="text-[10px] font-semibold block leading-tight">
                          No Photo Selected
                        </span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] font-bold text-white uppercase backdrop-blur-xs">
                      Preview
                    </span>
                  </div>

                  {/* Actions & URL Input */}
                  <div className="flex-1 w-full space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-maroon-700/50 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-maroon-700" />
                        <span>Upload File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPresetPicker(!showPresetPicker)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-xs transition-all ${
                          showPresetPicker
                            ? 'bg-maroon-700 text-white border-maroon-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-maroon-700/50 hover:bg-slate-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Choose Preset</span>
                      </button>
                    </div>

                    <div>
                      <input
                        type="url"
                        value={prodImageUrl}
                        onChange={(e) => setProdImageUrl(e.target.value)}
                        placeholder="Or paste direct image URL (https://...)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* PRESET GALLERY PICKER */}
                {showPresetPicker && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Popular Cafe Photo Presets (Click to Apply)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPresetPicker(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 font-bold"
                      >
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
                      {SUGGESTED_IMAGE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setProdImageUrl(preset.url);
                            setShowPresetPicker(false);
                          }}
                          className={`group relative rounded-xl overflow-hidden border transition-all text-left ${
                            prodImageUrl === preset.url
                              ? 'border-maroon-700 ring-2 ring-maroon-700/20'
                              : 'border-slate-200 hover:border-maroon-700/60'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-14 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1">
                            <span className="text-[9px] font-bold text-white block truncate leading-tight">
                              {preset.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DETAILS FORM FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dish / Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Vanilla Bean Latte"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="45.00"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    POS Menu Status
                  </label>
                  <div className="flex items-center gap-2 h-10">
                    <button
                      type="button"
                      onClick={() => setProdIsActive(!prodIsActive)}
                      className={`flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        prodIsActive
                          ? 'bg-forest-50 text-forest-700 border-forest-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{prodIsActive ? 'Active on POS' : 'Hidden from POS'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {prodIsActive ? 'Ready for order' : 'Temporarily unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DAILY STOCK TRACKING SECTION */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="pr-3">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-maroon-700" />
                      <span>Daily Stock Tracking (Add Stock)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Enable for items with limited daily quantity (e.g. 10 Puffs). POS updates balance and indicates SOLD OUT when finished.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prodTrackStock}
                    onClick={() => setProdTrackStock(!prodTrackStock)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      prodTrackStock ? 'bg-maroon-700' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        prodTrackStock ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {prodTrackStock && (
                  <div className="pt-2.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Available Stock Quantity</span>
                      <span className="text-[10px] text-slate-400 block">Units / pieces available today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={prodStockQuantity}
                        onChange={(e) =>
                          setProdStockQuantity(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-24 px-3 py-1.5 bg-white border border-slate-300 focus:border-maroon-700 rounded-xl text-xs font-mono font-bold text-slate-900 text-center focus:outline-none shadow-xs"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setProdStockQuantity((q) => q + 5)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-xs"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdStockQuantity((q) => q + 10)}
                          className="px-2 py-1 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 text-maroon-700 text-[10px] font-bold rounded-lg shadow-xs"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description & Tasting Notes
                </label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="e.g. Double shot espresso with textured oat milk and Madagascar vanilla"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingProduct ? 'Save Dish Changes' : 'Create Dish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
