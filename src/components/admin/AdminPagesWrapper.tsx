"use client";

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import { PraiseNight, PraiseNightSong, Category } from '@/types/supabase';
import CustomLoader from '@/components/CustomLoader';
import { uploadBannerImage } from '@/utils/imageUpload';

const PagesSection = dynamic(() => import('@/components/admin/PagesSection'), { ssr: false });
const AdminModals = dynamic(() => import('@/components/admin/AdminModals'), { ssr: false });
const CategoryOrderModal = dynamic(() => import('@/components/admin/CategoryOrderModal'), { ssr: false });
const PageCategoryOrderModal = dynamic(() => import('@/components/admin/PageCategoryOrderModal'), { ssr: false });

type ProgramCategory = 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';

interface ToastItem { id: string; message: string; type: string; }

function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('unique constraint') || lower.includes('already exists')) return 'A record with this name already exists.';
  if (lower.includes('not found') || lower.includes('404')) return 'The item no longer exists. Please refresh.';
  if (lower.includes('forbidden') || lower.includes('403')) return "You don't have permission to do this.";
  if (lower.includes('network') || lower.includes('fetch')) return 'Connection failed. Check your internet and try again.';
  if (msg.length > 100 || msg.includes('_') || msg.includes('prisma')) return 'Something went wrong. Please try again.';
  return msg;
}

export function AdminPagesWrapper() {
  // Programs + songs + categories — fetched fresh when this page mounts
  const [allPraiseNights, setAllPraiseNights] = useState<PraiseNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSongs, setAllSongs] = useState<PraiseNightSong[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [pageCategories, setPageCategories] = useState<any[]>([]);

  // Selection
  const [selectedPage, setSelectedPage] = useState<PraiseNight | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'heard' | 'unheard'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<PraiseNight | null>(null);
  const [showCategoryOrderModal, setShowCategoryOrderModal] = useState(false);
  const [showPageCategoryOrderModal, setShowPageCategoryOrderModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [editingSong, setEditingSong] = useState<PraiseNightSong | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<PraiseNight | null>(null);
  const [showDeleteSongDialog, setShowDeleteSongDialog] = useState(false);
  const [songToDelete, setSongToDelete] = useState<PraiseNightSong | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPageCategory, setEditingPageCategory] = useState<any | null>(null);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  // Form
  const [newPageName, setNewPageName] = useState('');
  const [newPageDate, setNewPageDate] = useState('');
  const [newPageLocation, setNewPageLocation] = useState('');
  const [newPageDescription, setNewPageDescription] = useState('');
  const [newPageCategory, setNewPageCategory] = useState<ProgramCategory>('unassigned');
  const [newPagePageCategory, setNewPagePageCategory] = useState('');
  const [newPageDays, setNewPageDays] = useState(0);
  const [newPageHours, setNewPageHours] = useState(0);
  const [newPageMinutes, setNewPageMinutes] = useState(0);
  const [newPageSeconds, setNewPageSeconds] = useState(0);
  const [newPageBannerImage, setNewPageBannerImage] = useState('');
  const [newPageBannerFile, setNewPageBannerFile] = useState<File | null>(null);
  const [newPageCategoryName, setNewPageCategoryName] = useState('');
  const [newPageCategoryDescription, setNewPageCategoryDescription] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Data fetching — isolated to this page
  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/programs').catch(() => null);
      setAllPraiseNights(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (e) {
      console.warn('[AdminPagesWrapper] fetchPrograms:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSongsForPage = useCallback(async (programId: string) => {
    try {
      const res = await apiClient.get<any>(`/songs/praise-night?programId=${encodeURIComponent(programId)}`);
      // Guard: only set songs if this programId is still the selected page
      setAllSongs(_prev => {
        // If allSongs was cleared (by a newer effect), still set the result
        return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      });
    } catch (e) {
      console.warn('[AdminPagesWrapper] fetchSongs:', e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, pageCatRes] = await Promise.all([
        apiClient.get<any>('/categories').catch(() => null),
        apiClient.get<any>('/categories/page').catch(() => null),
      ]);
      setAllCategories(Array.isArray(catRes?.data) ? catRes.data : []);
      setPageCategories(Array.isArray(pageCatRes?.data) ? pageCatRes.data : []);
    } catch (e) {
      console.warn('[AdminPagesWrapper] fetchCategories:', e);
    }
  }, []);

  // On mount — fetch programs and categories once
  useEffect(() => { fetchPrograms(); fetchCategories(); }, [fetchPrograms, fetchCategories]);

  // When selected page changes — clear stale songs immediately, then fetch fresh
  useEffect(() => {
    // Always clear first — prevents showing previous program's songs while loading
    setAllSongs([]);
    if (selectedPage?.id) {
      const id = selectedPage.id;
      let active = true;
      fetchSongsForPage(id).finally(() => {
        // If selectedPage changed again while fetching, the new effect will run
        // and this one's cleanup will have set active = false
        if (!active) setAllSongs([]);
      });
      return () => { active = false; };
    }
  }, [selectedPage?.id, fetchSongsForPage]);

  // Keep selectedPage in sync when allPraiseNights updates
  useEffect(() => {
    if (!selectedPage) return;
    const updated = allPraiseNights.find(p => p.id === selectedPage.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPage)) {
      setSelectedPage(updated);
    }
  }, [allPraiseNights]);

  // ----- Handlers -----

  const resetPageForm = () => {
    setNewPageName(''); setNewPageDate(''); setNewPageLocation(''); setNewPageDescription('');
    setNewPageCategory('unassigned'); setNewPagePageCategory('');
    setNewPageDays(0); setNewPageHours(0); setNewPageMinutes(0); setNewPageSeconds(0);
    setNewPageBannerImage(''); setNewPageBannerFile(null);
  };

  const handleAddPage = async () => {
    if (!newPageName.trim() || !newPageDate.trim() || !newPageLocation.trim()) {
      addToast({ type: 'error', message: 'Please fill in all required fields' }); return;
    }
    setIsCreatingPage(true);
    try {
      const res = await apiClient.post<any>('/programs', {
        name: newPageName.trim(), date: newPageDate.trim(),
        location: newPageLocation.trim(), category: newPageCategory, status: newPageCategory,
        pageCategory: newPagePageCategory || null,
        countdown: { days: newPageDays, hours: newPageHours, minutes: newPageMinutes, seconds: newPageSeconds },
        bannerImage: newPageBannerImage,
      });
      if (res?.data?.id && newPageBannerFile) {
        const upload = await uploadBannerImage(newPageBannerFile, res.data.id);
        if (upload.success && upload.url) {
          await apiClient.patch(`/programs/${res.data.id}`, { bannerImage: upload.url });
        }
      }
      addToast({ type: 'success', message: 'Program created!' });
      setShowPageModal(false); resetPageForm(); fetchPrograms();
    } catch (e) { addToast({ type: 'error', message: friendlyError(e) }); }
    finally { setIsCreatingPage(false); }
  };

  const handleUpdatePage = async () => {
    if (!editingPage || !newPageName.trim() || !newPageDate.trim() || !newPageLocation.trim()) {
      addToast({ type: 'error', message: 'Please fill in all required fields' }); return;
    }
    setIsCreatingPage(true);
    try {
      let bannerImageUrl = newPageBannerImage;
      if (newPageBannerFile) {
        const upload = await uploadBannerImage(newPageBannerFile, editingPage.id.toString());
        if (upload.success && upload.url) bannerImageUrl = upload.url;
        else throw new Error(upload.error || 'Failed to upload banner');
      }
      await apiClient.patch(`/programs/${editingPage.id}`, {
        name: newPageName.trim(), date: newPageDate.trim(),
        location: newPageLocation.trim(), category: newPageCategory,
        pageCategory: newPagePageCategory || null, bannerImage: bannerImageUrl || null,
        countdown: { days: newPageDays, hours: newPageHours, minutes: newPageMinutes, seconds: newPageSeconds },
      });
      addToast({ type: 'success', message: 'Program updated' });
      setShowPageModal(false); setEditingPage(null); resetPageForm(); fetchPrograms();
    } catch (e) { addToast({ type: 'error', message: friendlyError(e) }); }
    finally { setIsCreatingPage(false); }
  };

  const handleEditPage = (page: PraiseNight) => {
    setEditingPage(page);
    setNewPageName(page.name); setNewPageDate(page.date);
    setNewPageLocation(page.location || ''); setNewPageDescription('');
    setNewPageCategory(page.category as ProgramCategory);
    setNewPagePageCategory(page.pageCategory || '');
    setNewPageDays(page.countdown?.days || 0); setNewPageHours(page.countdown?.hours || 0);
    setNewPageMinutes(page.countdown?.minutes || 0); setNewPageSeconds(page.countdown?.seconds || 0);
    setNewPageBannerImage(page.bannerImage || ''); setNewPageBannerFile(null);
    setShowPageModal(true);
  };

  const handleDeletePage = (page: PraiseNight) => { setPageToDelete(page); setShowDeleteDialog(true); };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
    try {
      await apiClient.delete(`/programs/${pageToDelete.id}`);
      addToast({ type: 'success', message: 'Program deleted' });
      setShowDeleteDialog(false);
      setAllPraiseNights(prev => prev.filter(p => p.id !== pageToDelete.id));
      if (selectedPage?.id === pageToDelete.id) setSelectedPage(null);
      setPageToDelete(null);
      fetchPrograms();
    } catch (e) { addToast({ type: 'error', message: friendlyError(e) }); }
  };

  const handleEditSong = (song: PraiseNightSong) => { setEditingSong(song); setShowSongModal(true); };
  const handleDeleteSong = (song: PraiseNightSong) => { setSongToDelete(song); setShowDeleteSongDialog(true); };

  const handleToggleSongStatus = async (song: PraiseNightSong) => {
    const newStatus = song.status === 'heard' ? 'unheard' : 'heard';
    setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, status: newStatus } : s));
    try { await apiClient.patch(`/songs/praise-night/${song.id}`, { status: newStatus }); }
    catch (e) {
      setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, status: song.status } : s));
      addToast({ type: 'error', message: friendlyError(e) });
    }
  };

  const handleToggleSongActive = async (song: PraiseNightSong) => {
    const newActive = !(song as any).isActive;
    setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, isActive: newActive } : s));
    try { await apiClient.patch(`/songs/praise-night/${song.id}`, { isActive: newActive }); }
    catch (e) {
      setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, isActive: (song as any).isActive } : s));
      addToast({ type: 'error', message: friendlyError(e) });
    }
  };

  const handleSaveSong = async (songData: PraiseNightSong) => {
    try {
      if (editingSong?.id) {
        await apiClient.patch(`/songs/praise-night/${editingSong.id}`, songData);
        setAllSongs(prev => prev.map(s => s.id === editingSong.id ? { ...s, ...songData } : s));
        addToast({ type: 'success', message: 'Song updated' });
      } else {
        const res = await apiClient.post<any>('/songs/praise-night', { ...songData, praiseNightId: selectedPage?.id });
        if (res?.data) setAllSongs(prev => [res.data, ...prev]);
        addToast({ type: 'success', message: 'Song added' });
      }
      setShowSongModal(false); setEditingSong(null);
    } catch (e) { addToast({ type: 'error', message: friendlyError(e) }); }
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    setAllSongs(prev => prev.filter(s => s.id !== songToDelete.id));
    try {
      await apiClient.delete(`/songs/praise-night/${songToDelete.id}`);
      addToast({ type: 'success', message: 'Song deleted' });
      setShowDeleteSongDialog(false); setSongToDelete(null);
    } catch (e) {
      if (selectedPage?.id) fetchSongsForPage(selectedPage.id);
      addToast({ type: 'error', message: friendlyError(e) });
    }
  };

  const handleUpdateCategoryOrder = async (pageId: string, categoryOrder: string[]) => {
    try {
      await apiClient.patch(`/programs/${pageId}`, { categoryOrder });
      addToast({ type: 'success', message: 'Category order saved' });
      fetchPrograms();
    } catch (e) { addToast({ type: 'error', message: friendlyError(e) }); }
  };

  const handleUpdatePageCategoryOrder = async (updatedCategories: any[]) => {
    setPageCategories(updatedCategories);
    addToast({ type: 'success', message: 'Page types reordered' });
  };

  if (loading && allPraiseNights.length === 0) {
    return <div className="flex-1 flex items-center justify-center"><CustomLoader message="Loading Programs..." /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white transition-all animate-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {toast.message}
          </div>
        ))}
      </div>

      <PagesSection
        allPraiseNights={allPraiseNights}
        loading={loading}
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        allSongs={allSongs}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        showPageModal={showPageModal}
        setShowPageModal={setShowPageModal}
        editingPage={editingPage}
        setEditingPage={setEditingPage}
        newPageName={newPageName} setNewPageName={setNewPageName}
        newPageDate={newPageDate} setNewPageDate={setNewPageDate}
        newPageLocation={newPageLocation} setNewPageLocation={setNewPageLocation}
        newPageDescription={newPageDescription} setNewPageDescription={setNewPageDescription}
        newPageCategory={newPageCategory} setNewPageCategory={setNewPageCategory}
        newPagePageCategory={newPagePageCategory} setNewPagePageCategory={setNewPagePageCategory}
        newPageDays={newPageDays} setNewPageDays={setNewPageDays}
        newPageHours={newPageHours} setNewPageHours={setNewPageHours}
        newPageMinutes={newPageMinutes} setNewPageMinutes={setNewPageMinutes}
        newPageSeconds={newPageSeconds} setNewPageSeconds={setNewPageSeconds}
        newPageBannerImage={newPageBannerImage} setNewPageBannerImage={setNewPageBannerImage}
        newPageBannerFile={newPageBannerFile} setNewPageBannerFile={setNewPageBannerFile}
        isCreatingPage={isCreatingPage}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        pageToDelete={pageToDelete}
        setPageToDelete={setPageToDelete}
        showCategoryOrderModal={showCategoryOrderModal}
        setShowCategoryOrderModal={setShowCategoryOrderModal}
        handleAddPage={handleAddPage}
        handleEditPage={handleEditPage}
        handleUpdatePage={handleUpdatePage}
        handleDeletePage={handleDeletePage}
        confirmDeletePage={confirmDeletePage}
        cancelDeletePage={() => { setShowDeleteDialog(false); setPageToDelete(null); }}
        handleEditSong={handleEditSong}
        handleDeleteSong={handleDeleteSong}
        handleToggleSongStatus={handleToggleSongStatus}
        handleToggleSongActive={handleToggleSongActive}
        allCategories={allCategories}
        addToast={addToast}
        pageCategories={pageCategories}
        showPageCategoryOrderModal={showPageCategoryOrderModal}
        setShowPageCategoryOrderModal={setShowPageCategoryOrderModal}
        handleUpdatePageCategoryOrder={handleUpdatePageCategoryOrder}
      />

      <AdminModals
        showPageModal={showPageModal}
        setShowPageModal={setShowPageModal}
        editingPage={editingPage}
        setEditingPage={setEditingPage}
        newPageName={newPageName} setNewPageName={setNewPageName}
        newPageDate={newPageDate} setNewPageDate={setNewPageDate}
        newPageLocation={newPageLocation} setNewPageLocation={setNewPageLocation}
        newPageDescription={newPageDescription} setNewPageDescription={setNewPageDescription}
        newPageCategory={newPageCategory} setNewPageCategory={setNewPageCategory}
        newPagePageCategory={newPagePageCategory} setNewPagePageCategory={setNewPagePageCategory}
        newPageDays={newPageDays} setNewPageDays={setNewPageDays}
        newPageHours={newPageHours} setNewPageHours={setNewPageHours}
        newPageMinutes={newPageMinutes} setNewPageMinutes={setNewPageMinutes}
        newPageSeconds={newPageSeconds} setNewPageSeconds={setNewPageSeconds}
        newPageBannerImage={newPageBannerImage} setNewPageBannerImage={setNewPageBannerImage}
        newPageBannerFile={newPageBannerFile} setNewPageBannerFile={setNewPageBannerFile}
        handleAddPage={handleAddPage}
        handleUpdatePage={handleUpdatePage}
        showCategoryModal={showCategoryModal}
        setShowCategoryModal={setShowCategoryModal}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        editingPageCategory={editingPageCategory}
        setEditingPageCategory={setEditingPageCategory}
        newPageCategoryName={newPageCategoryName}
        setNewPageCategoryName={setNewPageCategoryName}
        newPageCategoryDescription={newPageCategoryDescription}
        setNewPageCategoryDescription={setNewPageCategoryDescription}
        handleAddCategory={() => {}}
        handleUpdateCategory={() => {}}
        handleAddPageCategory={() => {}}
        handleUpdatePageCategory={() => {}}
        activeSection="Pages"
        pageCategories={pageCategories}
        showSongModal={showSongModal}
        setShowSongModal={setShowSongModal}
        editingSong={editingSong}
        setEditingSong={setEditingSong}
        allCategories={allCategories}
        pages={allPraiseNights}
        handleSaveSong={handleSaveSong}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        pageToDelete={pageToDelete}
        setPageToDelete={setPageToDelete}
        confirmDeletePage={confirmDeletePage}
        cancelDeletePage={() => { setShowDeleteDialog(false); setPageToDelete(null); }}
        showDeleteSongDialog={showDeleteSongDialog}
        setShowDeleteSongDialog={setShowDeleteSongDialog}
        songToDelete={songToDelete}
        setSongToDelete={setSongToDelete}
        confirmDeleteSong={confirmDeleteSong}
        cancelDeleteSong={() => { setShowDeleteSongDialog(false); setSongToDelete(null); }}
        showDeleteCategoryDialog={false}
        setShowDeleteCategoryDialog={() => {}}
        categoryToDelete={null}
        setCategoryToDelete={() => {}}
        confirmDeleteCategory={() => {}}
        cancelDeleteCategory={() => {}}
      />

      <CategoryOrderModal
        isOpen={showCategoryOrderModal}
        onClose={() => setShowCategoryOrderModal(false)}
        praiseNight={selectedPage}
        songs={allSongs}
        onUpdate={handleUpdateCategoryOrder}
      />

      <PageCategoryOrderModal
        isOpen={showPageCategoryOrderModal}
        onClose={() => setShowPageCategoryOrderModal(false)}
        categories={pageCategories}
        onUpdate={handleUpdatePageCategoryOrder}
      />
    </div>
  );
}

export default AdminPagesWrapper;
