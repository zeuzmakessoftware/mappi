// app/map/page.tsx
"use client";

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function MapPage() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map />
    </div>
  );
}