"use client";

import { useState, useEffect } from 'react'

interface HeroCarouselProps {
    themeColor?: string
}

const carouselImages = [
    '/images/home.jpg',
    '/images/DSC_6155_scaled.jpg',
    '/images/DSC_6303_scaled.jpg',
    '/images/DSC_6446_scaled.jpg',
    '/images/DSC_6506_scaled.jpg',
    '/images/DSC_6516_scaled.jpg',
    '/images/DSC_6636_1_scaled.jpg',
    '/images/DSC_6638_scaled.jpg',
    '/images/DSC_6644_scaled.jpg',
    '/images/DSC_6658_1_scaled.jpg',
    '/images/DSC_6676_scaled.jpg'
]

export default function HeroCarousel({ themeColor }: HeroCarouselProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    // Preload first image for instant display
    useEffect(() => {
        const img = new Image()
        img.src = carouselImages[0]
    }, [])

    // Auto-slide carousel every 2 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
            )
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="py-6 pt-20">
            <div className="relative h-[30vh] rounded-3xl overflow-hidden shadow-lg">
                <div className="relative w-full h-full">
                    {carouselImages.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`LoveWorld Singers Rehearsal Hub ${index + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                                }`}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            </div>
        </div>
    )
}
