"use client";

import React from 'react';
import { History, Mic, Trash2 } from 'lucide-react';
import BasicTextEditor from '../BasicTextEditor';
import CommentAudioPlayer from '../CommentAudioPlayer';

interface EditSongCommentsProps {
  coordinatorComment: string;
  setCoordinatorComment: (value: string) => void;
  coordinatorAudioUrl: string;
  setCoordinatorAudioUrl: (value: string) => void;
  commentLabel: string;
  handleCreateHistory: (type: any) => void;
  handleOpenMediaSelectorForPart: (part: string) => void;
  historyButtonClasses: string;
}

export const EditSongComments: React.FC<EditSongCommentsProps> = ({
  coordinatorComment,
  setCoordinatorComment,
  coordinatorAudioUrl,
  setCoordinatorAudioUrl,
  commentLabel,
  handleCreateHistory,
  handleOpenMediaSelectorForPart,
  historyButtonClasses
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            {commentLabel} Comment
          </h4>
          <button
            onClick={() => handleCreateHistory('comments')}
            className={historyButtonClasses}
          >
            <History className="w-3 h-3" />
            Save Version
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
          Basic rich text - Bold and Italic supported
        </div>
        <BasicTextEditor
          id="coordinator-comment-editor"
          value={coordinatorComment}
          onChange={(value) => setCoordinatorComment(value)}
          placeholder="Add your notes or instructions for the team here..."
          className="w-full"
        />

        {/* Audio Comment Selection */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Audio Comment / Voice Note
          </label>

          {coordinatorAudioUrl ? (
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-xs font-medium text-purple-700 truncate">
                    {coordinatorAudioUrl.split('/').pop()?.split('?')[0] || 'Voice Note'}
                  </span>
                </div>
                <CommentAudioPlayer
                  src={coordinatorAudioUrl}
                  accentColor="#8B5CF6"
                />
              </div>
              <button
                onClick={() => setCoordinatorAudioUrl('')}
                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                title="Remove Audio Comment"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleOpenMediaSelectorForPart('comment-audio')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors w-full justify-center"
            >
              <Mic size={16} className="text-purple-500" />
              Add Audio Comment / Voice Note
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
