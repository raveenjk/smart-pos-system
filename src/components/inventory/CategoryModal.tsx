import { useState, useEffect } from 'react';
import { X, Tags, Plus, Trash2, FolderPlus, AlertCircle, Check, Package } from 'lucide-react';
import type { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChanged: () => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onCategoryChanged,
}: CategoryModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCategories = async () => {
    if (!window.api?.getCategories) return;
    const cats = await window.api.getCategories();
    setCategories(cats || []);
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setName('');
      setDescription('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a category name');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await window.api.createCategory({
        name: cleanName,
        description: description.trim() || undefined,
      });

      if (res?.success) {
        setSuccess(`✓ Category "${cleanName}" added successfully!`);
        setName('');
        setDescription('');
        await loadCategories();
        onCategoryChanged();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res?.message || 'Failed to add category');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.id === 1) {
      alert('The default "General" category cannot be deleted.');
      return;
    }

    const hasProducts = (cat.product_count ?? 0) > 0;
    const confirmMsg = hasProducts
      ? `Category "${cat.name}" has ${cat.product_count} product(s). Deleting it will move these products to the "General" category. Proceed?`
      : `Delete category "${cat.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await window.api.deleteCategory(cat.id);
      if (res?.success) {
        await loadCategories();
        onCategoryChanged();
      } else {
        alert(res?.message || 'Failed to delete category');
      }
    } catch {
      alert('Error deleting category');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Tags size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Category Management</h2>
              <p className="text-xs text-gray-400">Add, organize & manage product categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Create Category Form */}
          <form onSubmit={handleAddCategory} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
              <FolderPlus size={16} className="text-blue-600" />
              Add New Category
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. Beverages, Snacks, Electronics..."
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief category description..."
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertCircle size={13} /> {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check size={13} /> {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={15} />
              {loading ? 'Adding Category...' : 'Save New Category'}
            </button>
          </form>

          {/* Existing Categories List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Existing Categories ({categories.length})
              </h3>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {categories.map((c) => {
                const isGeneral = c.id === 1;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 leading-tight truncate">
                          {c.name}
                        </p>
                        {c.description && (
                          <p className="text-[11px] text-gray-400 truncate">{c.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1">
                        <Package size={11} className="text-gray-400" />
                        {c.product_count ?? 0}
                      </span>

                      {!isGeneral ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c)}
                          title="Delete Category"
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic px-1 font-medium">Default</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
