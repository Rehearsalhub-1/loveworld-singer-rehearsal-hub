import React from 'react';
import { Clock, Archive, Calendar, Music, ArrowLeft } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';

interface PraiseNightEmptyStateProps {
  categoryFilter: string | null;
  zoneColor: string;
}

export const PraiseNightEmptyState: React.FC<PraiseNightEmptyStateProps> = ({
  categoryFilter,
  zoneColor
}) => {
  return (
    <div
      className="h-screen flex flex-col safe-area-bottom overflow-y-auto"
      style={{
        background: `linear-gradient(135deg, ${zoneColor}15, #ffffff)`,
      }}
    >
      {/* Simple Header - Back button and title */}
      <div className="flex-shrink-0 w-full">
        <ScreenHeader
          title={categoryFilter === 'ongoing' ? 'Ongoing Sessions' :
            categoryFilter === 'archive' ? 'Archives' :
              categoryFilter === 'pre-rehearsal' ? 'Pre-Rehearsal' : 'Praise Night'}
          showBackButton={true}
          backPath="/pages/rehearsals"
          rightImageSrc="/logo.png"
        />
      </div>

      {/* Empty State Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm mx-auto">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
            {categoryFilter === 'ongoing' ? (
              <Clock className="w-10 h-10 text-purple-600" />
            ) : categoryFilter === 'archive' ? (
              <Archive className="w-10 h-10 text-purple-600" />
            ) : categoryFilter === 'pre-rehearsal' ? (
              <Calendar className="w-10 h-10 text-purple-600" />
            ) : (
              <Music className="w-10 h-10 text-purple-600" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {categoryFilter === 'ongoing' ? 'No Ongoing Programs' :
              categoryFilter === 'archive' ? 'No Archived Programs' :
                categoryFilter === 'pre-rehearsal' ? 'No Pre-Rehearsal Programs' :
                  'No Programs Available'}
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {categoryFilter === 'ongoing' ? 'Ongoing programs will appear here when they are active and ready for rehearsal.' :
              categoryFilter === 'archive' ? 'Archived programs will appear here when they are completed and moved to archive.' :
                categoryFilter === 'pre-rehearsal' ? 'Pre-rehearsal programs will appear here when they are scheduled for preparation.' :
                  'Create your first program to get started with your praise and worship program.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                window.history.back();
              }}
              className="inline-flex items-center px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-xl transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rehearsals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
