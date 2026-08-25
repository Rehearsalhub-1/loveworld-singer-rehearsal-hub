"use client";

import { AudioLabProvider } from '../_context/AudioLabContext';
import { LibraryView } from '../_components/LibraryView';

export default function LibraryPage() {
  return (
    <AudioLabProvider>
      <LibraryView />
    </AudioLabProvider>
  );
}
