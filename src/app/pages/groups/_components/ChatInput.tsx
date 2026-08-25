"use client";

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Paperclip, Smile, X, Image as ImageIcon, FileText, Loader2, Trash2 } from 'lucide-react'
import { useChatV2 } from '../_context/ChatContextV2'
import { CustomFilePicker } from './CustomFilePicker'

interface ChatInputProps {
  primaryColor: string
  replyingTo: { id: string; text: string; senderName: string } | null
  onCancelReply: () => void
  editingMessage?: { id: string; text: string } | null
  onEditComplete?: (newText: string) => void
  onCancelEdit?: () => void
}

export function ChatInput({
  primaryColor,
  replyingTo,
  onCancelReply,
  editingMessage,
  onEditComplete,
  onCancelEdit
}: ChatInputProps) {
  const { 
    sendMessage, 
    sendMediaMessage, 
    sendVoiceMessage, 
    setTypingStatus 
  } = useChatV2()

  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [captionText, setCaptionText] = useState('')
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(30).fill(2))
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const EMOJIS = ['😊', '😂', '❤️', '👍', '🙌', '🙏', '😮', '😢', '👏', '💯', '🔥', '✨', '😎', '😅', '😍', '👀', '🤝', '✅']

  // Pre-fill textarea when editing a message
  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.text)
      textareaRef.current?.focus()
    } else {
      setMessageText('')
    }
  }, [editingMessage?.id])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [messageText])

  const handleSend = async () => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isSending) return

    // If editing, call onEditComplete
    if (editingMessage && onEditComplete) {
      onEditComplete(trimmedMessage)
      setMessageText('')
      return
    }

    // Optimistically clear the input field
    const originalMessage = messageText
    setMessageText('')
    onCancelReply()
    
    setIsSending(true)
    try {
      const success = await sendMessage(trimmedMessage, replyingTo || undefined)
      if (!success) {
        // If it failed, restore the message so the user doesn't lose it
        setMessageText(originalMessage)
        console.error('[ChatInput] Send failed, restoring message.')
      }
    } catch (error) {
      console.error('[ChatInput] Error sending message:', error)
      setMessageText(originalMessage)
    } finally {
      setIsSending(false)
      // Ensure focus is kept/restored
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const lastTypingUpdateRef = useRef<number>(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTyping = () => {
    const now = Date.now()
    
    // Only send typing update every 3 seconds to avoid flooding Firestore
    if (now - lastTypingUpdateRef.current > 3000) {
      setTypingStatus('typing')
      lastTypingUpdateRef.current = now
    }

    // Always reset the timer to clear typing status
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(null)
      lastTypingUpdateRef.current = 0
    }, 4000)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large (max 10MB)')
      return
    }

    setPendingFile(file)
    setShowFilePicker(false)
  }

  const handleFinalSend = async () => {
    if (!pendingFile || isUploading) return

    setIsUploading(true)
    const success = await sendMediaMessage(pendingFile, captionText.trim() || undefined)
    setIsUploading(false)
    
    if (success) {
      setPendingFile(null)
      setCaptionText('')
    } else {
      alert('Failed to upload file')
    }
  }

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      
      // Visualizer logic
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevels = () => {
        if (!isRecording) return
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length
        const level = Math.max(2, (avg / 255) * 20)
        setAudioLevels(prev => [...prev.slice(1), level])
        requestAnimationFrame(updateLevels)
      }

      updateLevels() // Start the visualizer

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' })
        
        if (chunks.length > 0 && !isRecording) { // If not recording means we didn't cancel
           await sendVoiceMessage(audioFile, recordingDuration)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      setIsRecording(true)
      setTypingStatus('recording_voice')
      setRecordingDuration(0)
      recorder.start()
      recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000)
    } catch (err) {
      alert('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setTypingStatus(null)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      setIsRecording(false)
      setTypingStatus(null)
      mediaRecorder.stop()
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  return (
    <div className="bg-white border-t border-slate-200/80 px-3 md:px-4 py-2.5 flex-shrink-0 min-w-0">
      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="p-2.5 flex justify-between items-start bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="min-w-0 flex-1 border-l-[3px] pl-3" style={{ borderColor: primaryColor }}>
                <div className="text-[12px] font-bold mb-0.5" style={{ color: primaryColor }}>{replyingTo.senderName}</div>
                <div className="text-[12px] text-slate-500 truncate">{replyingTo.text}</div>
              </div>
              <button onClick={onCancelReply} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 max-w-6xl mx-auto relative min-w-0">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-9 h-9 flex items-center justify-center transition-colors rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex-shrink-0"
          style={showEmojiPicker ? { color: primaryColor } : {}}
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setShowFilePicker(true)}
          className="w-9 h-9 flex items-center justify-center transition-colors rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex-shrink-0"
          title="Attach"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <CustomFilePicker 
          isOpen={showFilePicker}
          onClose={() => setShowFilePicker(false)}
          onSelect={(file) => {
            if (file.size > 10 * 1024 * 1024) {
              alert('File too large (max 10MB)')
              return
            }
            setPendingFile(file)
            setShowFilePicker(false)
          }}
          primaryColor={primaryColor}
          title="Attach File"
        />

        {/* Text Input Area */}
        <div className="flex-1 relative flex items-center bg-slate-100/80 hover:bg-slate-100 focus-within:bg-white border border-transparent focus-within:border-slate-300 rounded-2xl px-3 py-1 transition-all min-h-[42px] min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={messageText}
            onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Recording…' : 'Type a message…'}
            className="flex-1 bg-transparent py-1.5 px-1 text-[14px] focus:outline-none resize-none max-h-[120px] scrollbar-none font-medium text-slate-800 placeholder-slate-400 min-w-0"
            disabled={isRecording || isUploading}
          />

          {isUploading && (
            <div className="pr-2">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
            </div>
          )}
        </div>

        {/* Send / Mic Button */}
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-opacity hover:opacity-90 active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          {messageText.trim() ? (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleSend}
              disabled={isSending || isUploading}
              className="w-full h-full text-white flex items-center justify-center rounded-xl"
            >
              <Send className="w-4 h-4 fill-white" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={cancelRecording}
              className={`w-full h-full text-white flex items-center justify-center rounded-xl ${
                isRecording ? 'bg-red-500 animate-pulse' : ''
              }`}
            >
              <Mic className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* File Preview Modal - High Fidelity Overhaul */}
      <AnimatePresence>
        {pendingFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-[#0b141a]/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            {/* Header Actions */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
              <button 
                onClick={() => { setPendingFile(null); setCaptionText(''); }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white shadow-lg backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex flex-col items-center">
                 <p className="text-white font-bold text-sm uppercase tracking-widest">Preview Attachment</p>
                 <p className="text-white/50 text-[11px] font-medium mt-1">{pendingFile.name}</p>
              </div>
              <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Preview Content */}
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center p-4 md:p-12 overflow-hidden">
               {pendingFile.type.startsWith('image/') ? (
                 <motion.img 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   src={URL.createObjectURL(pendingFile)}
                   className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-white/10"
                 />
               ) : (
                 <div className="flex flex-col items-center gap-6 p-12 bg-white/5 rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="w-24 h-24 rounded-[28px] bg-white/10 flex items-center justify-center shadow-inner">
                       <FileText className="w-12 h-12 text-white" />
                    </div>
                    <div className="text-center">
                       <p className="text-xl font-bold text-white mb-1">{pendingFile.name}</p>
                       <p className="text-sm text-white/40 font-medium">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB • {pendingFile.type.split('/')[1]?.toUpperCase() || 'File'}</p>
                    </div>
                 </div>
               )}
            </div>

            {/* Footer with Caption Input */}
            <div className="w-full max-w-3xl px-6 pb-12">
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="bg-[#202c33] rounded-[28px] p-2 flex items-end gap-3 shadow-2xl border border-white/5"
               >
                  <textarea
                    autoFocus
                    rows={1}
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Add a caption..."
                    className="flex-1 bg-transparent py-4 px-4 text-[16px] text-[#e9edef] focus:outline-none resize-none max-h-[150px] scrollbar-none placeholder:text-[#8696a0]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFinalSend();
                      }
                    }}
                  />
                  <button 
                    onClick={handleFinalSend}
                    disabled={isUploading}
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 mb-1 mr-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Send className="w-6 h-6 text-white ml-1" />
                    )}
                  </button>
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removed Hidden Inputs - Using CustomFilePicker */}

      {/* Emoji Palette Overlay (Simple placeholder for now) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 md:left-auto md:right-auto md:w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 grid grid-cols-6 gap-2"
          >
             {EMOJIS.map(emoji => (
               <button 
                key={emoji} 
                className="text-2xl hover:bg-gray-50 rounded-lg p-2 transition-all active:scale-90"
                onClick={() => { setMessageText(p => p + emoji); setShowEmojiPicker(false); textareaRef.current?.focus(); }}
               >
                 {emoji}
               </button>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-fit px-4 md:px-6 py-3 bg-red-500 text-white rounded-full shadow-xl flex items-center gap-3 md:gap-4 z-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              <div className="flex items-end gap-[2px] h-6 px-1">
                {audioLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: level }}
                    className="w-[3px] bg-white/80 rounded-full"
                  />
                ))}
              </div>
              <span className="font-bold tabular-nums min-w-[40px]">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <button onClick={cancelRecording} className="flex items-center gap-1.5 text-sm font-bold hover:bg-white/10 px-2 py-1 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
