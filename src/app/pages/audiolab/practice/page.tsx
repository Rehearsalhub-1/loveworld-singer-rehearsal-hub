"use client";

import { AudioLabProvider } from '../_context/AudioLabContext';
import { PracticeView } from '../_components/PracticeView';

export default function PracticePage() {
  return (
    <AudioLabProvider>
      <PracticeView />
    </AudioLabProvider>
  );
}
