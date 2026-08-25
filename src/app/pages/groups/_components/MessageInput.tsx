"use client";

import { useState, useRef, useEffect } from 'react'
import { useChat } from '../_context/ChatContext'
import { useZone } from '@/hooks/useZone'
import { Send, Image, Paperclip, Smile, X } from 'lucide-react'

export default function MessageInput() {
  const { sendMessage, selectedChat, replyToMessage, setReplyToMessage, editingMessage, setEditingMessage, editMessage } = useChat()
  const { currentZone } = useZone()
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingMessage?.text) {
      setText(editingMessage.text)
    } else if (!editingMessage) {
      setText('')
    }
  }, [editingMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedChat || isLoading) return
    if (editingMessage) {
      if (!text.trim()) return
      setIsLoading(true)
      try {
        await editMessage(editingMessage.id, text.trim())
      } catch (error) {
 console.error('Error editing message:', error)
      } finally {
        setIsLoading(false)
        setEditingMessage(null)
        setText('')
      }
      return
    }

    if (!text.trim()) return

    setIsLoading(true)
    
    try {
      await sendMessage({ text: text.trim() })
      setText('')
    } catch (error) {
 console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChat) return

    setIsLoading(true)
    
    try {
      // Upload to Cloudinary
      const { uploadImageToCloudinary } = await import('@/lib/cloudinary-storage')
      const uploadResult = await uploadImageToCloudinary(file)
      
      if (!uploadResult) {
        throw new Error('Failed to upload image')
      }
      
      await sendMessage({ image: uploadResult })
    } catch (error) {
 console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsLoading(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChat) return

    setIsLoading(true)
    
    try {
      // Upload to Cloudinary
      const { uploadToCloudinary } = await import('@/lib/cloudinary-storage')
      const uploadResult = await uploadToCloudinary(file)
      
      if (!uploadResult) {
        throw new Error('Failed to upload file')
      }
      
      await sendMessage({ 
        fileUrl: uploadResult, 
        fileName: file.name 
      })
    } catch (error) {
 console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (!selectedChat) return null

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-gray-200">
      {(replyToMessage || editingMessage) && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-gray-100 flex items-start justify-between text-sm">
          <div>
            <p className="font-semibold text-gray-800">
              {editingMessage ? 'Editing message' : `Replying to ${replyToMessage?.senderName || 'message'}`}
            </p>
            {!editingMessage && replyToMessage?.text && (
              <p className="text-gray-600 text-sm line-clamp-2">{replyToMessage.text}</p>
            )}
          </div>
          <button
            onClick={() => {
              if (editingMessage) {
                setEditingMessage(null)
                setText('')
              } else {
                setReplyToMessage(null)
              }
            }}
            className="ml-3 text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
        {/* Attachment buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Image upload */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 touch-target"
          >
            <Image className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* File upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 touch-target"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${selectedChat.type === 'group' ? selectedChat.name : 'user'}...`}
            disabled={isLoading}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 max-h-32 min-h-[44px] text-base"
            style={{ 
              ...(currentZone?.themeColor && {
                '--tw-ring-color': currentZone.themeColor
              } as any)
            }}
            rows={1}
          />
          
          {/* Emoji button - Hide on small mobile */}
          <button
            type="button"
            className="hidden xs:block absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="p-2.5 sm:p-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg touch-target"
          style={{ 
            backgroundColor: currentZone?.themeColor || '#10b981'
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
      </form>
    </div>
  )
}
