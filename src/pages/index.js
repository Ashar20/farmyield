import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Head from 'next/head';

// Dynamically import the LandMapCanvas component with SSR disabled
const LandMapCanvas = dynamic(
  () => import('../components/LandMapCanvas'),
  { ssr: false, loading: () => <div>Loading map...</div> }
);

export default function Home() {
  return (
    <>
      <Head>
        <title>Land Map</title>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          html, body, #__next {
            width: 100%;
            height: 100%;
          }
        `}</style>
      </Head>
      <Suspense fallback={<div>Loading map...</div>}>
        <LandMapCanvas />
      </Suspense>
    </>
  );
} 