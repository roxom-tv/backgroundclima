
export interface CityConfig {
  name: string;
  country: string;
  ytLiveUrl: string;
  openWeatherQuery: string;
  tz: string;
}

export const ROTATION_SECONDS = 25; // Tiempo para cada ciudad en el carrusel
export const DEBT_DISPLAY_SECONDS = 35; // Tiempo para mostrar estadísticas de deuda

export const CITIES: CityConfig[] = [
  { 
    name: "Hong Kong", 
    country: "Hong Kong",
    ytLiveUrl: "https://www.youtube.com/embed/vlINsdjDN28?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=vlINsdjDN28&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Hong Kong,HK", 
    tz: "Asia/Hong_Kong" 
  },
  { 
    name: "London", 
    country: "United Kingdom",
    ytLiveUrl: "https://www.youtube.com/embed/57w2gYXjRic?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=57w2gYXjRic&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "London,GB", 
    tz: "Europe/London" 
  },
  { 
    name: "San Francisco", 
    country: "United States",
    ytLiveUrl: "https://www.youtube.com/embed/CXYr04BWvmc?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=CXYr04BWvmc&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "San Francisco,US", 
    tz: "America/Los_Angeles" 
  },
  { 
    name: "New York", 
    country: "United States",
    ytLiveUrl: "https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=rnXIjl_Rzy4&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "New York,US", 
    tz: "America/New_York" 
  },
  { 
    name: "Dubai", 
    country: "United Arab Emirates",
    ytLiveUrl: "https://www.youtube.com/embed/7dE4IjDQJmE?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=7dE4IjDQJmE&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Dubai,AE", 
    tz: "Asia/Dubai" 
  },
  { 
    name: "Tokyo", 
    country: "Japan",
    ytLiveUrl: "https://www.youtube.com/embed/_k-5U7IeK8g?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=_k-5U7IeK8g&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Tokyo,JP", 
    tz: "Asia/Tokyo" 
  },
  { 
    name: "Sydney", 
    country: "Australia",
    ytLiveUrl: "https://www.youtube.com/embed/5uZa3-RMFos?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=5uZa3-RMFos&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Sydney,AU", 
    tz: "Australia/Sydney" 
  },
  { 
    name: "Amsterdam", 
    country: "Netherlands",
    ytLiveUrl: "https://www.youtube.com/embed/1phWWCgzXgM?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=1phWWCgzXgM&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Amsterdam,NL", 
    tz: "Europe/Amsterdam" 
  },
  { 
    name: "Necochea", 
    country: "Argentina",
    ytLiveUrl: "https://www.youtube.com/embed/nyiQdER7LzI?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=nyiQdER7LzI&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440&start=0&end=0&cc_load_policy=0&modestbranding=1&origin=https://www.youtube.com", 
    openWeatherQuery: "Necochea,AR", 
    tz: "America/Argentina/Buenos_Aires" 
  },
  { 
    name: "Alberta", 
    country: "Canada",
    ytLiveUrl: "https://www.youtube.com/embed/_0wPODlF9wU?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=_0wPODlF9wU&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440", 
    openWeatherQuery: "Calgary,CA", 
    tz: "America/Edmonton" 
  },
];