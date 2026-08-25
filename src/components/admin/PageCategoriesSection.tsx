"use client";

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus,
  Edit2,
  Trash2,
  Tag,
  X,
  FolderOpen,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  ImageIcon,
  Eye
} from "lucide-react";
import { Toast } from '../Toast';
import MediaSelectionModal from '../MediaSelectionModal';
import { useAdminTheme } from './AdminThemeProvider';
import { sanitizeImageUrl } from '@/utils/image-utils';

export interface PageCategory {
  id: string;
  name: string;
  description: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PageCategoriesSectionProps {
  pageCategories: PageCategory[];
  pages: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onCategoryClick?: (categoryName: string) => void;
  onPageClick?: (page: any) => void;
  showPageCategoryModal: boolean;
  setShowPageCategoryModal: (show: boolean) => void;
  editingPageCategory: PageCategory | null;
  setEditingPageCategory: (category: PageCategory | null) => void;
  newPageCategoryName: string;
  setNewPageCategoryName: (name: string) => void;
  newPageCategoryDescription: string;
  setNewPageCategoryDescription: (description: string) => void;
  newPageCategoryImage: string;
  setNewPageCategoryImage: (image: string) => void;
  showDeletePageCategoryDialog: boolean;
  setShowDeletePageCategoryDialog: (show: boolean) => void;
  pageCategoryToDelete: PageCategory | null;
  setPageCategoryToDelete: (category: PageCategory | null) => void;
  handleAddPageCategory: () => void;
  handleEditPageCategory: (category: PageCategory) => void;
  handleUpdatePageCategory: () => void;
  handleDeletePageCategory: (category: PageCategory) => void;
  confirmDeletePageCategory: () => void;
  cancelDeletePageCategory: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

export default function PageCategoriesSection(props: PageCategoriesSectionProps) {
  const { theme } = useAdminTheme();
  
  const {
    pageCategories,
    pages,
    searchTerm,
    setSearchTerm,
    onPageClick,
    showPageCategoryModal,
    setShowPageCategoryModal,
    editingPageCategory,
    setEditingPageCategory,
    newPageCategoryName,
    setNewPageCategoryName,
    newPageCategoryDescription,
    setNewPageCategoryDescription,
    newPageCategoryImage,
    setNewPageCategoryImage,
    showDeletePageCategoryDialog,
    setShowDeletePageCategoryDialog,
    pageCategoryToDelete,
    handleAddPageCategory,
    handleEditPageCategory,
    handleUpdatePageCategory,
    handleDeletePageCategory,
    confirmDeletePageCategory,
    cancelDeletePageCategory,
  } = props;

  // UI state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PageCategory | null>(null);

  // Computed data
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return pageCategories;
    
    const term = searchTerm.toLowerCase().trim();
    return pageCategories.filter(category => 
      category.name.toLowerCase().includes(term) || 
      (category.description || '').toLowerCase().includes(term)
    );
  }, [pageCategories, searchTerm]);

  // Statistics
  const totalProgramsAssigned = useMemo(() => {
    return pages.filter(p => p.pageCategory).length;
  }, [pages]);

  const categoriesWithBanners = useMemo(() => {
    return pageCategories.filter(c => !!c.image).length;
  }, [pageCategories]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-8 space-y-6 scrollbar-hide">
      {/* Glassmorphic Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Program Categories</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                {pageCategories.length} Collections
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Organize praise nights, rehearsal schedules, and program series</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingPageCategory(null);
            setNewPageCategoryName('');
            setNewPageCategoryDescription('');
            setNewPageCategoryImage('');
            setShowPageCategoryModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all shadow-lg shadow-purple-200 active:scale-95 font-bold text-xs"
        >
          <Plus className="w-4 h-4" />
          Add Program Category
        </button>
      </div>

      {/* 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Categories</p>
            <p className="text-2xl font-black text-slate-900">{pageCategories.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Programs Categorized</p>
            <p className="text-2xl font-black text-slate-900">{totalProgramsAssigned}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-purple-700 flex items-center justify-center font-bold shadow-xs">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media Banners</p>
            <p className="text-2xl font-black text-slate-900">{categoriesWithBanners}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-3 lg:p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories by name or description..."
            className="w-full pl-11 pr-9 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear Search
          </button>
        )}
      </div>

      {/* Category Drill-Down View (When category is selected) */}
      {selectedCategory ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Programs in "{selectedCategory.name}"</h3>
                <p className="text-xs text-slate-400">{selectedCategory.description || 'Program collection'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Collections
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages
              .filter(page => page.pageCategory === selectedCategory.name)
              .map(page => (
                <div
                  key={page.id}
                  onClick={() => onPageClick?.(page)}
                  className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="relative mb-3.5 overflow-hidden rounded-2xl aspect-video bg-slate-100">
                      <img
                        src={sanitizeImageUrl(page.bannerImage, 'banner')}
                        alt={page.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/90 backdrop-blur-md text-slate-900 shadow-xs">
                        {page.date || 'Scheduled'}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                      {page.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {page.location || 'HQ Ministry Studio'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                    <span>Manage Set & Repertoire</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
          </div>

          {pages.filter(page => page.pageCategory === selectedCategory.name).length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-3xl flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">No Programs in this Collection</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Assign praise nights or schedules to this category from the Programs section.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Main Category Grid Cards */
        filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const categoryPages = pages.filter(page => page.pageCategory === category.name);
              const pageCount = categoryPages.length;
              const bannerUrl = sanitizeImageUrl(category.image, 'banner');

              return (
                <div
                  key={category.id}
                  className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between group shadow-sm"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {bannerUrl ? (
                      <div className="relative mb-3.5 overflow-hidden rounded-2xl aspect-16/9 bg-slate-100">
                        <img
                          src={bannerUrl}
                          alt={category.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                        <span className="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-full text-[10px] font-black bg-white/95 backdrop-blur-md text-purple-900 shadow-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          {pageCount} {pageCount === 1 ? 'Program' : 'Programs'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 flex items-center justify-center text-white mb-3.5 shadow-md shadow-purple-200 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xs" />
                        <FolderOpen className="w-10 h-10 text-white/90" />
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-black/30 backdrop-blur-md text-white">
                          {pageCount} {pageCount === 1 ? 'Program' : 'Programs'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-base group-hover:text-purple-600 transition-colors truncate">
                        {category.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {category.description || 'Dedicated program series and rehearsal set collection'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl text-xs font-bold transition-all border border-purple-200 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Explore
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPageCategory(category);
                      }}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all border border-slate-200/60 active:scale-95"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePageCategory(category);
                      }}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all border border-slate-200/60 active:scale-95"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-purple-50 text-purple-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <FolderOpen className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Categories Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              {searchTerm ? 'No program categories match your search.' : 'Create your first program category to group rehearsal schedules.'}
            </p>
            <button
              onClick={() => {
                setEditingPageCategory(null);
                setNewPageCategoryName('');
                setNewPageCategoryDescription('');
                setNewPageCategoryImage('');
                setShowPageCategoryModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Program Category
            </button>
          </div>
        )
      )}

      {/* Add/Edit Program Category Modal */}
      {showPageCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingPageCategory ? 'Edit Program Category' : 'New Program Category'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure collection title, summary, and cover banner</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPageCategoryModal(false);
                  setEditingPageCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription('');
                  setNewPageCategoryImage('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPageCategoryName}
                  onChange={(e) => setNewPageCategoryName(e.target.value)}
                  placeholder="e.g., Praise Night 2026, Communion Services, Sunday Repertoire"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description / Purpose
                </label>
                <textarea
                  value={newPageCategoryDescription}
                  onChange={(e) => setNewPageCategoryDescription(e.target.value)}
                  placeholder="Describe the scope of programs in this collection..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Category Banner Image
                </label>

                <button
                  type="button"
                  onClick={() => setShowMediaLibrary(true)}
                  className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-2xl border border-purple-200 transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  {newPageCategoryImage ? 'Change Image Asset' : 'Browse Media Library'}
                </button>

                {newPageCategoryImage && (
                  <div className="mt-3">
                    <img
                      src={newPageCategoryImage}
                      alt="Category image preview"
                      className="w-full h-32 object-cover rounded-2xl border border-purple-200 shadow-sm"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-slate-500 truncate flex-1">
                        {newPageCategoryImage.includes('cloudinary') ? 'Media Library Asset' : 'Custom Image'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewPageCategoryImage('')}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPageCategoryModal(false);
                  setEditingPageCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription('');
                  setNewPageCategoryImage('');
                }}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingPageCategory) {
                    handleUpdatePageCategory();
                  } else {
                    handleAddPageCategory();
                  }
                }}
                className="flex-1 px-4 py-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold text-xs transition-all shadow-md shadow-purple-200 active:scale-95"
              >
                {editingPageCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal for Category Image Selection */}
      <MediaSelectionModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onFileSelect={(file) => {
          setNewPageCategoryImage(file.url);
          setShowMediaLibrary(false);
        }}
        allowedTypes={['image']}
        title="Select Category Image"
      />

      {/* Delete Confirmation Dialog */}
      {showDeletePageCategoryDialog && pageCategoryToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Program Category</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-xs text-slate-600 mb-2">
                Are you sure you want to delete this program category?
              </p>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="font-bold text-xs text-slate-900">{pageCategoryToDelete.name}</p>
                <p className="text-[11px] text-slate-400">{pageCategoryToDelete.description}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDeletePageCategory}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePageCategory}
                className="flex-1 px-4 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-2xl font-bold text-xs transition-all shadow-md shadow-rose-200 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
