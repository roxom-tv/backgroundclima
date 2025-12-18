import React from 'react';

export default function CalendarSlide() {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
      <iframe
        src="https://calendar-event-fc75.vercel.app/events"
        className="w-full h-full border-0"
        style={{ pointerEvents: 'none' }} // Opcional: si quieres evitar interacción directa o permitirla, quita esto. Dado que es un display, a veces es mejor bloquear. Pero si tiene scroll, mejor no. Lo dejaré interactivo por defecto quitando pointerEvents o dejándolo si es solo visual. Asumiré visual puro por ahora, pero sin bloquear por si acaso.
        allow="autoplay"
        title="Calendar Events"
      />
    </div>
  );
}

