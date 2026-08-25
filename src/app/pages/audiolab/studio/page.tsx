"use client";

import { AudioLabProvider } from '../_context/AudioLabContext';
import { StudioView } from '../_components/StudioView';

export default function StudioPage() {
  return (
    <AudioLabProvider>
      <StudioView />
    </AudioLabProvider>
  );
}
