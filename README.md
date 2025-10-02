# Background Clima - Live City Views

A Next.js 14 application that displays rotating YouTube Live streams from cities around the world with real-time weather information. Perfect for TV backgrounds, digital signage, or ambient displays.

## Features

- 🌍 **Live City Views**: YouTube Live streams from cities around the world including Hong Kong, London, New York, Dubai, Tokyo, Sydney, Amsterdam, Rio de Janeiro, Necochea, and Alberta
- ⏰ **Auto-Rotation**: Changes cities every 15 seconds with smooth transitions
- 🌤️ **Real-Time Weather**: Current temperature, conditions, and wind speed from OpenWeatherMap
- 🎮 **Fully Automatic**: No manual controls needed
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Smooth Animations**: Framer Motion powered transitions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Weather API**: OpenWeatherMap
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenWeatherMap API key

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd backgroundclima
npm install
```

### 2. Environment Variables

Copy the example environment file and add your OpenWeatherMap API key:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
OPENWEATHER_API_KEY=your_actual_api_key_here
OPENWEATHER_UNITS=metric
OPENWEATHER_LANG=es
ROTATION_SECONDS=15
```

**Getting an OpenWeatherMap API Key:**
1. Go to [OpenWeatherMap](https://openweathermap.org/)
2. Sign up for a free account
3. Navigate to "My API Keys" in your profile
4. Copy your API key and paste it in `.env.local`

### 3. Configure Cities

Edit `config/cities.ts` to customize:

- **City names** and display text
- **YouTube Live URLs** (replace with your preferred live streams)
- **OpenWeatherMap queries** (city,country format)
- **Timezone identifiers** (IANA timezone names)

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build and Production

```bash
npm run build
npm start
```

## Configuration

### Cities Configuration

The `config/cities.ts` file controls:

- **ROTATION_SECONDS**: How long each city is displayed (default: 15)
- **CITIES array**: Array of city configurations

Each city needs:
- `name`: Display name
- `ytLiveUrl`: YouTube Live embed URL with autoplay parameters
- `openWeatherQuery`: OpenWeatherMap query string
- `tz`: IANA timezone identifier

### YouTube Live URLs

For each city, you need a YouTube Live stream URL. The app automatically adds these parameters:
- `autoplay=1`: Starts playing automatically
- `mute=1`: Muted (required for autoplay)
- `controls=0`: Hides player controls
- `playsinline=1`: Plays inline on mobile
- `rel=0`: No related videos
- `modestbranding=1`: Minimal YouTube branding

### Weather API

The app fetches weather data from OpenWeatherMap with:
- **Cache**: 60-second cache per city to avoid excessive API calls
- **Units**: Metric (Celsius, km/h) - configurable via environment
- **Language**: Spanish by default - configurable via environment

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:

```env
OPENWEATHER_API_KEY=your_production_api_key
OPENWEATHER_UNITS=metric
OPENWEATHER_LANG=es
ROTATION_SECONDS=15
```

### Build Dependencies

The app includes all necessary build dependencies. For Vercel deployment, ensure:
- `autoprefixer` is in `devDependencies`
- All environment variables are configured

## Usage

### Automatic Mode
- Cities rotate automatically every 15 seconds
- Weather updates automatically for each city
- Smooth fade transitions between cities

### Automatic Operation
- Cities rotate automatically every 15 seconds
- No manual intervention required
- Perfect for unattended displays

### Fullscreen Mode
- Press F11 or use browser fullscreen
- Perfect for TV displays and digital signage

## Troubleshooting

### YouTube Autoplay Issues
- Ensure `mute=1` is in the URL
- Some browsers require user interaction before autoplay
- Check if the YouTube Live stream is actually live

### Weather Not Loading
- Verify your OpenWeatherMap API key
- Check browser console for errors
- Ensure the city query format is correct

### Performance Issues
- Reduce rotation frequency by increasing `ROTATION_SECONDS`
- Check if YouTube streams are high-quality
- Monitor memory usage in browser dev tools

## Customization

### Adding More Cities
1. Add city configuration to `config/cities.ts`
2. Find a YouTube Live stream for the city
3. Get the correct OpenWeatherMap query
4. Set the proper timezone

### Changing Rotation Speed
Edit `ROTATION_SECONDS` in `config/cities.ts` or set `ROTATION_SECONDS` environment variable.

### Styling
Modify `app/globals.css` to customize:
- Weather bar appearance
- Control button styles
- Animation timings
- Color schemes

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (desktop), limited autoplay (mobile)
- **Mobile**: Responsive design with touch-friendly controls

## License

MIT License - feel free to use and modify for your projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review browser console for errors
- Ensure all environment variables are set
- Verify YouTube Live streams are accessible
