"use client";

"use client";

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

interface PageSearchProps {
  data: any[];
  onFilter: (filteredData: any[]) => void;
  searchFields: string[];
  placeholder?: string;
  className?: string;
}

export default function PageSearch({ 
  data, 
  onFilter, 
  searchFields, 
  placeholder = "Search...",
  className = ""
}: PageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchFields]);

    React.useEffect(() => {
    onFilter(filteredData);
  }, [filteredData, onFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Helper function to get nested object values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
      
      {searchQuery && (
        <div className="mt-2 text-xs text-gray-500">
          {filteredData.length} of {data.length} items match "{searchQuery}"
        </div>
      )}
    </div>
  );
}