"use client";

import { AudioLabProvider } from '../_context/AudioLabContext';
import { KaraokeView } from '../_components/KaraokeView';

export default function KaraokePage() {
  return (
    <AudioLabProvider>
      <KaraokeView />
    </AudioLabProvider>
  );
}
