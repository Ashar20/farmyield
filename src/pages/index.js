import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the LandMapCanvas component with SSR disabled
const LandMapCanvas = dynamic(
  () => import('../components/LandMapCanvas'),
  { ssr: false, loading: () => <div>Loading map...</div> }
);

export default function Home() {
  return (
    <div className="container">
      <main>
        <h1>Land Map Viewer</h1>
        <div className="map-container">
          <Suspense fallback={<div>Loading map...</div>}>
            <LandMapCanvas />
          </Suspense>
        </div>
      </main>
      
      <style jsx>{`
        .container {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        main {
          width: 100%;
          max-width: 800px;
        }
        h1 {
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .map-container {
          display: flex;
          justify-content: center;
          overflow: auto;
          max-width: 100%;
          max-height: 80vh;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
} 