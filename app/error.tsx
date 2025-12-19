'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4">
      <div className="text-red-500 text-2xl font-mono font-bold uppercase tracking-wider text-center">
        APPLICATION ERROR
      </div>
      <div className="text-white text-lg font-mono text-center max-w-2xl">
        {error.message || 'An unexpected error occurred'}
      </div>
      <button
        onClick={reset}
        className="mt-4 px-6 py-3 bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-sm uppercase tracking-wider transition-colors border-2 border-[#00ff00]"
      >
        TRY AGAIN
      </button>
      <div className="mt-8 text-[#888] text-xs font-mono text-center max-w-xl">
        If this error persists, please check:
        <br />
        1. Environment variables are configured in Vercel
        <br />
        2. Supabase project is accessible
        <br />
        3. Browser console for detailed error messages
      </div>
    </div>
  );
}
