'use client';

import { useState } from 'react';
import type { Slide } from '@/lib/types/admin';

interface SlideCardProps {
    slide: Slide;
    onEdit: (slide: Slide) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    isDragging?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dragHandleProps?: any;
}

export default function SlideCard({
    slide,
    onEdit,
    onDelete,
    onToggleActive,
    isDragging = false,
    dragHandleProps,
}: SlideCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const getTypeIcon = () => {
        switch (slide.type) {
            case 'youtube':
                return '📺';
            case 'debt':
                return '💵';
            case 'calendar':
                return '📅';
            default:
                return '📄';
        }
    };

    const getTypeLabel = () => {
        switch (slide.type) {
            case 'youtube':
                return 'YouTube Stream';
            case 'debt':
                return 'US Debt';
            case 'calendar':
                return 'Calendar';
            default:
                return 'Custom';
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete "${slide.name}"?`)) {
            setIsDeleting(true);
            await onDelete(slide.id);
            setIsDeleting(false);
        }
    };

    return (
        <div
            className={`bg-gray-800 rounded-lg border transition-all ${
                isDragging
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : slide.is_active
                      ? 'border-gray-700'
                      : 'border-gray-700/50 opacity-60'
            }`}
        >
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div
                        {...dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 mt-1"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getTypeIcon()}</span>
                            <h3 className="text-white font-medium truncate">{slide.name}</h3>
                            {slide.country && (
                                <span className="text-gray-500 text-sm">({slide.country})</span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                                {getTypeLabel()}
                            </span>
                            <span className="text-gray-500">{slide.duration_seconds}s</span>
                            {slide.show_weather && slide.type === 'youtube' && (
                                <span className="text-blue-400 text-xs">🌤️ Weather</span>
                            )}
                            {slide.timezone && (
                                <span className="text-gray-500 text-xs">{slide.timezone}</span>
                            )}
                        </div>

                        {slide.youtube_url && (
                            <div className="mt-2 text-xs text-gray-500 truncate max-w-md">
                                {slide.youtube_url.substring(0, 60)}...
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Active Toggle */}
                        <button
                            onClick={() => onToggleActive(slide.id, !slide.is_active)}
                            className={`p-2 rounded transition-colors ${
                                slide.is_active
                                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                            title={
                                slide.is_active
                                    ? 'Active - Click to disable'
                                    : 'Inactive - Click to enable'
                            }
                        >
                            {slide.is_active ? '✓' : '○'}
                        </button>

                        {/* Edit Button */}
                        <button
                            onClick={() => onEdit(slide)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                            title="Edit slide"
                        >
                            ✏️
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors disabled:opacity-50"
                            title="Delete slide"
                        >
                            {isDeleting ? '...' : '🗑️'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
