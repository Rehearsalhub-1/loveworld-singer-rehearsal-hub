"use client";

import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  FolderOpen
} from "lucide-react";
import { PraiseNight, Category, PraiseNightSong } from '../../types/supabase';
import EditSongModal from '../EditSongModal';
import MediaSelectionModal from '../MediaSelectionModal';
import EditPageModal from './EditPageModal';
import { useAdminTheme } from './AdminThemeProvider';

interface AdminModalsProps {
  // Page Modal
  showPageModal: boolean;
  setShowPageModal: (show: boolean) => void;
  editingPage: PraiseNight | null;
  setEditingPage: (page: PraiseNight | null) => void;
  newPageName: string;
  setNewPageName: (name: string) => void;
  newPageDate: string;
  setNewPageDate: (date: string) => void;
  newPageLocation: string;
  setNewPageLocation: (location: string) => void;
  newPageDescription: string;
  setNewPageDescription: (description: string) => void;
  newPageCategory: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';
  setNewPageCategory: (category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive') => void;
  newPageDays: number;
  setNewPageDays: (days: number) => void;
  newPageHours: number;
  setNewPageHours: (hours: number) => void;
  newPageMinutes: number;
  setNewPageMinutes: (minutes: number) => void;
  newPageSeconds: number;
  setNewPageSeconds: (seconds: number) => void;
  newPageBannerImage: string;
  setNewPageBannerImage: (image: string) => void;
  newPageBannerFile: File | null;
  setNewPageBannerFile: (file: File | null) => void;
  handleAddPage: () => void;
  handleUpdatePage: () => void;

  // Category Modal
  showCategoryModal: boolean;
  setShowCategoryModal: (show: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  editingPageCategory: any | null; // New prop for editing page categories
  setEditingPageCategory: (category: any | null) => void; // New prop for editing page categories
  newPageCategoryName: string;
  setNewPageCategoryName: (name: string) => void;
  newPageCategoryDescription: string; // New prop for page category description
  setNewPageCategoryDescription: (description: string) => void; // New prop for page category description
  handleAddCategory: () => void;
  handleUpdateCategory: () => void;
  handleAddPageCategory: () => void; // New prop for adding page categories
  handleUpdatePageCategory: () => void; // New prop for updating page categories
  activeSection: string;
  pageCategories: any[]; // New prop for available page categories

  // Page Category Selection
  newPagePageCategory: string; // New prop for page category selection
  setNewPagePageCategory: (pageCategory: string) => void; // New prop for page category selection

  // Song Modal
  showSongModal: boolean;
  setShowSongModal: (show: boolean) => void;
  editingSong: PraiseNightSong | null;
  setEditingSong: (song: PraiseNightSong | null) => void;
  allCategories: Category[];
  pages: PraiseNight[];
  handleSaveSong: (songData: PraiseNightSong) => void;

  // Delete Dialogs
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  pageToDelete: PraiseNight | null;
  setPageToDelete: (page: PraiseNight | null) => void;
  confirmDeletePage: () => void;
  cancelDeletePage: () => void;

  showDeleteSongDialog: boolean;
  setShowDeleteSongDialog: (show: boolean) => void;
  songToDelete: PraiseNightSong | null;
  setSongToDelete: (song: PraiseNightSong | null) => void;
  confirmDeleteSong: () => void;
  cancelDeleteSong: () => void;

  showDeleteCategoryDialog: boolean;
  setShowDeleteCategoryDialog: (show: boolean) => void;
  categoryToDelete: Category | null;
  setCategoryToDelete: (category: Category | null) => void;
  confirmDeleteCategory: () => void;
  cancelDeleteCategory: () => void;
}

export default function AdminModals(props: AdminModalsProps) {
  const { theme } = useAdminTheme();

  // Theme-based CSS classes
  const inputClasses = `w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${theme.focusRing} ${theme.focusBorder} focus:shadow-xl ${theme.focusBg}`;
  const buttonClasses = `flex-1 flex items-center justify-center gap-2 px-4 py-3 ${theme.primary} text-white ${theme.primaryHover} rounded-lg transition-colors font-medium`;
  const selectButtonClasses = `w-full px-4 py-3 ${theme.primaryLight} ${theme.bgHover} ${theme.text} font-medium rounded-lg border-2 ${theme.border} ${theme.borderHover} transition-all duration-200 flex items-center justify-center gap-2`;

  // Media Library Modal State
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const {
    // Page Modal
    showPageModal,
    setShowPageModal,
    editingPage,
    setEditingPage,
    newPageName,
    setNewPageName,
    newPageDate,
    setNewPageDate,
    newPageLocation,
    setNewPageLocation,
    newPageDescription,
    setNewPageDescription,
    newPageCategory,
    setNewPageCategory,
    newPageDays,
    setNewPageDays,
    newPageHours,
    setNewPageHours,
    newPageMinutes,
    setNewPageMinutes,
    newPageSeconds,
    setNewPageSeconds,
    newPageBannerImage,
    setNewPageBannerImage,
    newPageBannerFile,
    setNewPageBannerFile,
    handleAddPage,
    handleUpdatePage,

    // Category Modal
    showCategoryModal,
    setShowCategoryModal,
    editingCategory,
    setEditingCategory,
    editingPageCategory, // New prop
    setEditingPageCategory, // New prop
    newPageCategoryName,
    setNewPageCategoryName,
    newPageCategoryDescription, // New prop
    setNewPageCategoryDescription, // New prop
    handleAddCategory,
    handleUpdateCategory,
    handleAddPageCategory, // New prop
    handleUpdatePageCategory, // New prop
    activeSection,
    pageCategories, // New prop
    newPagePageCategory, // New prop
    setNewPagePageCategory, // New prop

    // Song Modal
    showSongModal,
    setShowSongModal,
    editingSong,
    setEditingSong,
    allCategories,
    pages,
    handleSaveSong,

    // Delete Dialogs
    showDeleteDialog,
    pageToDelete,
    confirmDeletePage,
    cancelDeletePage,

    showDeleteSongDialog,
    songToDelete,
    confirmDeleteSong,
    cancelDeleteSong,

    showDeleteCategoryDialog,
    categoryToDelete,
    confirmDeleteCategory,
    cancelDeleteCategory
  } = props;

  return (
    <>
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-white z-[80] flex flex-col">
          <div className="bg-white w-full h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                {(editingPageCategory || editingCategory) ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingPageCategory(null);
                  setEditingCategory(null);
                  setNewPageCategoryName('');
                  setNewPageCategoryDescription(''); // Reset description
                }}
                className="text-slate-400 hover:text-slate-600 p-2 -mr-2"
              >
                <X className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-200">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newPageCategoryName}
                    onChange={(e) => setNewPageCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 transition-all duration-200">
                    Description
                  </label>
                  <textarea
                    value={newPageCategoryDescription}
                    onChange={(e) => setNewPageCategoryDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
                    placeholder="Enter category description"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
                  <button
                    onClick={(editingPageCategory || editingCategory) ? (editingPageCategory ? handleUpdatePageCategory : handleUpdateCategory) : (activeSection === 'Categories' ? handleAddCategory : handleAddPageCategory)}
                    className={buttonClasses}
                  >
                    <Save className="w-4 h-4" />
                    <span className="text-sm sm:text-base">{(editingPageCategory || editingCategory) ? 'Update' : 'Add'} Category</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingPageCategory(null);
                      setEditingCategory(null);
                      setNewPageCategoryName('');
                      setNewPageCategoryDescription(''); // Reset description
                    }}
                    className="w-full sm:w-auto px-4 py-3 border border-gray-300 text-gray-700 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Modal */}
      <EditPageModal
        isOpen={showPageModal}
        onClose={() => {
          setShowPageModal(false);
          setEditingPage(null);
          setNewPageName('');
          setNewPageDate('');
          setNewPageLocation('');
          setNewPageDescription('');
          setNewPageCategory('unassigned');
          setNewPagePageCategory('');
          setNewPageBannerImage('');
          setNewPageBannerFile(null);
          setNewPageDays(0);
          setNewPageHours(0);
          setNewPageMinutes(0);
          setNewPageSeconds(0);
        }}
        editingPage={editingPage}
        name={newPageName}
        setName={setNewPageName}
        date={newPageDate}
        setDate={setNewPageDate}
        location={newPageLocation}
        setLocation={setNewPageLocation}
        description={newPageDescription}
        setDescription={setNewPageDescription}
        category={newPageCategory}
        setCategory={setNewPageCategory}
        pageCategory={newPagePageCategory}
        setPageCategory={setNewPagePageCategory}
        availablePageCategories={pageCategories}
        days={newPageDays}
        setDays={setNewPageDays}
        hours={newPageHours}
        setHours={setNewPageHours}
        minutes={newPageMinutes}
        setMinutes={setNewPageMinutes}
        seconds={newPageSeconds}
        setSeconds={setNewPageSeconds}
        bannerImage={newPageBannerImage}
        setBannerImage={setNewPageBannerImage}
        bannerFile={newPageBannerFile}
        setBannerFile={setNewPageBannerFile}
        onSave={() => {
          if (editingPage) {
            handleUpdatePage();
          } else {
            handleAddPage();
          }
        }}
        onOpenMediaLibrary={() => setShowMediaLibrary(true)}
      />

      {/* Song Edit Modal */}
      <EditSongModal
        isOpen={showSongModal}
        onClose={() => {
          setShowSongModal(false);
          setEditingSong(null);
        }}
        song={editingSong}
        categories={allCategories}
        praiseNightCategories={pages.map(page => ({ id: page.id, name: page.name, description: 'Praise Night Event', date: page.date, location: page.location || '', icon: 'Music', color: '#8B5CF6', isActive: true, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), countdown: page.countdown || { days: 0, hours: 0, minutes: 0, seconds: 0 } }))}
        onUpdate={(songData) => {
          handleSaveSong(songData);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && pageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Page</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the page:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{pageToDelete.name}</p>
                <p className="text-sm text-gray-500">{pageToDelete.location}</p>
                <p className="text-sm text-gray-500">{pageToDelete.date}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDeletePage}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePage}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Song Confirmation Dialog */}
      {showDeleteSongDialog && songToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Song</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the song:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{songToDelete.title}</p>
                <p className="text-sm text-gray-500">Lead Singer: {songToDelete.leadSinger || 'Not specified'}</p>
                <p className="text-sm text-gray-500">Status: {songToDelete.status}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDeleteSong}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSong}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Song
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {showDeleteCategoryDialog && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the category:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{categoryToDelete.name}</p>
                <p className="text-sm text-gray-500">{categoryToDelete.description}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDeleteCategory}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal for Banner Image Selection */}
      <MediaSelectionModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onFileSelect={(file) => {
          setNewPageBannerImage(file.url);
          setNewPageBannerFile(null); setShowMediaLibrary(false);
        }}
        allowedTypes={['image']}
        title="Select Banner Image"
      />
    </>
  );
}
