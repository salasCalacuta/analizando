import React from 'react';

export const Logo = () => (
  <img 
    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-2025-glitch-red-777.jpg" 
    alt="Analizandome Logo" 
    className="h-8 w-8 object-contain"
    referrerPolicy="no-referrer"
    onError={(e) => {
      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=Logo';
    }}
  />
);
