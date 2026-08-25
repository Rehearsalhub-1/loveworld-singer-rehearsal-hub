"use client";

import { AudioLabProvider } from '../_context/AudioLabContext';
import { WarmUpView } from '../_components/WarmUpView';

export default function WarmUpPage() {
  return (
    <AudioLabProvider>
      <WarmUpView />
    </AudioLabProvider>
  );
}
