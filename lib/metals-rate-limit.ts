/**
 * Rate limiting para Metals.dev API (100 requests/mes)
 * Cada llamada consume 1 request (un solo endpoint devuelve todos los metales)
 */

interface MetalsRateLimit {
  month: number; // Mes actual (0-11)
  year: number; // Año actual
  count: number; // Requests realizadas este mes
}

let metalsRateLimit: MetalsRateLimit | null = null;
export const METALS_MONTHLY_LIMIT = 100; // 100 requests por mes

function getCurrentMonth(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export function canMakeMetalsRequest(): boolean {
  const current = getCurrentMonth();
  
  // Si es un nuevo mes, resetear contador
  if (!metalsRateLimit || metalsRateLimit.month !== current.month || metalsRateLimit.year !== current.year) {
    metalsRateLimit = {
      month: current.month,
      year: current.year,
      count: 0,
    };
  }
  
  return metalsRateLimit.count < METALS_MONTHLY_LIMIT;
}

export function incrementMetalsRequest(): void {
  const current = getCurrentMonth();
  
  if (!metalsRateLimit || metalsRateLimit.month !== current.month || metalsRateLimit.year !== current.year) {
    metalsRateLimit = {
      month: current.month,
      year: current.year,
      count: 0,
    };
  }
  
  metalsRateLimit.count++;
}

export function getMetalsRemainingRequests(): number {
  const current = getCurrentMonth();
  
  if (!metalsRateLimit || metalsRateLimit.month !== current.month || metalsRateLimit.year !== current.year) {
    return METALS_MONTHLY_LIMIT;
  }
  
  return Math.max(0, METALS_MONTHLY_LIMIT - metalsRateLimit.count);
}

export function getMetalsRequestsPerDay(): number {
  const current = getCurrentMonth();
  const now = new Date();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  
  const remaining = getMetalsRemainingRequests();
  
  if (daysRemaining <= 0) return 0;
  return Math.floor(remaining / daysRemaining);
}

export function getMetalsRateLimitInfo() {
  const current = getCurrentMonth();
  const now = new Date();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  
  const remaining = getMetalsRemainingRequests();
  const requestsPerDay = getMetalsRequestsPerDay();
  const used = metalsRateLimit ? metalsRateLimit.count : 0;
  
  return {
    limit: METALS_MONTHLY_LIMIT,
    used,
    remaining,
    requestsPerDay,
    month: current.month + 1, // 1-12
    year: current.year,
    daysRemaining,
    requestsPerHour: Math.floor(requestsPerDay / 24),
    estimatedDaysUntilLimit: remaining > 0 && requestsPerDay > 0 
      ? Math.ceil(remaining / requestsPerDay) 
      : 0,
  };
}

