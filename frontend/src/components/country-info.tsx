'use client';

import { useState, useEffect } from 'react';

interface CountryData {
  flag: string;
  name: string;
  currency: string;
  timezone: string;
}

interface CountryInfoProps {
  countryName: string;
}

export default function CountryInfo({ countryName }: CountryInfoProps) {
  const [country, setCountry] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryName) return;

    const searchTerms = ['morocco', 'maroc'];
    const term = searchTerms.find(t => countryName.toLowerCase().includes(t)) || countryName;

    fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(term)}?fields=name,flags,currencies,timezones`)
      .then(r => r.json())
      .then(data => {
        const c = Array.isArray(data) ? data[0] : data;
        if (c?.flags) {
          const currencyCode = c.currencies ? Object.keys(c.currencies)[0] : '';
          setCountry({
            flag: c.flags.svg || c.flags.png,
            name: c.name?.common || term,
            currency: currencyCode,
            timezone: c.timezones?.[0] || ''
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [countryName]);

  if (loading) {
    return (
      <div className="w-5 h-5 rounded-full bg-[#151b28] animate-pulse" />
    );
  }

  if (!country) return null;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <img src={country.flag} alt={country.name} className="w-5 h-4 rounded object-cover shadow-sm" />
      <span className="font-medium text-[#e8edf5]">{country.name}</span>
      {country.currency && (
        <span className="text-cyan-400 font-bold text-[10px] uppercase">{country.currency}</span>
      )}
      {country.timezone && (
        <span className="text-[#5a6478] text-[9px]">{country.timezone}</span>
      )}
    </div>
  );
}
