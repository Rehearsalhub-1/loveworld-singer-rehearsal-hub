"use client";

import { ReactNode, useState } from 'react'

interface TooltipProps {
  children: ReactNode
  text: string
  className?: string
}

import { memo } from 'react'

const Tooltip = memo(function Tooltip({ children, text, className = '' }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(true)}
      onTouchEnd={() => setTimeout(() => setShow(false), 2000)}
    >
      {children}
      
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none px-2">
          <div className="bg-gray-900 text-white text-[10px] leading-tight px-2.5 py-1.5 rounded-lg shadow-lg max-w-[200px] text-center">
            {text}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default Tooltip
