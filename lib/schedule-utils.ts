import type { Slide } from '@/lib/types/admin';

/**
 * Returns true if the slide should appear right now based on its UTC schedule.
 * - active_days null/empty → any day is fine
 * - active_time_start / active_time_end null/empty → any hour is fine
 * - Supports midnight-crossing windows (e.g. 22:00 → 06:00)
 */
export function isSlideScheduledNow(slide: Slide, now: Date): boolean {
    const utcDay = now.getUTCDay(); // 0=Sun … 6=Sat
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    if (slide.active_days && slide.active_days.length > 0) {
        if (!slide.active_days.includes(utcDay)) {
            return false;
        }
    }

    const parseHHMM = (hhmm: string): number => {
        const [h, m] = hhmm.split(':').map(Number);

        return h * 60 + (m || 0);
    };

    if (slide.active_time_start && slide.active_time_end) {
        const start = parseHHMM(slide.active_time_start);
        const end = parseHHMM(slide.active_time_end);

        if (start <= end) {
            if (utcMinutes < start || utcMinutes >= end) {
                return false;
            }
        } else {
            // Crosses midnight
            if (utcMinutes < start && utcMinutes >= end) {
                return false;
            }
        }
    } else if (slide.active_time_start && !slide.active_time_end) {
        const start = parseHHMM(slide.active_time_start);

        if (utcMinutes < start) {
            return false;
        }
    } else if (!slide.active_time_start && slide.active_time_end) {
        const end = parseHHMM(slide.active_time_end);

        if (utcMinutes >= end) {
            return false;
        }
    }

    return true;
}

/** Returns true if the slide has any schedule restriction configured. */
export function hasSchedule(slide: Slide): boolean {
    return (
        (slide.active_days !== null && slide.active_days !== undefined) ||
        !!slide.active_time_start ||
        !!slide.active_time_end
    );
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Returns a short human-readable summary of the schedule (e.g. "MON WED FRI • 14:00–18:00 UTC"). */
export function formatScheduleSummary(slide: Slide): string {
    const parts: string[] = [];

    if (slide.active_days && slide.active_days.length > 0) {
        parts.push(slide.active_days.map((d) => DAY_LABELS[d]).join(' '));
    }

    if (slide.active_time_start || slide.active_time_end) {
        const start = slide.active_time_start ?? '00:00';
        const end = slide.active_time_end ?? '24:00';
        parts.push(`${start}–${end} UTC`);
    }

    return parts.join(' • ');
}
