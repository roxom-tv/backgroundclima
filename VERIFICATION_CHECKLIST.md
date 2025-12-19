# Checklist de Verificación - Funcionalidades CRUD de Slides

## ✅ Tipos de Slides Soportados

### 1. YouTube Slides
- ✅ Crear: Formulario con campos (URL, país, weather query, timezone)
- ✅ Editar: Conversión automática de URL normal a embed
- ✅ Eliminar: Funcional con refresh automático
- ✅ Duplicar: Funcional
- ✅ Campos: `youtube_url`, `country`, `weather_query`, `timezone`, `show_weather`

### 2. Show Slides
- ✅ Crear: Formulario completo con todos los campos
- ✅ Editar: Todos los campos editables
- ✅ Eliminar: Funcional
- ✅ Duplicar: Funcional
- ✅ Campos: `host_name`, `image_url`, `show_days`, `schedule_times`, `sponsor_id`

### 3. Event Slides
- ✅ Crear: Selección de eventos (1-4 eventos)
- ✅ Editar: Cambiar eventos seleccionados
- ✅ Eliminar: Funcional
- ✅ Duplicar: Funcional
- ✅ Campos: `selected_event_ids`, `layout_orientation` (para 3 eventos)
- ✅ Validación: Máximo 4 eventos, layout solo para 3 eventos

### 4. News Slides
- ✅ Crear: Formulario con imagen, headline, source, description
- ✅ Editar: Todos los campos editables
- ✅ Eliminar: Funcional
- ✅ Duplicar: Funcional
- ✅ Campos: `image_url`, `headline` (requerido), `source`, `description`
- ✅ Upload: Soporte para subir imágenes

### 5. Video Slides
- ✅ Crear: Formulario con URL de video y loop count
- ✅ Editar: Todos los campos editables
- ✅ Eliminar: Funcional
- ✅ Duplicar: Funcional
- ✅ Campos: `video_url` (requerido), `loop_count` (null = infinito, 1 = una vez, N = N veces)

## ✅ Operaciones CRUD

### CREATE (Crear)
- ✅ Formulario modal funcional
- ✅ Validación de campos requeridos
- ✅ Conversión automática de YouTube URLs
- ✅ Upload de imágenes para News y Show slides
- ✅ Selección de eventos para Event slides
- ✅ Refresh automático después de crear

### READ (Leer/Ver)
- ✅ Lista de slides con scroll vertical
- ✅ Filtros: All / Active / Inactive
- ✅ Drag & Drop para reordenar
- ✅ Vista previa de información por tipo
- ✅ Indicadores visuales (activo/inactivo, tipo)

### UPDATE (Actualizar)
- ✅ Edición de slides existentes
- ✅ Formulario pre-poblado con datos actuales
- ✅ Conversión de YouTube URLs al editar
- ✅ Conversión de embed URLs a URLs simples para edición
- ✅ Refresh automático después de actualizar
- ✅ Manejo de errores con mensajes claros

### DELETE (Eliminar)
- ✅ Confirmación antes de eliminar
- ✅ Eliminación funcional
- ✅ Refresh automático después de eliminar
- ✅ Notificación de éxito/error

### DUPLICATE (Duplicar)
- ✅ Duplicación funcional
- ✅ Nombre automático con "(copy)"
- ✅ Refresh después de duplicar

## ✅ Funcionalidades Adicionales

### Reordenamiento
- ✅ Drag & Drop funcional
- ✅ Actualización de `order_index` en base de datos
- ✅ Soporte para filtros activos

### Toggle Active/Inactive
- ✅ Botón para activar/desactivar slides
- ✅ Actualización inmediata en base de datos
- ✅ Indicadores visuales

### Validaciones
- ✅ Campos requeridos marcados con *
- ✅ Validación de tipos de datos
- ✅ Validación de rangos (loop_count, etc.)
- ✅ Validación de selección de eventos (máximo 4)

### Conversión de URLs
- ✅ YouTube: Cualquier formato → Embed automático
- ✅ YouTube: Embed → URL simple para edición
- ✅ Parámetros optimizados para background display

## ✅ Campos Comunes

Todos los tipos de slides tienen:
- ✅ `name` (requerido)
- ✅ `type` (requerido)
- ✅ `duration_seconds` (requerido)
- ✅ `is_active` (checkbox)
- ✅ `show_sponsor` (checkbox)
- ✅ `sponsor_id` (selector, solo si show_sponsor = true)

## 🔍 Verificaciones Pendientes

1. **Ejecutar migración de columnas faltantes:**
   - Ejecutar `019_add_missing_columns.sql` en Supabase
   - Verificar que `video_url` y `loop_count` existan

2. **Verificar RLS Policies:**
   - Ejecutar scripts de RLS (016_fix_rls_policies.sql o partes)
   - Verificar con script 017_verify_rls_policies.sql

3. **Probar en producción:**
   - Crear slide de cada tipo
   - Editar slide de cada tipo
   - Eliminar slide de cada tipo
   - Duplicar slide de cada tipo
   - Reordenar slides
   - Toggle active/inactive

## 📝 Notas

- Los cambios se refrescan automáticamente después de crear/actualizar/eliminar
- Las URLs de YouTube se convierten automáticamente al guardar
- Los eventos deben crearse primero en `/admin/events` antes de usarlos en slides
- Los sponsors deben crearse primero en `/admin/sponsors` antes de asignarlos
