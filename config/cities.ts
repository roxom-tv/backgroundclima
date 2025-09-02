
export const ROTATION_SECONDS = 15;

export type CityConfig = {
  name: string;           // "Hong Kong"
  country: string;        // "Hong Kong"
  ytLiveUrl: string;      // YouTube Live embed URL with parameters
  openWeatherQuery: string; // "Hong Kong,HK"
  tz: string;             // "Asia/Hong_Kong"
};

export const CITIES: CityConfig[] = [
  { 
    name: "Hong Kong", 
    country: "Hong Kong",
    ytLiveUrl: "https://www.youtube.com/embed/7XT3EY_1NPU?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=7XT3EY_1NPU&showinfo=0&iv_load_policy=3&disablekb=1&fs=0", 
    openWeatherQuery: "Hong Kong,HK", 
    tz: "Asia/Hong_Kong" 
  },
  { 
    name: "London", 
    country: "United Kingdom",
    ytLiveUrl: "https://www.youtube.com/embed/57w2gYXjRic?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=57w2gYXjRic&showinfo=0&iv_load_policy=3&disablekb=1&fs=0", 
    openWeatherQuery: "London,GB", 
    tz: "Europe/London" 
  },
  { 
    name: "San Francisco", 
    country: "United States",
    ytLiveUrl: "https://www.youtube.com/embed/CXYr04BWvmc?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=CXYr04BWvmc&showinfo=0&iv_load_policy=3&disablekb=1&fs=0", 
    openWeatherQuery: "San Francisco,US", 
    tz: "America/Los_Angeles" 
  },
];
