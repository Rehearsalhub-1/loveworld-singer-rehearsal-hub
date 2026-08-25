import React from 'react';
import { Users, Minimize2, Maximize2 } from 'lucide-react';
import CommentAudioPlayer from '../CommentAudioPlayer';

interface Comment {
  id: string;
  text: string;
  audioUrl?: string;
  author: string;
  date: string | Date;
}

interface SongCommentsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  title?: string;
  comments?: Comment[];
  zoneColor?: string;
  commentLabel?: string;
  showFloatingButtonOnly?: boolean;
  darkenColor?: (color: string, amount: number) => string;
}

export const SongComments: React.FC<SongCommentsProps> = ({
  isFullscreen,
  onToggleFullscreen,
  title,
  comments,
  zoneColor = '#9333EA',
  commentLabel = 'Coordinator',
  showFloatingButtonOnly = false,
  darkenColor,
}) => {
  const formatCommentText = (text: string) => {
    if (!text) return null;

    // Pattern to match: **bold** or *bold*
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, i) => {
      const isAsteriskMatch = (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('*') && part.endsWith('*'));

      if (isAsteriskMatch) {
        let content = part;
        if (part.startsWith('**')) content = part.slice(2, -2);
        else if (part.startsWith('*')) content = part.slice(1, -1);

        return (
          <span key={i} className="font-bold text-[1.1em] text-black leading-tight inline-block" dangerouslySetInnerHTML={{ __html: content }} />
        );
      }
      
      // Render the segment as HTML to handle <br> and &nbsp;
      return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  const renderCommentList = (isFull: boolean) => {
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className={`${isFull ? 'w-16 h-16' : 'w-12 h-12'} text-gray-300 mx-auto mb-4`} />
          <p className={`text-gray-500 ${isFull ? 'text-lg' : 'text-sm'}`}>No comments available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-gray-100 pb-6 last:border-b-0">
            <div className={`text-black leading-relaxed mb-4 ${isFull ? 'text-base' : 'text-sm'}`}>
              {formatCommentText(comment.text)}
            </div>

            {comment.audioUrl && (
              <div className="mb-4 max-w-md">
                <CommentAudioPlayer
                  src={comment.audioUrl}
                  accentColor={zoneColor}
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-purple-600">
                {comment.author.toLowerCase().includes(commentLabel.toLowerCase()) 
                  ? comment.author 
                  : `${commentLabel}: ${comment.author}`}
              </span>
              <span>•</span>
              <span>
                {new Date(comment.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (showFloatingButtonOnly) {
    return (
      <button
        onClick={onToggleFullscreen}
        className="fixed bottom-28 right-3 sm:right-4 w-10 h-10 sm:w-11 sm:h-11 text-white rounded-full shadow-lg transition-all duration-200 z-[110] hover:scale-105 flex items-center justify-center"
        style={{
          backgroundColor: zoneColor
        }}
        onMouseEnter={(e) => {
          if (darkenColor) {
            e.currentTarget.style.backgroundColor = darkenColor(zoneColor, 10);
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = zoneColor;
        }}
        title="Fullscreen Comments"
      >
        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white bg-music-doodle z-[100] flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Minimize2 className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-black">{title}</h2>
              <p className="text-sm text-gray-500">Comments</p>
            </div>
          </div>
        </div>

        {/* Fullscreen Comments Content */}
        <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch p-6 h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto">
            {renderCommentList(true)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      {renderCommentList(false)}
    </div>
  );
};

export default SongComments;
