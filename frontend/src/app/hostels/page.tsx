'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-auth';
import { 
  Search, Bed, MapPin, LogOut, RefreshCw, Compass, ArrowRight,
  Wifi, Coffee, Shield, Check, Globe, Phone, Mail, Sparkles, ChevronDown
} from 'lucide-react';

export default function HostelsSearch() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // API Data States
  const [localHostels, setLocalHostels] = useState<any[]>([]);
  const [osmHostels, setOsmHostels] = useState<any[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'MAD' | 'INR' | 'EUR' | 'USD'>('MAD');

  // Fetch real Moroccan hostels from Overpass API (OpenStreetMap)
  const fetchOverpassHostels = useCallback(async () => {
    setLoadingOsm(true);
    try {
      // Bounding box covering Morocco: (south,west,north,east)
      const overpassQuery = `[out:json][timeout:30];
(
  node["tourism"="hostel"](27.6,-13.2,35.9,-1.0);
  node["tourism"="hotel"](27.6,-13.2,35.9,-1.0);
  node["tourism"="guest_house"](27.6,-13.2,35.9,-1.0);
);
out body 40;`;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(overpassQuery),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Roomify/1.0 (student project)'
        }
      });

      if (!response.ok) throw new Error('Overpass API indisponible');

      const data = await response.json();
      const elements: any[] = data.elements || [];

      // Map OSM elements to hostel objects
      const osmMapped = elements
        .filter((el: any) => el.tags && el.tags.name)
        .map((el: any) => {
          const tags = el.tags;
          // Clean city name (remove Arabic/Tamazight scripts)
          const rawCity = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
          const city = rawCity.split(' ')[0].replace(/[^a-zA-ZÀ-ÿ\s\-]/g, '').trim() || 'Maroc';
          
          // Filter out cities outside Morocco by checking bounding box context roughly
          const finalCity = ['paris', 'london', 'madrid'].includes(city.toLowerCase()) ? 'Maroc' : city;
          const address = tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}, ${finalCity}`.trim() : finalCity;

          return {
            id: `osm-${el.id}`,
            name: tags.name,
            city: finalCity,
            address: address,
            website: tags.website || tags['contact:website'] || null,
            phone: tags.phone || tags['contact:phone'] || null,
            email: tags.email || tags['contact:email'] || null,
            lat: el.lat,
            lon: el.lon,
            description: `Vrai établissement marocain situé à ${finalCity}. Données réelles fournies en direct d'OpenStreetMap.`,
            isExternal: true,
            source: 'OpenStreetMap'
          };
        });

      setOsmHostels(osmMapped);
    } catch (err: any) {
      console.warn('Overpass error:', err.message);
    } finally {
      setLoadingOsm(false);
    }
  }, []);

  // Fetch Hostels on load: Local + External (OSM)
  useEffect(() => {
    const fetchLocalData = async () => {
      setLoadingLocal(true);
      try {
        if (!isAuthenticated) {
          setLoadingLocal(false);
          return;
        }
        const res = await api.get('/hostels');
        setLocalHostels(res.data.hostels || []);
      } catch (err: any) {
        console.error('Fetch local error:', err);
        setErrorMsg('Impossible de charger les hôtels de la base de données locale.');
      } finally {
        setLoadingLocal(false);
      }
    };

    fetchLocalData();
    fetchOverpassHostels();
  }, [fetchOverpassHostels, isAuthenticated]);

  // Merge local and OSM hostels (deduplicate by name)
  const allHostels = useMemo(() => {
    const mergedList = [...localHostels];
    const localNames = new Set(localHostels.map(h => h.name.toLowerCase().trim()));

    osmHostels.forEach(h => {
      if (!localNames.has(h.name.toLowerCase().trim())) {
        mergedList.push(h);
      }
    });

    return mergedList;
  }, [localHostels, osmHostels]);

  // Extract unique cities for the filter dropdown
  const uniqueCities = useMemo(() => {
    const citiesSet = new Set<string>();
    allHostels.forEach(h => {
      if (h.city) {
        citiesSet.add(h.city);
      }
    });
    return Array.from(citiesSet).sort();
  }, [allHostels]);

  // Client-side search and filtering
  const filteredHostels = useMemo(() => {
    return allHostels.filter(hostel => {
      // 1. Text Search Filter (name, city, address)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = hostel.name.toLowerCase().includes(query);
        const matchesCity = hostel.city.toLowerCase().includes(query);
        const matchesAddress = hostel.address.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesAddress) {
          return false;
        }
      }

      // 2. City Filter
      if (selectedCity && hostel.city !== selectedCity) {
        return false;
      }

      return true;
    });
  }, [allHostels, searchQuery, selectedCity]);

  // Hashed images to assign realistic covers deterministically based on hotel name
  const getHostelImageUrl = (name: string, index: number) => {
    const hostelPhotos = [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80', // Marrakech riad style
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80', // Rabat surf style
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80', // Fez authentic patio
      'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=600&q=80', // Essaouira ocean style
      'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80'  // Blue Chefchaouen style
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hostelPhotos[Math.abs(hash) % hostelPhotos.length];
  };

  // Determine standard tags to display on the card based on hotel characteristics
  const getHostelAmenities = (name: string) => {
    const nameLower = name.toLowerCase();
    const tags = ['Wifi'];

    if (nameLower.includes('surf') || nameLower.includes('beach')) {
      tags.push('Laundry', 'Surf School');
    } else if (nameLower.includes('riad') || nameLower.includes('medina')) {
      tags.push('Breakfast', 'Security');
    } else {
      tags.push('Lounge', 'Security');
    }
    return tags;
  };

  return (
    <div className="flex-1 bg-[#030712] text-[#f3f4f6] flex flex-col min-h-screen relative font-sans overflow-x-hidden">
      {/* Background Grains / Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none"></div>

      {/* Header / Navbar matches Roomify */}
      <header className="w-full border-b border-[#1f2937]/60 bg-[#030712]/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-600/10 flex items-center justify-center">
              <Bed size={20} />
            </span>
            <span className="font-heading font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-[#cbd5e1] bg-clip-text text-transparent">
              Hostel<span className="text-cyan-400">Hub</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link href="/hostels" className="text-white hover:text-white transition-colors relative after:content-[''] after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-0.5 after:bg-cyan-500 after:rounded-full">Hostels</Link>
            <Link href="/rooms" className="text-zinc-400 hover:text-white transition-colors">Rooms</Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all">
                  Dashboard
                </Link>
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
                  title="Se déconnecter"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="text-xs font-bold text-zinc-300 hover:text-white px-3 py-2 transition-colors">
                  Connexion
                </Link>
                <Link href="/auth/register" className="text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-cyan-600/20">
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Browse Panel */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col gap-8 w-full relative z-10">
        
        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent font-heading">
            Explore <span className="text-cyan-400">Hostels</span>
          </h1>
          <p className="text-sm text-zinc-400">Find verified hostels with top amenities across major cities</p>
        </div>

        {/* Filter Controls Row matches Screenshot 1 */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-between items-center bg-zinc-900/20 p-4 border border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute inset-y-0 left-4 my-auto text-zinc-500" />
            <input
              type="text"
              placeholder="Search hostels..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#030712] border border-zinc-800 focus:border-cyan-500 rounded-xl text-sm placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 text-zinc-100"
            />
          </div>
          
          <div className="relative w-full sm:w-56 shrink-0">
            <MapPin size={16} className="absolute inset-y-0 left-4 my-auto text-zinc-500" />
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full pl-11 pr-8 py-3 bg-[#030712] border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-200 outline-none transition-all cursor-pointer focus:ring-1 focus:ring-cyan-500/30 appearance-none"
            >
              <option value="">All Cities</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 inset-y-0 my-auto text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <MapPin size={16} /> {errorMsg}
          </div>
        )}

        {/* Content Loading & Listing */}
        {(loadingLocal || loadingOsm) && allHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs text-zinc-500 font-medium">Recherche d'auberges marocaines réelles (Locales + OSM)...</span>
          </div>
        ) : filteredHostels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {filteredHostels.map((hostel, index) => {
              const amenities = getHostelAmenities(hostel.name);

              return (
                <div 
                  key={hostel.id}
                  className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-600/2 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  {/* Card Image */}
                  <div className="relative w-full h-48 bg-zinc-950 overflow-hidden">
                    <img 
                      src={getHostelImageUrl(hostel.name, index)} 
                      alt={hostel.name} 
                      className="w-full h-full object-cover opacity-75 group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
                    
                    {/* Top-Right Badge: OSM vs Local */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-full uppercase tracking-wider border backdrop-blur-md ${
                        hostel.isExternal
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {hostel.isExternal ? 'OSM' : 'Verified'}
                      </span>
                    </div>

                    {/* Bottom-Left City Badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className="px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/50 text-zinc-300 text-[9px] font-extrabold rounded-full uppercase tracking-wide backdrop-blur-md">
                        {hostel.city}
                      </span>
                    </div>
                  </div>

                  {/* Card Body content */}
                  <div className="p-5 flex flex-col justify-between flex-1 gap-5 bg-zinc-900/10">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-heading font-bold text-base text-zinc-100 group-hover:text-cyan-400 transition-colors leading-tight">
                        {hostel.name}
                      </h3>
                      
                      <div className="flex items-start gap-1.5 text-xs text-zinc-400 mt-1">
                        <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{hostel.address}</span>
                      </div>

                      {/* Amenities Row matches screenshot tags */}
                      <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-zinc-400">
                        {amenities.includes('Wifi') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Wifi size={11} className="text-cyan-400" /> Wifi
                          </span>
                        )}
                        {amenities.includes('Breakfast') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Coffee size={11} className="text-cyan-400" /> Breakfast
                          </span>
                        )}
                        {amenities.includes('Laundry') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Compass size={11} className="text-cyan-400" /> Laundry
                          </span>
                        )}
                        {amenities.includes('Surf School') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Compass size={11} className="text-cyan-400" /> Surf School
                          </span>
                        )}
                        {amenities.includes('Security') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Shield size={11} className="text-cyan-400" /> Security
                          </span>
                        )}
                        {amenities.includes('Lounge') && (
                          <span className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 rounded-lg bg-zinc-900/60 font-medium">
                            <Coffee size={11} className="text-cyan-400" /> Lounge
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View Rooms trigger link */}
                    <Link 
                      href={`/rooms?hostelId=${hostel.id}`}
                      className="border-t border-zinc-850 pt-4 flex items-center justify-center gap-1.5 text-xs font-extrabold text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer group/btn"
                    >
                      View Rooms 
                      <ArrowRight size={13} className="transform group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}

          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            <span className="text-xs text-zinc-500 font-medium">Aucun établissement ne correspond aux critères.</span>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-zinc-900 bg-[#030712] mt-auto text-center relative z-10">
        <p className="text-[11px] text-zinc-600">
          &copy; 2026 Roomify Management System. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
