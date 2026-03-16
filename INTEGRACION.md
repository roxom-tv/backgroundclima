# STRC Slide - Integración con backgroundclima

## Archivos

- `StrcSlide.tsx` → copiar a `backgroundclima/components/StrcSlide.tsx`

## Pasos

### 1. Copiar el componente

```bash
cp StrcSlide.tsx /path/to/backgroundclima/components/StrcSlide.tsx
```

### 2. Agregar el tipo 'strc' en `lib/supabase/types.ts`

```diff
- export type SlideType = 'youtube' | 'debt' | 'metals' | 'fx' | 'show' | 'event' | 'calendar' | 'news' | 'video';
+ export type SlideType = 'youtube' | 'debt' | 'metals' | 'fx' | 'show' | 'event' | 'calendar' | 'news' | 'video' | 'strc';
```

### 3. Agregar el case en `app/page.tsx`

Importar arriba:
```tsx
import StrcSlide from '@/components/StrcSlide';
```

En el `switch (currentSlide.type)` de `renderSlide()`, agregar antes del `default`:

```tsx
case 'strc':
  return (
    <motion.div
      key={`strc-${currentSlide.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.4 }
      }}
      className="h-full w-full bg-black relative"
      style={{ position: 'absolute', inset: 0 }}
    >
      <StrcSlide />
      {renderPositionedSponsors(currentSlide)}
    </motion.div>
  );
```

### 4. Agregar Fira Code/Sans fonts

En `app/layout.tsx` o `app/globals.css`, asegurar que las fonts estén cargadas:

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### 5. Configurar la URL del server STRC

En `.env.local` de backgroundclima:

```env
NEXT_PUBLIC_STRC_API_URL=http://192.168.1.14:3001
```

### 6. Crear el slide en Supabase

```sql
INSERT INTO slides (type, name, duration_seconds, order_index, is_active, show_weather, show_sponsor)
VALUES ('strc', 'STRC Dashboard', 30, 99, true, false, false);
```

Ajustar `order_index` y `duration_seconds` a gusto.

### 7. Asegurar que el server STRC esté corriendo

```bash
cd ~/Documents/strc && node server.js
```

El componente hace fetch a `{STRC_API_URL}/api/data` cada 15 segundos.

## Requisitos

- Server STRC corriendo en la misma red (Express en puerto 3001)
- backgroundclima con acceso al server (mismo LAN o CORS configurado)

## CORS

Si el server STRC y backgroundclima corren en distintos orígenes, agregar en `server.js` de STRC:

```js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
```
