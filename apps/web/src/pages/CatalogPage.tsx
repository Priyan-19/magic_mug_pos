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

  // Product Modal
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodCategoryId, setProdCategoryId] = useState<number>(0);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodIsActive, setProdIsActive] = useState<boolean>(true);
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
        });
        showSuccess('Category Updated', `Updated '${catName}'`);
      } else {
        await catalogService.createCategory({
          name: catName,
          description: catDesc,
          display_order: catOrder,
        });
        showSuccess('Category Created', `Created '${catName}'`);
      }
      setIsCatModalOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatOrder(0);
      loadData();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save category');
    }
  };

  const handleDeactivateCategory = async (cat: Category) => {
    if (!window.confirm(`Deactivate category '${cat.name}'? Existing products will remain intact.`))
      return;
    try {
      await catalogService.deactivateCategory(cat.id);
      showSuccess('Category Deactivated', `'${cat.name}' is now inactive`);
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to deactivate category');
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please select an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      showError('File Too Large', 'Please select an image smaller than 2.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setProdImageUrl(result);
        showSuccess('Image Uploaded', 'Dish photo loaded successfully');
      }
    };
    reader.onerror = () => {
      showError('Upload Error', 'Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanImageUrl = prodImageUrl.trim() || undefined;
      if (editingProduct) {
        await catalogService.updateProduct(editingProduct.id, {
          category_id: prodCategoryId,
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          selling_price: prodPrice,
          image_url: cleanImageUrl,
          is_active: prodIsActive,
        });
        showSuccess('Product Updated', `Updated '${prodName}'`);
      } else {
        await catalogService.createProduct({
          category_id: prodCategoryId,
          name: prodName.trim(),
          description: prodDesc.trim() || undefined,
          selling_price: prodPrice,
          image_url: cleanImageUrl,
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
      setShowPresetPicker(false);
      loadData();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to save product');
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

  const handleDeactivateProduct = async (prod: Product) => {
    if (
      !window.confirm(
        `Soft deactivate '${prod.name}'? It will be excluded from the POS billing screen, but retained for all past orders.`
      )
    )
      return;
    try {
      await catalogService.deactivateProduct(prod.id);
      showSuccess('Product Deactivated', `'${prod.name}' soft deactivated`);
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to deactivate product');
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
              onClick={() => {
                setEditingProduct(null);
                setProdName('');
                setProdDesc('');
                setProdPrice('');
                setProdImageUrl('');
                setProdIsActive(true);
                setShowPresetPicker(false);
                if (categories.length > 0) setProdCategoryId(categories[0].id);
                setIsProdModalOpen(true);
              }}
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
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
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-5 font-bold">Product Item</th>
                    <th className="py-4 px-5 font-bold">Category</th>
                    <th className="py-4 px-5 font-bold text-right">Selling Price</th>
                    <th className="py-4 px-5 font-bold text-center">Status</th>
                    <th className="py-4 px-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 flex items-center gap-3">
                        <div
                          onClick={() => {
                            setEditingProduct(prod);
                            setProdCategoryId(prod.category_id);
                            setProdName(prod.name);
                            setProdDesc(prod.description || '');
                            setProdPrice(prod.selling_price);
                            setProdImageUrl(prod.image_url || getProductImage(prod.name));
                            setProdIsActive(prod.is_active);
                            setShowPresetPicker(false);
                            setIsProdModalOpen(true);
                          }}
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
                            prod.is_active
                              ? 'bg-forest-50 text-forest-700 border border-forest-200 hover:bg-forest-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.is_active ? 'bg-forest-600' : 'bg-slate-400'
                            }`}
                          />
                          <span>{prod.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setProdCategoryId(prod.category_id);
                              setProdName(prod.name);
                              setProdDesc(prod.description || '');
                              setProdPrice(prod.selling_price);
                              setProdImageUrl(prod.image_url || getProductImage(prod.name));
                              setProdIsActive(prod.is_active);
                              setShowPresetPicker(false);
                              setIsProdModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Edit Dish & Image"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {prod.is_active && (
                            <button
                              onClick={() => handleDeactivateProduct(prod)}
                              title="Soft Deactivate"
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cat.is_active
                            ? 'bg-forest-50 text-forest-700 border border-forest-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatName(cat.name);
                            setCatDesc(cat.description || '');
                            setCatOrder(cat.display_order);
                            setIsCatModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat.is_active && (
                          <button
                            onClick={() => handleDeactivateCategory(cat)}
                            title="Soft Deactivate"
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        prodIsActive
                          ? 'bg-forest-50 text-forest-700 border-forest-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          prodIsActive ? 'bg-forest-600' : 'bg-slate-400'
                        }`}
                      />
                      <span>{prodIsActive ? 'Active on POS' : 'Hidden from POS'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {prodIsActive ? 'Ready for order' : 'Temporarily unavailable'}
                    </span>
                  </div>
                </div>
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
