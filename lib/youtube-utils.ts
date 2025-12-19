/**
 * Converts embed URL back to a simple watch URL for display in forms
 */
export function convertEmbedUrlToSimple(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const trimmedUrl = url.trim();
  
  // Extract video ID from embed URL
  const videoIdMatch = trimmedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (videoIdMatch) {
    return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
  }

  // If it's already a simple URL, return as-is
  return trimmedUrl;
}

/**
 * Converts various YouTube URL formats to embed URL format
 * Supports:
 * - Regular watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short URLs: https://youtu.be/VIDEO_ID
 * - Live URLs: https://www.youtube.com/live/VIDEO_ID
 * - Embed URLs: https://www.youtube.com/embed/VIDEO_ID (returns as-is)
 */
export function convertYouTubeUrlToEmbed(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const trimmedUrl = url.trim();

  // If already an embed URL, return as-is (but ensure it has autoplay params)
  if (trimmedUrl.includes('youtube.com/embed/') || trimmedUrl.includes('youtu.be/embed/')) {
    return ensureEmbedParams(trimmedUrl);
  }

  // Extract video ID from various formats
  let videoId: string | null = null;

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Pattern 2: youtube.com/live/VIDEO_ID
  if (!videoId) {
    const liveMatch = trimmedUrl.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) {
      videoId = liveMatch[1];
    }
  }

  // Pattern 3: youtube.com/v/VIDEO_ID
  if (!videoId) {
    const vMatch = trimmedUrl.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) {
      videoId = vMatch[1];
    }
  }

  // Pattern 4: Just the video ID (11 characters)
  if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    videoId = trimmedUrl;
  }

  // If we couldn't extract a video ID, return the original URL
  if (!videoId) {
    return trimmedUrl;
  }

  // Build embed URL with optimal parameters for background display
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${videoId}&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440`;

  return embedUrl;
}

/**
 * Ensures an embed URL has the necessary parameters for background display
 */
function ensureEmbedParams(url: string): string {
  // If it already has query parameters, merge them
  const urlObj = new URL(url);
  
  // Set optimal parameters for background display
  urlObj.searchParams.set('autoplay', '1');
  urlObj.searchParams.set('mute', '1');
  urlObj.searchParams.set('controls', '0');
  urlObj.searchParams.set('playsinline', '1');
  urlObj.searchParams.set('rel', '0');
  urlObj.searchParams.set('modestbranding', '1');
  urlObj.searchParams.set('loop', '1');
  
  // Extract video ID for playlist parameter
  const videoIdMatch = url.match(/\/([a-zA-Z0-9_-]{11})/);
  if (videoIdMatch) {
    urlObj.searchParams.set('playlist', videoIdMatch[1]);
  }
  
  urlObj.searchParams.set('showinfo', '0');
  urlObj.searchParams.set('iv_load_policy', '3');
  urlObj.searchParams.set('disablekb', '1');
  urlObj.searchParams.set('fs', '0');
  urlObj.searchParams.set('vq', 'hd1440');

  return urlObj.toString();
}

/**
 * Extracts video ID from any YouTube URL format
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If it's just the video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

