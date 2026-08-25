"use client";

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, FileText, Video, Camera, Mic, Music, Upload, Check, Monitor, Smartphone, LayoutGrid, FileSearch } from 'lucide-react'

interface CustomFilePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (file: File) => void
  primaryColor: string
  title?: string
  accept?: string
}

export function CustomFilePicker({
  isOpen,
  onClose,
  onSelect,
  primaryColor,
  title = "Choose File",
  accept = "*/*"
}: CustomFilePickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onSelect(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
  }

  const categories = [
    { id: 'photos', name: 'Photos & Videos', icon: ImageIcon, color: '#bf59cf', accept: 'image/*,video/*' },
    { id: 'docs', name: 'Documents', icon: FileText, color: '#5157ae', accept: '.pdf,.doc,.docx,.txt,.pdf' },
    { id: 'camera', name: 'Camera', icon: Camera, color: '#ff2e74', accept: 'image/*', capture: 'environment' },
    { id: 'audio', name: 'Audio', icon: Music, color: '#ff8f2c', accept: 'audio/*' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) onClose()
            }}
            className="relative w-full max-w-2xl bg-white rounded-t-[32px] shadow-2xl overflow-hidden z-10"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
               <div className="w-12 h-1.5 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="px-8 pt-4 pb-6 flex items-center justify-between border-b border-gray-50">
               <div>
                  <h2 className="text-[22px] font-black text-[#111b21] tracking-tight">{title}</h2>
                  <p className="text-[#667781] text-[13px] font-medium uppercase tracking-widest mt-0.5">Select from device</p>
               </div>
               <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-gray-400"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Content */}
            <div className="p-6 pb-12">
              {/* Drag & Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative h-40 rounded-[24px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group ${
                  isDragging 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:border-current shadow-inner hover:shadow-lg'
                }`}
                style={!isDragging ? ({ color: primaryColor } as any) : {}}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isDragging ? 'bg-emerald-500 text-white' : 'bg-white shadow-md text-current'
                }`}>
                  <Upload className={`w-7 h-7 ${isDragging ? 'animate-bounce' : 'group-hover:-translate-y-1 transition-transform'}`} />
                </div>
                <div className="text-center">
                   <p className="text-[16px] font-bold text-[#111b21]">Drop file here</p>
                   <p className="text-[13px] text-gray-500 font-medium">or click to browse</p>
                </div>
              </div>

              {/* Categories Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                 {categories.map((cat) => (
                   <button
                    key={cat.id}
                    onClick={(e) => {
                       e.stopPropagation();
                       if (fileInputRef.current) {
                          fileInputRef.current.accept = cat.accept;
                          fileInputRef.current.click();
                       }
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all text-left active:scale-95 group"
                   >
                     <div 
                       className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform"
                       style={{ backgroundColor: cat.color }}
                     >
                        <cat.icon className="w-5 h-5" />
                     </div>
                     <span className="font-bold text-[#111b21] text-[14px] leading-tight">{cat.name}</span>
                   </button>
                 ))}
              </div>
            </div>

            {/* Hidden Input */}
            <input 
              type="file" 
              hidden 
              ref={fileInputRef} 
              accept={accept} 
              onChange={handleFileChange} 
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
