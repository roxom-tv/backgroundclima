'use client';

import { useEffect, useState, useCallback } from 'react';
import type { GlobalSettings, TransitionEffect } from '@/lib/supabase/types';

const DEFAULT_SETTINGS: GlobalSettings = {
  show_sponsors: true,
  show_live_indicator: true,
  transition_effect: 'tv_static',
  default_duration_seconds: 25,
};

const TRANSITION_EFFECTS: { value: TransitionEffect; label: string; description: string }[] = [
  { value: 'tv_static', label: 'TV Static', description: 'Classic TV channel switching effect' },
  { value: 'fade', label: 'Fade', description: 'Simple fade in/out transition' },
  { value: 'slide', label: 'Slide', description: 'Slide transition between screens' },
  { value: 'none', label: 'None', description: 'No transition effect' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) {
          console.error('Error fetching settings:', result.error);
          setNotification({ type: 'error', message: 'Failed to load settings. Please refresh the page.' });
        } else if (result.data) {
          setSettings(result.data as GlobalSettings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setNotification({ 
          type: 'error', 
          message: err instanceof Error ? err.message : 'Failed to load settings' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Show notification
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Save settings
  const saveSettings = useCallback(async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'global', value: settings }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to save settings');
      }

      showNotification('success', 'Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      showNotification('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [settings, showNotification]);

  // Handle toggle change
  const handleToggle = (key: keyof GlobalSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle number change
  const handleNumberChange = (key: keyof GlobalSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle select change
  const handleSelectChange = (key: keyof GlobalSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-[#00ff00] pb-3 mb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">SETTINGS</h1>
        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
          CONFIGURE GLOBAL DISPLAY OPTIONS
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 text-xs font-mono border-2 ${
            notification.type === 'success'
              ? 'bg-[#0a0a0a] border-[#00ff00] text-[#00ff00]'
              : 'bg-[#0a0a0a] border-[#ff0000] text-[#ff0000]'
          }`}
        >
          {notification.message.toUpperCase()}
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-[#0a0a0a] border-2 border-[#00ff00] divide-y divide-[#1a1a1a]">
        {/* Show Sponsors */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-mono font-medium text-xs uppercase tracking-wider">SHOW SPONSORS</h3>
              <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                DISPLAY THE &quot;PRESENTED BY&quot; SPONSOR SECTION ON THE DISPLAY
              </p>
            </div>
            <button
              onClick={() => handleToggle('show_sponsors')}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.show_sponsors ? 'bg-[#00ff00] border-[#00ff00]' : 'bg-[#1a1a1a] border-[#333]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 bg-black transition duration-200 ease-in-out ${
                  settings.show_sponsors ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Show Live Indicator */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-mono font-medium text-xs uppercase tracking-wider">SHOW LIVE INDICATOR</h3>
              <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                DISPLAY THE RED LIVE INDICATOR ON YOUTUBE STREAM SLIDES
              </p>
            </div>
            <button
              onClick={() => handleToggle('show_live_indicator')}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.show_live_indicator ? 'bg-[#00ff00] border-[#00ff00]' : 'bg-[#1a1a1a] border-[#333]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 bg-black transition duration-200 ease-in-out ${
                  settings.show_live_indicator ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Transition Effect */}
        <div className="p-4">
          <div>
            <h3 className="text-white font-mono font-medium text-xs uppercase tracking-wider mb-3">TRANSITION EFFECT</h3>
            <p className="text-[#888] text-xs font-mono mb-4 uppercase tracking-wider">
              CHOOSE THE VISUAL EFFECT WHEN SWITCHING BETWEEN SLIDES
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TRANSITION_EFFECTS.map((effect) => (
                <button
                  key={effect.value}
                  onClick={() => handleSelectChange('transition_effect', effect.value)}
                  className={`p-3 border-2 text-left transition-all font-mono text-xs ${
                    settings.transition_effect === effect.value
                      ? 'border-[#00ff00] bg-[#0a0a0a] text-[#00ff00]'
                      : 'border-[#333] bg-[#1a1a1a] text-white hover:border-[#00ff00]'
                  }`}
                >
                  <div className="font-semibold uppercase tracking-wider">{effect.label}</div>
                  <div className="text-[#888] text-xs mt-1">{effect.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Default Duration */}
        <div className="p-4">
          <div>
            <h3 className="text-white font-mono font-medium text-xs uppercase tracking-wider mb-1">DEFAULT SLIDE DURATION</h3>
            <p className="text-[#888] text-xs font-mono mb-4 uppercase tracking-wider">
              DEFAULT DISPLAY TIME FOR NEW SLIDES (SECONDS)
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={120}
                value={settings.default_duration_seconds}
                onChange={(e) => handleNumberChange('default_duration_seconds', parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-[#1a1a1a] appearance-none cursor-pointer"
                style={{ accentColor: '#00ff00' }}
              />
              <div className="bg-[#1a1a1a] border-2 border-[#00ff00] px-4 py-2 text-white font-mono text-xs min-w-[80px] text-center">
                {settings.default_duration_seconds}S
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="bg-[#00ff00] hover:bg-[#00cc00] disabled:bg-[#00ff00]/50 text-black px-6 py-2 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border-2 border-[#00ff00]"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-[#0a0a0a] p-4 border-2 border-[#00ff00] border-l-4">
        <h3 className="text-white font-mono font-medium text-xs uppercase tracking-wider mb-2">ℹ️ ABOUT REAL-TIME UPDATES</h3>
        <p className="text-[#888] text-xs font-mono uppercase tracking-wider">
          CHANGES YOU MAKE HERE WILL BE REFLECTED ON THE DISPLAY IN REAL-TIME. 
          NO NEED TO REFRESH THE DISPLAY PAGE - IT WILL AUTOMATICALLY PICK UP THE NEW SETTINGS.
        </p>
      </div>
    </div>
  );
}


