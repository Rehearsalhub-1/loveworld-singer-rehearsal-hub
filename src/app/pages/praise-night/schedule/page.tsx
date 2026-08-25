"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, ChevronRight, Heart, Music, Sparkles, User, FileText, Loader2 } from 'lucide-react';
import { useSchedule } from '@/hooks/useSchedule';

// Map icon names to components
const ICON_MAP: Record<string, any> = {
    Music, Sparkles, Heart, User, Calendar, FileText
};

export default function SongSchedulePage() {
    const router = useRouter();
    const { categories, songs, program, allPrograms, isLoading, loadSongsForCategory, loadProgram } = useSchedule();

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Filter out categories that aren't "Daily Schedule" for the main list
    // The "Daily Schedule" (if it exists) should be treated specially or just as another category?
    // The previous design had it as the last item. We'll stick to the order from the DB.

    // Auto-load songs when entering a category
    useEffect(() => {
        if (activeCategory) {
            loadSongsForCategory(activeCategory);
        }
    }, [activeCategory, loadSongsForCategory]);

    const activeCatData = categories.find(c => c.id === activeCategory);

    const isDailySchedule = useMemo(() => {
        if (!activeCategory || !categories.length) return false;
        let current = categories.find(c => c.id === activeCategory);
        while (current) {
            if (current.label.toLowerCase().includes('daily')) return true;
            if (!current.parentId) break;
            current = categories.find(c => c.id === current!.parentId);
        }
        return false;
    }, [activeCategory, categories]);

    const handleCategoryClick = (id: string) => {
        setActiveCategory(id);
    };

    const handleDateSelect = (date: string, categoryId?: string) => {
        setSelectedDate(date);
        loadProgram(date, categoryId);
    };

    const handleBack = () => {
        if (selectedDate) {
            setSelectedDate(null); // Just close the program/sub-list view
        } else if (activeCatData?.parentId) {
            setActiveCategory(activeCatData.parentId); // Go up one folder
        } else {
            setActiveCategory(null); // Go back to the main root list
        }
    };

    const categorySongs = activeCategory ? ((songs as any)[activeCategory] || (Array.isArray(songs) ? songs : [])) : [];

    if (isLoading && categories.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white/50 backdrop-blur-xl">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 flex flex-col">
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Header */}
            <ScreenHeader
                title={activeCategory ? (isDailySchedule && selectedDate ? (program?.program || "Daily Schedule") : (activeCatData?.label || "Details")) : "Schedule"}
                showBackButton={true}
                backPath={activeCategory ? undefined : "/pages/praise-night"}
                onBackClick={activeCategory ? handleBack : undefined}
                rightImageSrc="/logo.png"
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide h-[calc(100vh-80px)] relative">
                {/* Ambient glow blobs */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-100/50 to-transparent pointer-events-none -translate-y-1/2 opacity-70 blur-3xl z-0" />

                <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 content-bottom-safe relative z-10">

                    {!activeCategory ? (
                        <div className="flex flex-col gap-3">
                            {categories.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-purple-400 font-medium text-sm">No schedule categories found.</p>
                                </div>
                            ) : (
                                categories.filter(c => !c.parentId).map((cat) => {
                                    const Icon = ICON_MAP[cat.icon || 'Music'] || Music;
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            role="button"
                                            tabIndex={0}
                                            className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm shadow-purple-900/5 border border-purple-100/50 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 active:scale-[0.98] group w-full cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className={`w-12 h-12 ${(cat.color || 'bg-purple-500').replace('bg-', 'bg-gradient-to-br from-white to-')} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm border border-white/50 ring-1 ring-black/5`}>
                                                        <Icon className={`w-5 h-5 ${cat.iconColor || 'text-purple-600'}`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 text-[15px] group-hover:text-purple-700 leading-tight transition-colors">
                                                            {cat.label}
                                                        </h3>
                                                        <p className="text-xs text-purple-600/60 mt-1 font-medium leading-tight">
                                                            {cat.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 bg-purple-50/80 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors shadow-inner">
                                                    <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Back Button (Desktop) */}
                            <div className="hidden sm:flex items-center justify-between mb-4">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-sm font-bold text-purple-600 bg-white/80 backdrop-blur-sm px-6 py-2.5 rounded-full hover:bg-purple-50 transition-all active:scale-95 shadow-sm border border-purple-100/50"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {selectedDate ? "Back to Lists" : "Back to Categories"}
                                </button>
                            </div>

                            <div className="flex flex-col gap-6">
                                {selectedDate && program ? (
                                    <>
                                        {/* Header for selected sub-category */}
                                        {isDailySchedule ? (
                                            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-purple-900/5 border border-purple-100/60 ring-1 ring-white/50">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <CardInfo label="Program" value={program.program || ''} />
                                                    <CardInfo label="Date" value={(program.date ? new Date(program.date).toLocaleDateString() : '')} />
                                                    <CardInfo label="Time" value={program.time} />
                                                    <CardInfo label="Daily Target" value={program.dailyTarget} accent />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-purple-900/5 border border-purple-100/60 ring-1 ring-white/50">
                                                <CardInfo label="List Name" value={program.date || ''} accent />
                                            </div>
                                        )}

                                        {/* Spreadsheet for selected sub-category */}
                                        <div className="w-full">
                                            {isLoading ? (
                                                <div className="py-32 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-purple-200">
                                                    <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500 mb-4" />
                                                    <p className="text-purple-500 text-sm font-bold tracking-wide">Fetching glowing details...</p>
                                                </div>
                                            ) : program.spreadsheetData ? (
                                                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-200/60 overflow-hidden min-h-[40vh] ring-1 ring-white/50">
                                                    <SpreadsheetViewer data={program.spreadsheetData} />
                                                </div>
                                            ) : (
                                                <div className="py-24 text-center bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-purple-200 shadow-inner">
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-purple-100 flex items-center justify-center mx-auto mb-4 rotate-3">
                                                        <FileText className="w-8 h-8 text-purple-300" />
                                                    </div>
                                                    <p className="text-purple-500 font-medium text-sm">No items in this list yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Main Category Spreadsheet */}
                                        {!isDailySchedule && activeCatData?.spreadsheetData && (
                                            <div className="mb-8 animate-in fade-in slide-in-from-bottom-2">
                                                <h3 className="text-[11px] font-black text-purple-400 uppercase tracking-widest px-2 mb-3 drop-shadow-sm">Main List</h3>
                                                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-200/60 overflow-hidden min-h-[30vh] ring-1 ring-white/50">
                                                    <SpreadsheetViewer data={activeCatData.spreadsheetData} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Nested Sub-categories */}
                                        {categories.filter(c => c.parentId === activeCategory).length > 0 && (
                                            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                                                <h3 className="text-[11px] font-black text-purple-400 uppercase tracking-widest px-2 mb-3 drop-shadow-sm">Folders</h3>
                                                <div className="flex flex-col gap-3">
                                                    {categories.filter(c => c.parentId === activeCategory).map((cat) => {
                                                        const Icon = ICON_MAP[cat.icon || 'Music'] || Music;
                                                        return (
                                                            <div
                                                                key={cat.id}
                                                                onClick={() => handleCategoryClick(cat.id)}
                                                                role="button"
                                                                tabIndex={0}
                                                                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm shadow-purple-900/5 border border-purple-100/50 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 active:scale-[0.98] group w-full cursor-pointer"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4 text-left">
                                                                        <div className={`w-12 h-12 ${(cat.color || 'bg-purple-500').replace('bg-', 'bg-gradient-to-br from-white to-')} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm border border-white/50 ring-1 ring-black/5`}>
                                                                            <Icon className={`w-5 h-5 ${cat.iconColor || 'text-purple-600'}`} />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <h3 className="font-bold text-slate-900 text-[15px] group-hover:text-purple-700 leading-tight transition-colors">
                                                                                {cat.label}
                                                                            </h3>
                                                                            <p className="text-xs text-purple-600/60 mt-1 font-medium leading-tight">
                                                                                {cat.description}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-8 h-8 bg-purple-50/80 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors shadow-inner">
                                                                        <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors group-hover:translate-x-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Only show "Additional Lists" section if there are actually lists, OR if there are no subfolders (so they don't see a blank page) */}
                                        {(allPrograms.filter(p => isDailySchedule ? (!p.categoryId || p.categoryId === activeCatData?.id) : p.categoryId === activeCategory).length > 0 || categories.filter(c => c.parentId === activeCategory).length === 0) && (
                                            <>
                                                <h3 className={`text-[11px] font-black text-purple-400 uppercase tracking-widest px-2 drop-shadow-sm ${(!isDailySchedule && activeCatData?.spreadsheetData) || categories.filter(c => c.parentId === activeCategory).length > 0 ? 'mt-8' : ''}`}>
                                                    {isDailySchedule ? 'Select a Date' : 'Additional Lists'}
                                                </h3>

                                                <div className="flex flex-col gap-3 mt-3">
                                                    {allPrograms.filter(p => isDailySchedule ? (!p.categoryId || p.categoryId === activeCatData?.id) : p.categoryId === activeCategory).length === 0 ? (
                                                        <div className="py-12 text-center bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-purple-200 shadow-inner">
                                                            <div className="w-16 h-16 bg-white shadow-sm border border-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                                                                {isDailySchedule ? <Calendar className="w-8 h-8 text-purple-300" /> : <FileText className="w-8 h-8 text-purple-300" />}
                                                            </div>
                                                            <p className="text-purple-500 font-medium text-sm">
                                                                {isDailySchedule ? 'No scheduled dates found.' : 'No additional lists found.'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        allPrograms.filter(p => isDailySchedule ? (!p.categoryId || p.categoryId === activeCatData?.id) : p.categoryId === activeCategory).map((p) => (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => handleDateSelect(p.date || p.id, isDailySchedule ? p.categoryId : activeCategory!)}
                                                                className="flex items-center justify-between p-5 bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100/60 hover:border-fuchsia-300 hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all cursor-pointer group active:scale-[0.98] shadow-sm animate-in fade-in zoom-in-95 ring-1 ring-white/50"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100/50 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                                                                        {isDailySchedule ? <Calendar className="w-5 h-5 text-fuchsia-500" /> : <FileText className="w-5 h-5 text-fuchsia-500" />}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-900 text-[17px] group-hover:text-fuchsia-700 transition-colors leading-tight drop-shadow-sm">
                                                                            {isDailySchedule ? (p.program || 'Song Schedule') : p.date}
                                                                        </h4>
                                                                        {isDailySchedule && (
                                                                            <p className="text-[13px] text-purple-600/70 font-medium mt-1">
                                                                                {p.date ? new Date(p.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-fuchsia-50/80 flex items-center justify-center group-hover:bg-fuchsia-100 transition-colors border border-fuchsia-100/50 shadow-inner">
                                                                    <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:text-fuchsia-600 group-hover:translate-x-0.5 transition-all" />
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CardInfo({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={`rounded-2xl p-3 ${accent ? 'bg-gradient-to-br from-fuchsia-50 to-purple-50 border border-fuchsia-100/60 col-span-2 shadow-sm ring-1 ring-white/60' : 'bg-white/80 border border-purple-100/50 shadow-sm backdrop-blur-sm'}`}>
            <p className={`text-[10px] uppercase tracking-widest font-black mb-1 ${accent ? 'text-fuchsia-500/80' : 'text-purple-400/80'}`}>{label}</p>
            <p className={`text-[15px] font-bold leading-tight ${accent ? 'text-fuchsia-900' : 'text-slate-800'}`}>{value || '—'}</p>
        </div>
    );
}

function SpreadsheetViewer({ data }: { data: any }) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                setCanScrollLeft(scrollLeft > 0);
                setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            checkScroll(); // Check initially
            window.addEventListener('resize', checkScroll);
        }

        // Wait for fonts/layout to settle before checking scroll
        const timeoutId = setTimeout(checkScroll, 100);

        return () => {
            if (container) container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
            clearTimeout(timeoutId);
        };
    }, [data.columns]);

    if (!data || !data.columns) return null;

    const hasRowLabels = data.rows?.some((r: any) => r.label);

    return (
        <div className="relative border-0 rounded-2xl bg-white/40 shadow-inner overflow-hidden">
            {/* Visual indicators that it's scrollable */}
            {canScrollRight && (
                <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-purple-900/10 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
            )}
            {canScrollLeft && (
                <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-purple-900/10 to-transparent pointer-events-none z-30 transition-opacity duration-200" />
            )}

            <div
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-auto max-h-[70vh] scrollbar-hide translate-z-0 w-full"
            >
                <table className="border-collapse table-fixed min-w-[600px] sm:min-w-full">
                    <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-sm ring-1 ring-purple-100">
                        <tr>
                            {hasRowLabels && (
                                <th className="w-12 bg-purple-50/80 border-r border-purple-100/50 sticky left-0 top-0 z-30 shadow-[1px_1px_0_0_rgba(168,85,247,0.1)] backdrop-blur-md">
                                    {/* Corner block */}
                                </th>
                            )}
                            {data.columns.map((col: any, i: number) => (
                                <th
                                    key={i}
                                    className="px-4 py-3.5 text-left text-[10px] font-black text-purple-600 uppercase tracking-widest border-r border-purple-100/50 last:border-0 bg-purple-50/80 whitespace-nowrap backdrop-blur-sm"
                                    style={{ width: col.width || 120, minWidth: Math.max(100, col.width || 120) }}
                                >
                                    {(col.label || String.fromCharCode(65 + i))}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/50">
                        {data.rows.map((row: any, rIdx: number) => {
                            const isEven = rIdx % 2 === 0;
                            const rowBgClass = isEven ? 'bg-white' : 'bg-fuchsia-50/30';
                            const labelBgClass = isEven ? 'bg-purple-50/50' : 'bg-fuchsia-50/80';
                            
                            return (
                                <tr key={rIdx} className={`${rowBgClass} hover:bg-fuchsia-100/60 transition-colors group/row`}>
                                    {hasRowLabels && (
                                        <td className={`px-2 py-3.5 ${labelBgClass} backdrop-blur-md border-r border-purple-100/50 text-[10px] font-black text-purple-500 text-center uppercase tracking-widest whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_rgba(168,85,247,0.05)]`}>
                                            {row.label}
                                        </td>
                                    )}
                                    {data.columns.map((_: any, cIdx: number) => {
                                        const key = `${rIdx}:${cIdx}`;
                                        const cell = data.data[key];
                                        if (!cell) return <td key={cIdx} className={`px-4 py-3.5 border-r border-purple-100/30 last:border-0 ${rowBgClass}`}></td>;

                                        return (
                                            <td
                                                key={cIdx}
                                                className={`px-4 py-3.5 text-[14px] border-r border-purple-100/30 last:border-0 ${rowBgClass} text-slate-700
                                                ${cell.bold ? 'font-bold text-slate-900' : 'font-medium'}
                                                ${cell.italic ? 'italic' : ''}
                                                ${cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left'}
                                            `}
                                                style={{ color: cell.color }}
                                            >
                                                {cell.value}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* Footer gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 sticky bottom-0" />
        </div>
    );
}
