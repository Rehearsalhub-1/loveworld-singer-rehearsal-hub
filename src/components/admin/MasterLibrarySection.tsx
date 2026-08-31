"use client";

import { MasterLibraryService, useMasterLibrary, MasterSong, MasterProgram } from '@/lib/master-library';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { MasterSongDetailSheet } from './MasterSongDetailSheet';
import { MasterEditSongModal } from './MasterEditSongModal';


// Modularized Components
import { MasterLibraryHeader } from './master-library/MasterLibraryHeader';
import { MasterLibraryFilters } from './master-library/MasterLibraryFilters';
import { MasterLibrarySongTable } from './master-library/MasterLibrarySongTable';
import { MasterLibraryModals } from './master-library/MasterLibraryModals';

interface MasterLibrarySectionProps {
  isHQAdmin?: boolean;
}

export default function MasterLibrarySection({ isHQAdmin = false }: MasterLibrarySectionProps) {
  const ml = useMasterLibrary(isHQAdmin);

  if (ml.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <CustomLoader message="Loading Master Library..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Header & Stats */}
        <MasterLibraryHeader
          stats={ml.stats}
          canManage={ml.canManage}
          setShowCreateModal={ml.setShowCreateModal}
          setShowCreateProgramModal={ml.setShowCreateProgramModal}
          setShowOrderProgramsModal={ml.setShowOrderProgramsModal}
        />

        {/* Filters */}
        <MasterLibraryFilters
          searchTerm={ml.searchTerm}
          setSearchTerm={ml.setSearchTerm}
          sortOrder={ml.sortOrder}
          setSortOrder={ml.setSortOrder}
          selectedLeadSinger={ml.selectedLeadSinger}
          setSelectedLeadSinger={ml.setSelectedLeadSinger}
          isLeadSingerDropdownOpen={ml.isLeadSingerDropdownOpen}
          setIsLeadSingerDropdownOpen={ml.setIsLeadSingerDropdownOpen}
          leadSingers={ml.leadSingers}
          selectedProgramId={ml.selectedProgramId}
          setSelectedProgramId={ml.setSelectedProgramId}
          isProgramsDropdownOpen={ml.isProgramsDropdownOpen}
          setIsProgramsDropdownOpen={ml.setIsProgramsDropdownOpen}
          programs={ml.programs}
          canManage={ml.canManage}
          setShowCreateProgramModal={ml.setShowCreateProgramModal}
          setShowOrderProgramsModal={ml.setShowOrderProgramsModal}
          handleDeleteProgram={ml.handleDeleteProgram}
          activeTab={ml.activeTab}
          setActiveTab={ml.setActiveTab}
          stats={ml.stats}
          selectedSongIds={ml.selectedSongIds}
          onBulkHide={ml.handleBulkHide}
          onBulkMoveToHistory={ml.handleBulkMoveToHistory}
          onClearSelection={() => ml.setSelectedSongIds(new Set())}
        />

        {/* Song Table */}
        <MasterLibrarySongTable
          songs={ml.paginatedSongs}
          canManage={ml.canManage}
          selectedSongIds={ml.selectedSongIds}
          setSelectedSongIds={ml.setSelectedSongIds}
          onSongClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowDetailsModal(true);
          }}
          onEditClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowEditModal(true);
          }}
          onDeleteClick={ml.handleDelete}
          onImportClick={(song) => {
            ml.setSelectedSong(song);
            ml.setShowImportModal(true);
          }}
          onDuplicateClick={ml.duplicateSong}
          onToggleHide={ml.handleToggleHideSong}
          onToggleHistory={ml.handleToggleHistorySong}
          currentPage={ml.currentPage}
          totalPages={ml.totalPages}
          setCurrentPage={ml.setCurrentPage}
          programs={ml.programs}
          handleToggleSongInProgram={ml.handleToggleSongInProgram}
        />

        {/* Modals Orchestrator */}
        <MasterLibraryModals
          showImportModal={ml.showImportModal}
          setShowImportModal={ml.setShowImportModal}
          selectedSong={ml.selectedSong}
          zonePraiseNights={ml.zonePraiseNights}
          selectedPraiseNight={ml.selectedPraiseNight}
          setSelectedPraiseNight={ml.setSelectedPraiseNight}
          handleImport={ml.handleImport}
          importing={ml.importing}
          showCreateProgramModal={ml.showCreateProgramModal}
          setShowCreateProgramModal={ml.setShowCreateProgramModal}
          handleCreateProgram={ml.handleCreateProgram}
          showOrderProgramsModal={ml.showOrderProgramsModal}
          setShowOrderProgramsModal={ml.setShowOrderProgramsModal}
          programs={ml.programs}
          handleUpdateProgramOrder={ml.handleUpdateProgramOrder}
          handleDeleteProgram={ml.handleDeleteProgram}
        />

        {/* Separate Components (Existing) */}
        {ml.selectedSong && (
          <>
            <MasterSongDetailSheet
              isOpen={ml.showDetailsModal}
              onClose={() => {
                ml.setShowDetailsModal(false);
                ml.setSelectedSong(null);
              }}
              song={ml.selectedSong}
            />
            <MasterEditSongModal
              isOpen={ml.showEditModal}
              onClose={() => {
                ml.setShowEditModal(false);
                ml.setSelectedSong(null);
              }}
              song={ml.selectedSong}
              onSongUpdated={(updatedSong) => {
                ml.onSongUpdated(updatedSong);
                ml.setShowEditModal(false);
                ml.setSelectedSong(null);
              }}
              mode="edit"
            />
          </>
        )}

        {ml.showCreateModal && (
          <MasterEditSongModal
            isOpen={ml.showCreateModal}
            onClose={() => ml.setShowCreateModal(false)}
            onSongCreated={(newSong) => {
              ml.onSongCreated(newSong);
              ml.setShowCreateModal(false);
            }}
            mode="create"
          />
        )}

        {/* Toast Notification */}
        
      </div>
    </div>
  );
}
