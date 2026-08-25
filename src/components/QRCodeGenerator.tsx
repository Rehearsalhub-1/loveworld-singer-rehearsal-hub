"use client";

import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeGeneratorProps {
  value: string
  size?: number
  className?: string
}

export default function QRCodeGenerator({ value, size = 200, className = '' }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    const generateQRCode = async () => {
      try {
        setIsGenerating(true)
        setError(null)
        
        const canvas = canvasRef.current!
        
                const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, size, size)
        }

        
        // Generate QR code using the qrcode library
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })
        
      } catch (error) {
 console.error('QR Code generation error:', error)
        setError('Failed to generate QR code')
      } finally {
        setIsGenerating(false)
      }
    }

    generateQRCode()
  }, [value, size])

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`} style={{ width: size, height: size }}>
        <div className="text-center text-red-600 text-xs">
          <div>QR Error</div>
          <div className="text-xs opacity-75">Try refreshing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`${className} border border-gray-200 rounded-lg`}
      />
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      )}
    </div>
  )
}
