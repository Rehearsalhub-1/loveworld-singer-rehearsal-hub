"use client";

import React from 'react';
import { X, History, Edit, Trash2 } from 'lucide-react';

interface EditSongHistoryModalsProps {
  showHistoryForm: boolean;
  setShowHistoryForm: (show: boolean) => void;
  historyTitle: string;
  setHistoryTitle: (title: string) => void;
  historyType: string;
  setHistoryType: (type: any) => void;
  historyDescription: string;
  setHistoryDescription: (desc: string) => void;
  originalHistoryValues: any;
  setOriginalHistoryValues: (values: any) => void;
  handleSaveHistory: () => void;
  showHistoryList: boolean;
  setShowHistoryList: (show: boolean) => void;
  historyEntries: any[];
  song: any;
  handleDeleteHistory: (id: string) => void;
}

export const EditSongHistoryModals: React.FC<EditSongHistoryModalsProps> = ({
  showHistoryForm,
  setShowHistoryForm,
  historyTitle,
  setHistoryTitle,
  historyType,
  setHistoryType,
  historyDescription,
  setHistoryDescription,
  originalHistoryValues,
  setOriginalHistoryValues,
  handleSaveHistory,
  showHistoryList,
  setShowHistoryList,
  historyEntries,
  song,
  handleDeleteHistory
}) => {
  return (
    <>
      {/* Simple History Creation Modal */}
      {showHistoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {(window as any).currentHistoryEntryId ? 'Update History Entry' : `Save ${historyType.charAt(0).toUpperCase() + historyType.slice(1)} Version`}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {(window as any).currentHistoryEntryId ? 'Update the selected history entry' : `Create a history entry for the current ${historyType} content`}
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Version Title
                </label>
                <input
                  type="text"
                  value={historyTitle}
                  onChange={(e) => setHistoryTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Lyrics Version 1.2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <select
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="song-details">Song Details</option>
                  <option value="personnel">Personnel</option>
                  <option value="music-details">Music Details</option>
                  <option value="lyrics">Lyrics</option>
                  <option value="solfas">Solfas</option>
                  <option value="notation">Solfa Notation</option>
                  <option value="audio">Audio</option>
                  <option value="comments">Comments</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={historyDescription}
                  onChange={(e) => setHistoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="What changed in this version?"
                />
              </div>

              {(window as any).currentHistoryEntryId && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Historical Value
                    </label>
                    {/* For audio type, show audio player instead of textarea */}
                    {historyType === 'audio' ? (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        {originalHistoryValues.new_value ? (
                          <audio
                            controls
                            className="w-full"
                            src={originalHistoryValues.new_value}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No audio file in history</p>
                        )}
                      </div>
                    ) : (historyType === 'song-details' || historyType === 'personnel' || historyType === 'music-details') ? (
                      // For structured data types, show all fields in a formatted way
                      <div className="space-y-3">
                        {(() => {
                          try {
                            const valToParse = originalHistoryValues.new_value || originalHistoryValues.old_value || '{}';
                            const parsed = JSON.parse(valToParse);
                            if (typeof parsed !== 'object') return null;

                            const fields: { label: string; key: string }[] = [];

                            if (historyType === 'song-details') {
                              fields.push(
                                { label: 'Title', key: 'title' },
                                { label: 'Category', key: 'category' },
                                { label: 'Key', key: 'key' },
                                { label: 'Tempo', key: 'tempo' }
                              );
                            } else if (historyType === 'personnel') {
                              fields.push(
                                { label: 'Lead Singer', key: 'leadSinger' },
                                { label: 'Writer', key: 'writer' },
                                { label: 'Conductor', key: 'conductor' },
                                { label: 'Lead Keyboardist', key: 'leadKeyboardist' },
                                { label: 'Bass Guitarist', key: 'leadGuitarist' },
                                { label: 'Drummer', key: 'drummer' }
                              );
                            } else if (historyType === 'music-details') {
                              fields.push(
                                { label: 'Key', key: 'key' },
                                { label: 'Tempo', key: 'tempo' }
                              );
                            }

                            return fields.map(field => (
                              <div key={field.key}>
                                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                                <input
                                  type="text"
                                  value={parsed[field.key] || ''}
                                  onChange={(e) => {
                                    const updated = { ...parsed, [field.key]: e.target.value };
                                    setOriginalHistoryValues({
                                      ...originalHistoryValues,
                                      new_value: JSON.stringify(updated),
                                      old_value: JSON.stringify(updated)
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                />
                              </div>
                            ));
                          } catch {
                            return <p className="text-sm text-slate-400">Unable to parse history data</p>;
                          }
                        })()}
                      </div>
                    ) : (
                      <textarea
                        value={(() => {
                          if (!originalHistoryValues) {
                            console.warn('originalHistoryValues is not set for textarea');
                            return '';
                          }

                          try {
                            const valToParse = originalHistoryValues.new_value || originalHistoryValues.old_value || '{}';
                            const parsed = JSON.parse(valToParse);

                            const rawValue = typeof parsed === 'string' ? parsed : valToParse;
                            return rawValue
                              .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
                              .replace(/<br\s*\/?>/gi, '\n')
                              .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                              .replace(/<[^>]*>/g, '')
                              .trim();
                          } catch {
                            const rawValue = originalHistoryValues.new_value || originalHistoryValues.old_value || '';
                            return rawValue
                              .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
                              .replace(/<br\s*\/?>/gi, '\n')
                              .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                              .replace(/<[^>]*>/g, '')
                              .trim();
                          }
                        })()}
                        onChange={(e) => {
                          let convertedValue = e.target.value;
                          const paragraphs = convertedValue.split('\n\n');
                          convertedValue = paragraphs
                            .filter(p => p.trim() !== '')
                            .map(p => `<div>${p.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div>`)
                            .join('');
                          setOriginalHistoryValues({ ...originalHistoryValues, new_value: convertedValue, old_value: convertedValue });
                        }}
                        className="w-full px-3 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        rows={8}
                        placeholder="Historical value to edit"
                      />
                    )}
                  </div>

                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>
                    {(window as any).currentHistoryEntryId
                      ? 'History entry will be updated with your changes.'
                      : `Current ${historyType} content will be saved as a new version.`}
                  </strong>
                  <br />
                  You can {(window as any).currentHistoryEntryId ? 'update' : 'create'} multiple versions and switch between them later.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Reset the currentHistoryEntryId when closing the form
                    (window as any).currentHistoryEntryId = null;
                    setShowHistoryForm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveHistory();
                    // Reset the currentHistoryEntryId after saving
                    setTimeout(() => {
                      (window as any).currentHistoryEntryId = null;
                    }, 100); // Small delay to ensure save completes
                    setShowHistoryForm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History List Modal */}
      {showHistoryList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Song History - {song?.title}
                </h3>
                <button
                  onClick={() => setShowHistoryList(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {historyEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No history entries found for this song.</p>
                  <p className="text-sm">Create your first history entry using the "Add History" buttons.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyEntries.map((entry) => (
                    <div key={entry.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {entry.type}
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-medium text-slate-900 mb-1">{entry.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">{entry.description}</p>
                          <div className="text-xs text-slate-500">
                            Created by: {entry.created_by}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              // Edit this history entry
                              setHistoryTitle(entry.title);
                              setHistoryDescription(entry.description);
                              setHistoryType(entry.type);
                              // Store original values for editing
                              setOriginalHistoryValues({
                                old_value: entry.old_value || '',
                                new_value: entry.new_value || ''
                              });
                              setShowHistoryForm(true);
                              // Store the entry ID for updating
                              (window as any).currentHistoryEntryId = entry.id;
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Edit history entry"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(entry.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete history entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowHistoryList(false)}
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
