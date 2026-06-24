'use client';

import { useState, useEffect, useRef } from 'react';
import type { Sponsor, SponsorInsert } from '@/lib/types/admin';

interface SponsorFormProps {
    sponsor?: Sponsor | null;
    onSubmit: (data: SponsorInsert) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function SponsorForm({
    sponsor,
    onSubmit,
    onCancel,
    isSubmitting,
}: SponsorFormProps) {
    const [formData, setFormData] = useState<SponsorInsert>({
        name: '',
        logo_url: '',
        website_url: '',
        is_active: true,
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Populate form with sponsor data when editing
    useEffect(() => {
        if (sponsor) {
            setFormData({
                name: sponsor.name,
                logo_url: sponsor.logo_url || '',
                website_url: sponsor.website_url || '',
                is_active: sponsor.is_active,
            });
        }
    }, [sponsor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
        ];

        if (!allowedTypes.includes(file.type)) {
            setUploadError('Invalid file type. Use JPG, PNG, GIF, WebP, or SVG.');

            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File too large. Maximum size is 5MB.');

            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const body = new FormData();
            body.append('file', file);
            body.append('prefix', 'sponsors');

            const response = await fetch('/api/admin/upload', { method: 'POST', body });
            const result = (await response.json()) as {
                success: boolean;
                data?: { url: string; key: string };
                error?: string;
            };

            if (!response.ok || !result.success) {
                throw new Error(result.error ?? 'Upload failed');
            }

            setFormData((prev) => ({ ...prev, logo_url: result.data!.url }));
        } catch (err) {
            console.error('Upload error:', err);
            setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    // Remove uploaded logo
    const handleRemoveLogo = () => {
        setFormData((prev) => ({ ...prev, logo_url: '' }));

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                >
                    SPONSOR NAME *
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., XAPO Bank"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                />
            </div>

            {/* Logo Upload */}
            <div>
                <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
                    LOGO
                </label>

                {/* Current Logo Preview */}
                {formData.logo_url && (
                    <div className="mb-3 p-4 bg-[#0a0a0a] border-2 border-[#00ff00]">
                        <p className="text-[#888] text-xs font-mono mb-2 uppercase tracking-wider">
                            CURRENT LOGO:
                        </p>
                        <div className="bg-black p-4 border-2 border-[#00ff00] flex items-center justify-center relative">
                            <img
                                src={formData.logo_url}
                                alt="Logo preview"
                                className="max-h-20 max-w-[240px] object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="absolute top-2 right-2 bg-[#ff0000] hover:bg-[#cc0000] text-white p-1 border-2 border-[#ff0000] font-mono text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Button */}
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-2 border-2 border-[#00ff00] transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                        <span>📁</span>
                        <span>{isUploading ? 'UPLOADING...' : 'UPLOAD LOGO'}</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="hidden"
                        />
                    </label>

                    <span className="text-[#888] text-xs font-mono uppercase tracking-wider">
                        OR PASTE URL BELOW
                    </span>
                </div>

                {/* Upload Error */}
                {uploadError && (
                    <p className="text-[#ff0000] text-xs font-mono mt-2 uppercase tracking-wider">
                        {uploadError}
                    </p>
                )}

                {/* Manual URL Input */}
                <input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    value={formData.logo_url || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                    className="w-full mt-3 px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                />
                <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                    SUPPORTED FORMATS: JPG, PNG, GIF, WEBP, SVG (MAX 5MB)
                </p>
            </div>

            {/* Website URL */}
            <div>
                <label
                    htmlFor="website_url"
                    className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                >
                    WEBSITE URL
                </label>
                <input
                    id="website_url"
                    name="website_url"
                    type="url"
                    value={formData.website_url || ''}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                />
                <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                    OPTIONAL SPONSOR WEBSITE (FOR REFERENCE ONLY)
                </p>
            </div>

            {/* Active Checkbox */}
            <div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
                    />
                    <span className="text-white font-mono text-xs uppercase tracking-wider">
                        ACTIVE (SHOW ON DISPLAY)
                    </span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t-2 border-[#1a1a1a]">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting || isUploading}
                    className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 border-2 border-[#333]"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-4 py-2 bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 border-2 border-[#00ff00]"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            <span>SAVING...</span>
                        </>
                    ) : (
                        <span>{sponsor ? 'UPDATE SPONSOR' : 'ADD SPONSOR'}</span>
                    )}
                </button>
            </div>
        </form>
    );
}
