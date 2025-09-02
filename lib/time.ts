export function formatCityTime(timezone: string): { time: string; date: string } {
  try {
    const now = new Date();
    const cityTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    
    const time = cityTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    
    const date = cityTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    
    return { time, date };
  } catch (error) {
    console.error(`Error formatting time for timezone ${timezone}:`, error);
    return { time: "--:--", date: "--" };
  }
}

export function getTimeUntilNextRotation(seconds: number): number {
  const now = new Date();
  const secondsSinceEpoch = Math.floor(now.getTime() / 1000);
  return seconds - (secondsSinceEpoch % seconds);
}
