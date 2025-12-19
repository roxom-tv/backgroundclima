# Vercel Deployment Guide

## Required Environment Variables

Configure the following environment variables in your Vercel project settings:

### Supabase Configuration (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### OpenWeatherMap API (Optional - for weather slides)
```
OPENWEATHER_API_KEY=your-openweather-api-key
OPENWEATHER_UNITS=metric
OPENWEATHER_LANG=en
```

### Market Data APIs (Optional - for metals/FX slides)
```
METALS_API_URL=https://api.metals.dev
METALS_API_KEY=your-metals-api-key
OIL_API_URL=https://api.oilpriceapi.com/v1/prices/latest
OIL_API_KEY=your-oil-api-key
FX_API_URL=https://api.exchangerate.host/latest
FX_API_KEY=your-fx-api-key
```

## How to Configure in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above with its corresponding value
4. Make sure to add them for **Production**, **Preview**, and **Development** environments
5. Redeploy your application after adding variables

## Common Issues

### 404 Error on Admin Pages
- **Cause**: Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Solution**: Add these environment variables in Vercel and redeploy

### Application Error
- **Cause**: Client-side exception due to missing environment variables
- **Solution**: Check browser console for specific error, ensure all required variables are set

### Build Errors
- **Cause**: TypeScript errors or missing dependencies
- **Solution**: Run `npm run build` locally to check for errors before deploying

## Verification

After deployment, check:
1. Main page loads: `https://your-app.vercel.app/`
2. Admin login works: `https://your-app.vercel.app/admin/login`
3. Settings page loads: `https://your-app.vercel.app/admin/settings`

If any page shows a 404 or error, check:
- Environment variables are set correctly
- Browser console for specific error messages
- Vercel deployment logs for build/runtime errors
