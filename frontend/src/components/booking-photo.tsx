'use client';

import { useState, useEffect } from 'react';

const UNSPLASH_ACCESS_KEY = 'YOUR_FREE_UNSPLASH_KEY';

interface BookingPhotoProps {
  query: string;
  className?: string;
}

export default function BookingPhoto({ query, className = '' }: BookingPhotoProps) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchQuery = encodeURIComponent(`${query} hostel hotel`);
    setLoading(true);

    fetch(
      `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    )
      .then(r => r.json())
      .then(data => {
        if (data?.results?.[0]?.urls?.regular) {
          setPhotoUrl(data.results[0].urls.regular);
        } else {
          setPhotoUrl('');
        }
      })
      .catch(() => setPhotoUrl(''))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) {
    return (
      <div className={`${className} bg-[#0d1117] animate-pulse rounded-xl flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!photoUrl) {
    return (
      <div className={`${className} bg-gradient-to-br from-[#0d1117] to-[#151b28] rounded-xl flex items-center justify-center`}>
        <span className="text-[10px] text-[#5a6478]">📷 ${query}</span>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={query}
      className={`${className} object-cover rounded-xl`}
    />
  );
}
