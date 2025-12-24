'use client';

import { useState, useEffect, useRef } from 'react';
import type { CalendarEvent, CalendarEventInsert, EventTextSize, ScheduleTime } from '@/lib/supabase/types';

interface EventFormProps {
  event?: CalendarEvent | null;
  onSubmit: (data: CalendarEventInsert) => Promise<void>;
  onCancel: () => void;
  onUploadImage: (file: File) => Promise<{ url: string | null; error: string | null }>;
  isSubmitting: boolean;
}

const COLORS = [
  { value: '#1AE784', label: 'Mint Green (Default)' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
];

const FONTS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
];

const TEXT_SIZES: { value: EventTextSize; label: string; preview: string }[] = [
  { value: 'small', label: 'Small', preview: 'text-2xl' },
  { value: 'medium', label: 'Medium', preview: 'text-4xl' },
  { value: 'large', label: 'Large', preview: 'text-6xl' },
  { value: 'xlarge', label: 'Extra Large', preview: 'text-8xl' },
];

const TEXT_COLORS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#F3F4F6', label: 'Light Gray' },
  { value: '#FEF3C7', label: 'Cream' },
  { value: '#FDE68A', label: 'Yellow' },
  { value: '#FBBF24', label: 'Gold' },
  { value: '#34D399', label: 'Green' },
  { value: '#60A5FA', label: 'Blue' },
  { value: '#F472B6', label: 'Pink' },
];

export default function EventForm({
  event,
  onSubmit,
  onCancel,
  onUploadImage,
  isSubmitting,
}: EventFormProps) {
  const [formData, setFormData] = useState<CalendarEventInsert>({
    title: '',
    description: '',
    image_url: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    is_active: true,
    color: '#1AE784',
    // Style options
    title_font: 'Inter',
    title_size: 'large',
    title_color: '#FFFFFF',
    text_color: '#F3F4F6',
    overlay_opacity: 50,
    show_date_badge: true,
    // Multiple timezone times
    schedule_times: [],
    // Location
    location: '',
  });

  const [showStyleOptions, setShowStyleOptions] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        image_url: event.image_url || '',
        start_date: event.start_date,
        end_date: event.end_date || '',
        start_time: event.start_time?.slice(0, 5) || '', // HH:MM
        end_time: event.end_time?.slice(0, 5) || '',
        is_active: event.is_active,
        color: event.color || '#1AE784',
        // Style options
        title_font: event.title_font || 'Inter',
        title_size: event.title_size || 'large',
        title_color: event.title_color || '#FFFFFF',
        text_color: event.text_color || '#F3F4F6',
        overlay_opacity: event.overlay_opacity ?? 50,
        show_date_badge: event.show_date_badge ?? true,
        // Multiple timezone times
        schedule_times: event.schedule_times || [],
        // Location
        location: event.location || '',
      });
      // Show style options if any are customized
      if (event.title_font || event.title_size || event.title_color || event.text_color || event.overlay_opacity !== null) {
        setShowStyleOptions(true);
      }
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up empty strings to null
    const cleanedData: CalendarEventInsert = {
      ...formData,
      description: formData.description || null,
      image_url: formData.image_url || null,
      end_date: formData.end_date || null,
      start_time: formData.start_time ? `${formData.start_time}:00` : null,
      end_time: formData.end_time ? `${formData.end_time}:00` : null,
      // Style options
      title_font: formData.title_font || null,
      title_size: formData.title_size || null,
      title_color: formData.title_color || null,
      text_color: formData.text_color || null,
      overlay_opacity: formData.overlay_opacity ?? null,
      show_date_badge: formData.show_date_badge ?? true,
      // Multiple timezone times
      schedule_times: formData.schedule_times && formData.schedule_times.length > 0
        ? formData.schedule_times
        : null,
      // Location
      location: formData.location?.trim() || null,
    };

    await onSubmit(cleanedData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const { url, error } = await onUploadImage(file);

    if (error) {
      setUploadError(error);
    } else if (url) {
      setFormData(prev => ({ ...prev, image_url: url }));
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
          TITLE *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Event title"
          className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
          DESCRIPTION
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          placeholder="Event description..."
          rows={3}
          className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
          LOCATION / SOURCE
        </label>
        <input
          id="location"
          name="location"
          type="text"
          value={formData.location || ''}
          onChange={handleChange}
          placeholder="e.g., ARGENTINA, ROXOM TV, El Salvador"
          className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
        />
        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
          DISPLAYED IN MODERN STYLE CARDS
        </p>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
          EVENT IMAGE
        </label>
        <div className="flex items-center gap-4">
          {formData.image_url && (
            <div className="relative w-20 h-20 overflow-hidden bg-[#1a1a1a] border-2 border-[#00ff00]">
              <img
                src={formData.image_url}
                alt="Event preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                className="absolute top-1 right-1 w-5 h-5 bg-[#ff0000] border-2 border-[#ff0000] text-white text-xs flex items-center justify-center font-mono"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="event-image-upload"
            />
            <label
              htmlFor="event-image-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors border-2 font-mono text-xs uppercase tracking-wider ${isUploading
                ? 'bg-[#1a1a1a] text-[#666] border-[#333]'
                : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-[#00ff00]'
                }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>UPLOADING...</span>
                </>
              ) : (
                <>
                  <span>📷</span>
                  <span>{formData.image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</span>
                </>
              )}
            </label>
            {uploadError && (
              <p className="text-[#ff0000] text-xs font-mono mt-1 uppercase tracking-wider">{uploadError}</p>
            )}
          </div>
        </div>
        {/* Or URL */}
        <input
          name="image_url"
          type="url"
          value={formData.image_url || ''}
          onChange={handleChange}
          placeholder="Or paste image URL"
          className="mt-2 w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
            START DATE *
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
            END DATE
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            value={formData.end_date || ''}
            onChange={handleChange}
            min={formData.start_date}
            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
          />
          <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">LEAVE EMPTY FOR SINGLE-DAY EVENT</p>
        </div>
      </div>

      {/* Time Range (simple - optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
            START TIME (OPTIONAL)
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            value={formData.start_time || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
          />
        </div>
        <div>
          <label htmlFor="end_time" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
            END TIME (OPTIONAL)
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            value={formData.end_time || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
          />
        </div>
      </div>

      {/* Multiple Timezone Times */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          🌍 Multiple Timezone Times
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Add times for different timezones (e.g., &quot;8:00 PM&quot; + &quot;ET&quot;, &quot;5:00 PM&quot; + &quot;Buenos Aires&quot;)
        </p>
        <div className="space-y-2">
          {(formData.schedule_times || []).map((scheduleItem, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={scheduleItem.time}
                onChange={(e) => {
                  const newTimes = [...(formData.schedule_times || [])];
                  newTimes[index] = { ...newTimes[index], time: e.target.value };
                  setFormData(prev => ({ ...prev, schedule_times: newTimes }));
                }}
                placeholder="8:00 PM"
                className="w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 text-sm"
              />
              <input
                type="text"
                value={scheduleItem.timezone}
                onChange={(e) => {
                  const newTimes = [...(formData.schedule_times || [])];
                  newTimes[index] = { ...newTimes[index], timezone: e.target.value };
                  setFormData(prev => ({ ...prev, schedule_times: newTimes }));
                }}
                placeholder="ET / Buenos Aires / etc"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const newTimes = (formData.schedule_times || []).filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, schedule_times: newTimes }));
                }}
                className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newTimes: ScheduleTime[] = [...(formData.schedule_times || []), { time: '', timezone: '' }];
              setFormData(prev => ({ ...prev, schedule_times: newTimes }));
            }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm flex items-center gap-1"
          >
            <span>+</span> Add Timezone
          </button>
        </div>
        {(formData.schedule_times || []).length > 0 && (
          <p className="text-xs text-green-400 mt-2">
            ✓ {formData.schedule_times?.length} timezone(s) configured
          </p>
        )}
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
          EVENT COLOR (BADGE & ACCENT)
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
              className={`w-8 h-8 transition-all border-2 ${formData.color === color.value
                ? 'border-[#00ff00] scale-110'
                : 'border-[#333] hover:border-[#00ff00]'
                }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Style Options Toggle */}
      <div className="border-t-2 border-[#1a1a1a] pt-4">
        <button
          type="button"
          onClick={() => setShowStyleOptions(!showStyleOptions)}
          className="flex items-center gap-2 text-white hover:text-[#00ff00] transition-colors font-mono text-xs uppercase tracking-wider"
        >
          <span className={`transform transition-transform ${showStyleOptions ? 'rotate-90' : ''}`}>▶</span>
          <span className="font-medium">TEXT STYLE OPTIONS</span>
          <span className="text-[#888]">(FONT, SIZE, COLORS)</span>
        </button>
      </div>

      {/* Style Options Panel */}
      {showStyleOptions && (
        <div className="space-y-4 bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
          {/* Font Family */}
          <div>
            <label htmlFor="title_font" className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
              FONT FAMILY
            </label>
            <select
              id="title_font"
              name="title_font"
              value={formData.title_font || 'Inter'}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
              style={{ fontFamily: formData.title_font || 'Inter' }}
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title Size */}
          <div>
            <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
              TITLE SIZE
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TEXT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, title_size: size.value }))}
                  className={`px-3 py-2 border-2 font-mono text-xs uppercase tracking-wider transition-all ${formData.title_size === size.value
                    ? 'bg-[#00ff00] text-black border-[#00ff00]'
                    : 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#00ff00]'
                    }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, title_color: color.value }))}
                  className={`w-8 h-8 transition-all border-2 ${formData.title_color === color.value
                    ? 'border-[#00ff00] scale-110'
                    : 'border-[#333] hover:border-[#00ff00]'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
              {/* Custom color input */}
              <input
                type="color"
                value={formData.title_color || '#FFFFFF'}
                onChange={(e) => setFormData(prev => ({ ...prev, title_color: e.target.value }))}
                className="w-8 h-8 cursor-pointer bg-transparent border-2 border-[#00ff00]"
                title="Custom color"
              />
            </div>
          </div>

          {/* Text Color (Description) */}
          <div>
            <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
              DESCRIPTION COLOR
            </label>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, text_color: color.value }))}
                  className={`w-8 h-8 rounded-md transition-all border ${formData.text_color === color.value
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800 scale-110'
                    : 'border-gray-600 hover:scale-105'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
              <input
                type="color"
                value={formData.text_color || '#F3F4F6'}
                onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                className="w-8 h-8 cursor-pointer bg-transparent border-2 border-[#00ff00]"
                title="Custom color"
              />
            </div>
          </div>

          {/* Overlay Opacity */}
          <div>
            <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
              BACKGROUND OVERLAY: {formData.overlay_opacity}%
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={formData.overlay_opacity ?? 50}
              onChange={(e) => setFormData(prev => ({ ...prev, overlay_opacity: parseInt(e.target.value) }))}
              className="w-full h-2 bg-[#1a1a1a] appearance-none cursor-pointer"
              style={{ accentColor: '#00ff00' }}
            />
            <div className="flex justify-between text-xs text-[#888] font-mono mt-1 uppercase tracking-wider">
              <span>0% (TRANSPARENT)</span>
              <span>90% (DARK)</span>
            </div>
          </div>

          {/* Show Date Badge */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="show_date_badge"
              checked={formData.show_date_badge ?? true}
              onChange={handleChange}
              className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
            />
            <div>
              <span className="text-white font-mono text-xs uppercase tracking-wider">SHOW DATE BADGE</span>
              <p className="text-xs text-[#888] font-mono uppercase tracking-wider">DISPLAY THE DATE BADGE ON THE EVENT</p>
            </div>
          </label>

          {/* Preview */}
          <div className="border-t-2 border-[#1a1a1a] pt-4">
            <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">PREVIEW</label>
            <div
              className="relative overflow-hidden p-6 border-2 border-[#00ff00]"
              style={{
                backgroundColor: formData.image_url ? undefined : '#1f2937',
                backgroundImage: formData.image_url ? `url(${formData.image_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0,0,0,${(formData.overlay_opacity ?? 50) / 100})` }}
              />
              {/* Content */}
              <div className="relative z-10">
                <h3
                  className="font-bold mb-1"
                  style={{
                    fontFamily: formData.title_font || 'Inter',
                    color: formData.title_color || '#FFFFFF',
                    fontSize: formData.title_size === 'small' ? '1.25rem' :
                      formData.title_size === 'medium' ? '1.5rem' :
                        formData.title_size === 'xlarge' ? '2.5rem' : '2rem'
                  }}
                >
                  {formData.title || 'Event Title'}
                </h3>
                <p style={{ color: formData.text_color || '#F3F4F6', fontSize: '0.875rem' }}>
                  {formData.description || 'Event description goes here...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active */}
      <div className="bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
          />
          <div>
            <span className="text-white font-mono text-xs uppercase tracking-wider">ACTIVE</span>
            <p className="text-xs text-[#888] font-mono uppercase tracking-wider">SHOW THIS EVENT IN THE CALENDAR</p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t-2 border-[#1a1a1a]">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>SAVING...</span>
            </>
          ) : (
            <span>{event ? 'UPDATE EVENT' : 'CREATE EVENT'}</span>
          )}
        </button>
      </div>
    </form>
  );
}


