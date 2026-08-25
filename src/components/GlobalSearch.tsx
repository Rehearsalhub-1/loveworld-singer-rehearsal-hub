"use client";

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Music, Calendar, FolderOpen, ArrowRight, X } from 'lucide-react';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { useRouter } from 'next/navigation';

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
}

export default function GlobalSearch({ 
  placeholder = "Search songs, lyrics, solfas, pages, categories...", 
  className = "" 
}: GlobalSearchProps) {
  const { searchQuery, setSearchQuery, searchResults, hasResults } = useGlobalSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !hasResults) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && searchResults[selectedIndex]) {
            handleResultClick(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          searchRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasResults, searchResults, selectedIndex]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(-1);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    searchRef.current?.blur();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    searchRef.current?.focus();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'song': return <Music className="w-4 h-4 text-purple-600" />;
      case 'page': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'category': return <FolderOpen className="w-4 h-4 text-green-600" />;
      default: return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  const getResultBadge = (result: SearchResult) => {
    if (result.type === 'song' && result.status) {
      return (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          result.status === 'heard' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {result.status}
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {hasResults ? (
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    index === selectedIndex ? 'bg-purple-50 border-purple-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </h4>
                        {getResultBadge(result)}
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-purple-600 mb-1">
                          {result.subtitle}
                        </p>
                      )}
                      {result.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length > 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No results found for "{searchQuery}"</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for songs, pages, or categories
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
