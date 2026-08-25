import React from 'react';
import Image from 'next/image';

interface PraiseNightBannerProps {
  ecardSrc: string;
}

export const PraiseNightBanner: React.FC<PraiseNightBannerProps> = ({ ecardSrc }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-2 sm:mb-3 max-w-md sm:max-w-lg mx-auto shadow-2xl shadow-black/20 ring-1 ring-black/5 breathe-animation">
      <div className="relative h-35 sm:h-43 md:h-51">
        <Image
          src={ecardSrc}
          alt="Praise Night E-card"
          fill
          unoptimized={true}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
          className="object-cover object-center"
          priority
          onError={(e) => {
            console.error('Image failed to load:', ecardSrc);
            e.currentTarget.src = "/Ecards/1000876785.png";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>
    </div>
  );
};
