"use client";

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const FAQ_ITEMS = [
    {
        question: 'How do I join a rehearsal?',
        answer: 'Check the Rehearsals section for upcoming sessions and register through the calendar.',
    },
    {
        question: 'Where can I find song lyrics?',
        answer: 'Access song lyrics and audio resources in the AudioLabs section.',
    },
    {
        question: 'How do I get support?',
        answer: 'Use the Support section or contact your ministry coordinator for assistance.',
    },
]

export default function FAQSection() {
    const [openFAQ, setOpenFAQ] = useState<number | null>(null)

    const toggleFAQ = (index: number) => {
        setOpenFAQ(openFAQ === index ? null : index)
    }

    return (
        <div className="pb-6">
            <h2 className="text-lg font-outfit-semibold text-gray-800 mb-4">FAQ</h2>
            <div className="space-y-2">
                {FAQ_ITEMS.map((item, index) => (
                    <div key={index} className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl shadow-sm overflow-hidden ring-1 ring-black/5">
                        <button
                            onClick={() => toggleFAQ(index)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors active:bg-gray-100 focus:outline-none"
                        >
                            <h4 className="text-sm font-medium text-gray-800 pr-2">{item.question}</h4>
                            <div className="flex-shrink-0">
                                {openFAQ === index ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </div>
                        </button>
                        {openFAQ === index && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                                <p className="text-sm text-gray-600 leading-relaxed pt-3">{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
