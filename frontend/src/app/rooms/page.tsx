'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, UnauthorizedError } from '../../lib/api';
import { cacheOverpassFailure, getCachedOverpassData } from '../../lib/overpass-cache';
import { useAuth } from '../../hooks/use-auth';
import { 
  Search, Bed, MapPin, Users, LogOut, SlidersHorizontal, Sun, Moon, 
  ChevronDown, Check, Info, CreditCard, X, ChevronRight, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';

function RoomsSearchContent() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read query params
  const urlHostelId = searchParams.get('hostelId') || '';

  // API Data States
  const [localHostels, setLocalHostels] = useState<any[]>([]);
  const [osmHostels, setOsmHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState(urlHostelId);
  const [selectedType, setSelectedType] = useState(''); // "DORM" or "PRIVATE"
  const [selectedGender, setSelectedGender] = useState(''); // "MALE", "FEMALE", "MIXED"
  const [priceRange, setPriceRange] = useState(1500); // Price limit per night
  const [availableOnly, setAvailableOnly] = useState(false);

  // Currency Converter States
  const [selectedCurrency, setSelectedCurrency] = useState<'MAD' | 'INR' | 'EUR' | 'USD'>('MAD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    EUR: 1.0,
    MAD: 11.0,  // 1 EUR = 11 MAD
    INR: 90.0,  // 1 EUR = 90 INR
    USD: 1.08   // 1 EUR = 1.08 USD
  });

  // Modal States
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<any | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<any | null>(null);

  // Booking Form States (inside modal)
  const [checkInDate, setCheckInDate] = useState('2026-06-20');
  const [checkOutDate, setCheckOutDate] = useState('2026-06-25');
  const [bookingLoading, setBookingLoading] = useState(false);

  // AI Recommendation Drawer/Collapsible States
  const [aiPreferences, setAiPreferences] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Sync state if query parameter updates
  useEffect(() => {
    if (urlHostelId) {
      setSelectedHostel(urlHostelId);
    }
  }, [urlHostelId]);

  // Fetch external OSM hostels to resolve info
  const fetchOverpassHostels = useCallback(async () => {
    try {
      const overpassQuery = `[out:json][timeout:30];
(
  node["tourism"="hostel"](27.6,-13.2,35.9,-1.0);
  node["tourism"="hotel"](27.6,-13.2,35.9,-1.0);
  node["tourism"="guest_house"](27.6,-13.2,35.9,-1.0);
);
out body 40;`;

      const data = await getCachedOverpassData(async () => {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: 'data=' + encodeURIComponent(overpassQuery),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Roomify/1.0 (student project)'
          }
        });

        if (!response.ok) throw new Error('Overpass API indisponible');
        return response.json();
      });

      if (!data) {
        setOsmHostels([]);
        return;
      }

      const elements: any[] = data.elements || [];

      const osmMapped = elements
        .filter((el: any) => el.tags && el.tags.name)
        .map((el: any) => {
          const tags = el.tags;
          const rawCity = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
          const city = rawCity.split(' ')[0].replace(/[^a-zA-ZÀ-ÿ\s\-]/g, '').trim() || 'Maroc';
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
      console.warn('Overpass error on rooms page:', err.message);
      cacheOverpassFailure();
    }
  }, []);

  // Fetch Hostels and Rooms on load
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMsg('');
      try {
        const [hostelsRes, roomsRes] = await Promise.all([
          api.get('/hostels'),
          api.get('/rooms')
        ]);
        if (!isMounted) return;
        setLocalHostels(hostelsRes.data.hostels || []);
        setRooms(roomsRes.data.rooms || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Fetch error:', err);
        if (err instanceof UnauthorizedError) {
          setErrorMsg(err.message);
          logout();
          router.push('/auth/login');
          return;
        }

        setErrorMsg(err.message || 'Impossible de récupérer les données du serveur local.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchOverpassHostels();
    return () => {
      isMounted = false;
    };
  }, [fetchOverpassHostels, isAuthenticated]);

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=MAD,USD,INR');
        const data = await res.json();
        if (data && data.rates) {
          setExchangeRates({
            EUR: 1.0,
            MAD: data.rates.MAD || 11.0,
            USD: data.rates.USD || 1.08,
            INR: data.rates.INR || 90.0
          });
        }
      } catch (err) {
        console.error('Failed to fetch exchange rates, using defaults:', err);
      }
    };
    fetchRates();
  }, []);

  // Consolidated Hostels list
  const hostels = useMemo(() => {
    const mergedList = [...localHostels];
    const localNames = new Set(localHostels.map(h => h.name.toLowerCase().trim()));
    osmHostels.forEach(h => {
      if (!localNames.has(h.name.toLowerCase().trim())) {
        mergedList.push(h);
      }
    });
    return mergedList;
  }, [localHostels, osmHostels]);

  // Deterministic Mock rooms generation for OSM hostels
  const extRooms = useMemo(() => {
    const selectedHostelObj = hostels.find(h => h.id === selectedHostel);
    if (!selectedHostelObj || !selectedHostelObj.isExternal) return [];

    return [
      {
        id: `mock-ext-${selectedHostelObj.id}-1`,
        roomNumber: '201',
        floor: 2,
        type: 'DORM_FEMALE',
        pricePerNight: 12.00, // ~132 MAD /night (~4,000 MAD/month)
        amenities: ['WiFi', 'Air Conditioning', 'Reading Lamp', 'Individual Lockers'],
        hostelId: selectedHostelObj.id,
        hostel: selectedHostelObj,
        beds: Array.from({ length: 10 }).map((_, i) => ({
          id: `bed-${selectedHostelObj.id}-1-${i}`,
          bedNumber: `Bed ${i + 1}`,
          status: i === 0 ? 'OCCUPIED' : 'AVAILABLE' // 9 of 10 spots available
        }))
      },
      {
        id: `mock-ext-${selectedHostelObj.id}-2`,
        roomNumber: '202',
        floor: 2,
        type: 'DORM_MALE',
        pricePerNight: 15.00, // ~165 MAD /night (~5,000 MAD/month)
        amenities: ['WiFi', 'Air Conditioning', 'Individual Lockers'],
        hostelId: selectedHostelObj.id,
        hostel: selectedHostelObj,
        beds: Array.from({ length: 2 }).map((_, i) => ({
          id: `bed-${selectedHostelObj.id}-2-${i}`,
          bedNumber: `Bed ${i + 1}`,
          status: 'OCCUPIED' // 0 of 2 spots (Full)
        }))
      },
      {
        id: `mock-ext-${selectedHostelObj.id}-3`,
        roomNumber: '205',
        floor: 2,
        type: 'PRIVATE_ROOM',
        pricePerNight: 21.00, // ~230 MAD /night (~6,998 MAD/month)
        amenities: ['WiFi', 'Queen Size Bed', 'Private Bathroom', 'Towels Included'],
        hostelId: selectedHostelObj.id,
        hostel: selectedHostelObj,
        beds: Array.from({ length: 1 }).map((_, i) => ({
          id: `bed-${selectedHostelObj.id}-3-${i}`,
          bedNumber: 'Double Bed',
          status: 'OCCUPIED' // 0 of 1 spots (Full)
        }))
      }
    ];
  }, [selectedHostel, hostels]);

  // Target rooms pool to query (injects external rooms if OSM hostel is selected, otherwise uses local database rooms)
  const roomsPool = useMemo(() => {
    const selectedHostelObj = hostels.find(h => h.id === selectedHostel);
    if (selectedHostelObj && selectedHostelObj.isExternal) {
      return extRooms;
    }
    // If no hostel is selected, merge local rooms and generated external rooms for all OSM hostels to make it look full
    if (!selectedHostel) {
      let mergedRooms = [...rooms];
      // Generate mock rooms for a few OSM hostels to populate the search nicely when nothing is selected
      const sampleOsm = osmHostels.slice(0, 3);
      sampleOsm.forEach(oh => {
        const mockList = [
          {
            id: `mock-ext-${oh.id}-1`,
            roomNumber: '201',
            floor: 2,
            type: 'DORM_FEMALE',
            pricePerNight: 12.00,
            amenities: ['WiFi', 'Air Conditioning', 'Reading Lamp', 'Individual Lockers'],
            hostelId: oh.id,
            hostel: oh,
            beds: Array.from({ length: 10 }).map((_, i) => ({
              id: `bed-${oh.id}-1-${i}`,
              bedNumber: `Bed ${i + 1}`,
              status: i === 0 ? 'OCCUPIED' : 'AVAILABLE'
            }))
          },
          {
            id: `mock-ext-${oh.id}-2`,
            roomNumber: '202',
            floor: 2,
            type: 'DORM_MALE',
            pricePerNight: 15.00,
            amenities: ['WiFi', 'Air Conditioning', 'Individual Lockers'],
            hostelId: oh.id,
            hostel: oh,
            beds: Array.from({ length: 2 }).map((_, i) => ({
              id: `bed-${oh.id}-2-${i}`,
              bedNumber: `Bed ${i + 1}`,
              status: 'OCCUPIED'
            }))
          }
        ];
        mergedRooms = [...mergedRooms, ...mockList];
      });
      return mergedRooms;
    }
    return rooms;
  }, [rooms, extRooms, selectedHostel, hostels, osmHostels]);

  // Helper to format price to selected currency (displays monthly rate)
  const formatMonthlyPrice = (pricePerNightInEur: number | string) => {
    const dailyPriceEur = typeof pricePerNightInEur === 'string' ? parseFloat(pricePerNightInEur) : pricePerNightInEur;
    if (isNaN(dailyPriceEur)) return '';

    const monthlyPriceInEur = dailyPriceEur * 30;
    const converted = monthlyPriceInEur * exchangeRates[selectedCurrency];

    const symbols = {
      MAD: 'MAD',
      INR: '₹',
      EUR: '€',
      USD: '$'
    };

    const formatted = converted.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return selectedCurrency === 'INR' || selectedCurrency === 'USD'
      ? `${symbols[selectedCurrency]}${formatted}`
      : `${formatted} ${symbols[selectedCurrency]}`;
  };

  const formatDailyPrice = (pricePerNightInEur: number) => {
    const converted = pricePerNightInEur * exchangeRates[selectedCurrency];
    const symbols = {
      MAD: 'MAD',
      INR: '₹',
      EUR: '€',
      USD: '$'
    };
    const formatted = converted.toFixed(1);
    return selectedCurrency === 'INR' || selectedCurrency === 'USD'
      ? `${symbols[selectedCurrency]}${formatted}`
      : `${formatted} ${symbols[selectedCurrency]}`;
  };

  const getRoomImageUrl = (hostelCity: string, roomType: string, index: number) => {
    const privateRoomPhotos = [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'
    ];
    
    const dormRoomPhotos = [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1623625409419-f7027670783a?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=600&q=80'
    ];

    const pool = roomType === 'PRIVATE_ROOM' ? privateRoomPhotos : dormRoomPhotos;
    return pool[index % pool.length];
  };

  // Client-Side Search and Filtering Logic
  const filteredRooms = useMemo(() => {
    return roomsPool.filter(room => {
      // 1. Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesRoomNumber = room.roomNumber.toLowerCase().includes(query);
        const matchesHostelName = room.hostel.name.toLowerCase().includes(query);
        const matchesHostelCity = room.hostel.city.toLowerCase().includes(query);
        const matchesAmenities = room.amenities.some((am: string) => am.toLowerCase().includes(query));
        
        if (!matchesRoomNumber && !matchesHostelName && !matchesHostelCity && !matchesAmenities) {
          return false;
        }
      }

      // 2. Hostel Filter
      if (selectedHostel && room.hostelId !== selectedHostel) {
        return false;
      }

      // 3. Room Type Filter
      if (selectedType) {
        if (selectedType === 'DORM' && !room.type.startsWith('DORM_')) {
          return false;
        }
        if (selectedType === 'PRIVATE' && room.type !== 'PRIVATE_ROOM') {
          return false;
        }
      }

      // 4. Gender Filter
      if (selectedGender) {
        if (selectedGender === 'MALE' && room.type !== 'DORM_MALE') return false;
        if (selectedGender === 'FEMALE' && room.type !== 'DORM_FEMALE') return false;
        if (selectedGender === 'MIXED' && room.type !== 'DORM_MIXED') return false;
      }

      // 5. Price Range Filter (per night)
      const roomDailyPrice = Number(room.pricePerNight) * exchangeRates[selectedCurrency];
      if (roomDailyPrice > priceRange) {
        return false;
      }

      // 6. Available Only Filter
      if (availableOnly) {
        const availableBeds = room.beds?.filter((b: any) => b.status === 'AVAILABLE').length || 0;
        if (availableBeds === 0) {
          return false;
        }
      }

      return true;
    });
  }, [roomsPool, searchQuery, selectedHostel, selectedType, selectedGender, priceRange, availableOnly, selectedCurrency, exchangeRates]);

  // Handle Book Now Click
  const handleBookNowClick = (room: any) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    setSelectedRoomForBooking(room);
  };

  // Handle Booking Submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) return;

    setBookingLoading(true);
    setErrorMsg('');

    // Check if it's a mock room for external hostel
    if (selectedRoomForBooking.id.startsWith('mock-ext-')) {
      await new Promise(resolve => setTimeout(resolve, 800)); // simulate loader
      const days = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
      const total = selectedRoomForBooking.pricePerNight * days * exchangeRates[selectedCurrency];
      const invoice = `INV-EXT-${Math.floor(1000 + Math.random() * 9000)}`;
      const params = new URLSearchParams({
        paymentId: `mock-pay-${Math.random()}`,
        bookingId: invoice,
        amount: total.toFixed(2),
        invoiceNumber: invoice,
        hostelName: selectedRoomForBooking.hostel.name,
        hostelCity: selectedRoomForBooking.hostel.city,
        hostelAddress: selectedRoomForBooking.hostel.address || '',
        roomNumber: selectedRoomForBooking.roomNumber,
        roomType: selectedRoomForBooking.type,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        gateway: 'demo',
        currency: selectedCurrency
      });
      router.push(`/checkout/pay?${params.toString()}`);
      return;
    }

    try {
      // 1. Create Booking draft
      const bookingRes = await api.post('/bookings', {
        roomId: selectedRoomForBooking.id,
        checkIn: checkInDate,
        checkOut: checkOutDate
      });

      const booking = bookingRes.data.booking;

      // 2. Get checkout session
      const paymentRes = await api.post('/payments/checkout-session', {
        bookingId: booking.id
      });

      // 3. Redirect to payment page while preserving the currency selected in the rooms UI.
      if (paymentRes.checkoutUrl) {
        const checkoutUrl = new URL(paymentRes.checkoutUrl, window.location.origin);

        if (checkoutUrl.searchParams.get('gateway') !== 'razorpay') {
          const days = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
          const convertedTotal = Number(selectedRoomForBooking.pricePerNight) * days * exchangeRates[selectedCurrency];
          checkoutUrl.searchParams.set('amount', convertedTotal.toFixed(2));
          checkoutUrl.searchParams.set('currency', selectedCurrency);
        }

        router.push(`${checkoutUrl.pathname}?${checkoutUrl.searchParams.toString()}`);
      } else {
        throw new Error("URL de paiement manquante.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erreur lors de la réservation de la chambre.');
      setBookingLoading(false);
    }
  };

  // AI Recommendation Call
  const handleAiRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPreferences.trim()) return;

    setIsAiLoading(true);
    setErrorMsg('');
    setAiRecommendations([]);

    try {
      const res = await api.post('/rooms/recommend', {
        preferences: aiPreferences.trim()
      });
      setAiRecommendations(res.data.recommendations || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erreur lors du calcul de la recommandation IA.');
    } finally {
      setIsAiLoading(false);
    }
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
            <span className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-600/10 flex items-center justify-center">
              <Bed size={20} />
            </span>
            <span className="font-heading font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-[#cbd5e1] bg-clip-text text-transparent">
              Hostel<span className="text-cyan-400">Hub</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link href="/hostels" className="text-zinc-400 hover:text-white transition-colors">Hostels</Link>
            <Link href="/rooms" className="text-white hover:text-white transition-colors relative after:content-[''] after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-0.5 after:bg-cyan-500 after:rounded-full">Rooms</Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 border border-zinc-805 bg-zinc-900/60 rounded-lg px-2 py-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1">Devise:</span>
              <select
                value={selectedCurrency}
                onChange={e => {
                  setSelectedCurrency(e.target.value as any);
                  setPriceRange(e.target.value === 'INR' ? 10000 : e.target.value === 'EUR' ? 150 : e.target.value === 'USD' ? 160 : 1500);
                }}
                className="bg-transparent border-none text-xs text-cyan-400 font-bold outline-none cursor-pointer focus:ring-0"
              >
                <option value="MAD" className="bg-[#0b0f19] text-white">MAD (DH)</option>
                <option value="INR" className="bg-[#0b0f19] text-white">INR (₹)</option>
                <option value="EUR" className="bg-[#0b0f19] text-white">EUR (€)</option>
                <option value="USD" className="bg-[#0b0f19] text-white">USD ($)</option>
              </select>
            </div>

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
        
        {/* Title & Centered Search Bar */}
        <div className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent font-heading">
            Browse Rooms
          </h1>
          
          {/* Centered Search Box */}
          <div className="w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-cyan-400 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search rooms or hostels..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/60 border border-zinc-800 focus:border-cyan-500 rounded-2xl text-sm placeholder:text-zinc-505 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 shadow-xl"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start w-full">
          
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 bg-zinc-905 border border-zinc-800/80 backdrop-blur-md p-6 rounded-2xl flex flex-col gap-6 shadow-xl sticky top-24">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
              <h2 className="font-bold text-zinc-200 text-sm flex items-center gap-2 uppercase tracking-wider">
                <SlidersHorizontal size={14} className="text-cyan-400" /> Filters
              </h2>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedHostel('');
                  setSelectedType('');
                  setSelectedGender('');
                  setPriceRange(selectedCurrency === 'INR' ? 10000 : selectedCurrency === 'EUR' ? 150 : selectedCurrency === 'USD' ? 160 : 1500);
                  setAvailableOnly(false);
                }}
                className="text-[10px] text-zinc-505 hover:text-cyan-400 transition-colors font-semibold"
              >
                Reset All
              </button>
            </div>

            {/* Room Type Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400">Room Type</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full bg-[#030712] border border-zinc-805 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="">All Types</option>
                <option value="DORM">Dormitory (Shared)</option>
                <option value="PRIVATE">Private Room</option>
              </select>
            </div>

            {/* Gender Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400">Gender</label>
              <select
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                className="w-full bg-[#030712] border border-zinc-805 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="">All</option>
                <option value="MALE">Male Only</option>
                <option value="FEMALE">Female Only</option>
                <option value="MIXED">Mixed / Co-ed</option>
              </select>
            </div>

            {/* Hostel Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400">Hostel</label>
              <select
                value={selectedHostel}
                onChange={e => setSelectedHostel(e.target.value)}
                className="w-full bg-[#030712] border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="">All Hostels</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>

            {/* Price Slider */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-400">Price Range</span>
                <span className="text-cyan-400 font-bold" suppressHydrationWarning>
                  {selectedCurrency === 'INR' ? '₹0' : selectedCurrency === 'EUR' ? '0€' : selectedCurrency === 'USD' ? '$0' : '0 DH'} -{' '}
                  {selectedCurrency === 'INR' 
                    ? `₹${priceRange.toLocaleString('fr-FR')}` 
                    : selectedCurrency === 'EUR' 
                      ? `${priceRange}€` 
                      : selectedCurrency === 'USD' 
                        ? `$${priceRange}` 
                        : `${priceRange.toLocaleString('fr-FR')} MAD`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={selectedCurrency === 'INR' ? 10000 : selectedCurrency === 'EUR' ? 150 : selectedCurrency === 'USD' ? 160 : 1500}
                step={selectedCurrency === 'INR' ? 250 : selectedCurrency === 'EUR' ? 5 : selectedCurrency === 'USD' ? 5 : 50}
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[10px] text-zinc-500 text-center block">Max budget per night</span>
            </div>

            {/* Available Only Toggle */}
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-2">
              <span className="text-xs font-semibold text-zinc-400">Available Only</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={e => setAvailableOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
              </label>
            </div>

            {/* Collapsible AI Assistant Section */}
            <div className="border-t border-zinc-800/80 pt-4 mt-2">
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="w-full flex justify-between items-center text-xs font-semibold text-zinc-400 hover:text-cyan-400 transition-colors uppercase tracking-wider"
              >
                <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-cyan-400" /> AI Recommendation</span>
                <ChevronDown size={14} className={`transform transition-transform ${showAiPanel ? 'rotate-180' : ''}`} />
              </button>

              {showAiPanel && (
                <form onSubmit={handleAiRecommendation} className="flex flex-col gap-3 mt-4 animate-fadeIn">
                  <textarea
                    rows={3}
                    placeholder="Describe your perfect stay... e.g. Solo traveller looking for a social male-only dorm in Marrakech under 200 MAD."
                    value={aiPreferences}
                    onChange={e => setAiPreferences(e.target.value)}
                    className="w-full bg-[#030712] border border-zinc-850 rounded-xl p-3 text-xs placeholder:text-zinc-600 text-zinc-300 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !aiPreferences.trim()}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/10"
                  >
                    {isAiLoading ? 'Analyzing...' : <><Sparkles size={12} /> Find with AI</>}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Rooms Grid Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Heading showing result counts */}
            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                Showing {filteredRooms.length} of {roomsPool.length} rooms
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                >
                  Clear text search
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-xs text-zinc-500 font-medium">Loading local database rooms...</span>
              </div>
            ) : filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {filteredRooms.map((room, idx) => {
                  const totalBeds = room.beds?.length || 0;
                  const availableBeds = room.beds?.filter((b: any) => b.status === 'AVAILABLE').length || 0;
                  const isAvailable = availableBeds > 0;
                  
                  // Map display names
                  let bedTypeLabel = 'single';
                  if (room.type === 'PRIVATE_ROOM') {
                    const isQueen = room.amenities.some((am: string) => am.toLowerCase().includes('queen') || am.toLowerCase().includes('double') || am.toLowerCase().includes('king'));
                    bedTypeLabel = isQueen ? 'double' : 'single';
                  }

                  let roomTypeLabel = 'dorm';
                  if (room.type === 'PRIVATE_ROOM') {
                    roomTypeLabel = bedTypeLabel === 'double' ? 'double' : 'single';
                  }

                  let genderLabel = 'mixed';
                  if (room.type === 'DORM_MALE') genderLabel = 'male';
                  if (room.type === 'DORM_FEMALE') genderLabel = 'female';
                  if (room.type === 'PRIVATE_ROOM') genderLabel = 'mixed';

                  return (
                    <div 
                      key={room.id}
                      className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-600/2 hover:-translate-y-0.5 transition-all duration-300 group"
                    >
                      {/* Card Image Cover with overlay badges */}
                      <div className="relative w-full h-44 bg-zinc-950 overflow-hidden">
                        <img
                          src={getRoomImageUrl(room.hostel.city, room.type, idx)}
                          alt={`Room ${room.roomNumber}`}
                          className="w-full h-full object-cover opacity-75 group-hover:scale-102 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
                        
                        {/* Overlay Left Badges (Availability & Type) */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border backdrop-blur-md ${
                            isAvailable 
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {isAvailable ? 'Available' : 'Full'}
                          </span>
                          <span className="px-2.5 py-0.5 bg-zinc-955/80 border border-zinc-800/50 text-zinc-300 text-[9px] font-extrabold rounded-full uppercase tracking-wide backdrop-blur-md">
                            {roomTypeLabel}
                          </span>
                        </div>

                        {/* Overlay Right Badge (Gender) */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-2.5 py-0.5 border text-[9px] font-extrabold rounded-full uppercase tracking-wide backdrop-blur-md ${
                            genderLabel === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : genderLabel === 'female'
                                ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                : 'bg-zinc-950/80 text-zinc-300 border-zinc-800/50'
                          }`}>
                            {genderLabel}
                          </span>
                        </div>
                      </div>

                      {/* Card Body content */}
                      <div className="p-5 flex flex-col justify-between flex-1 gap-5 bg-zinc-900/10">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider">CHAMBRE {room.roomNumber}</span>
                              <h3 className="font-heading font-bold text-base text-zinc-100 mt-0.5 group-hover:text-cyan-400 transition-colors leading-tight">
                                {room.type === 'PRIVATE_ROOM' ? 'Chambre Privée' : `Dortoir (${genderLabel === 'male' ? 'Hommes' : genderLabel === 'female' ? 'Femmes' : 'Mixte'})`}
                              </h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-lg text-zinc-100 font-mono tracking-tight">{formatDailyPrice(Number(room.pricePerNight))}</span>
                              <span className="text-[9px] text-zinc-500 block">/night</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <MapPin size={13} className="text-zinc-500 shrink-0" />
                            <span className="truncate font-medium">{room.hostel.name} ({room.hostel.city})</span>
                          </div>

                          {/* Room Features details */}
                          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 mt-2 text-xs">
                            <span className="flex items-center gap-1.5 text-zinc-400 capitalize">
                              <Bed size={13} className="text-zinc-500" /> {bedTypeLabel}
                            </span>
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <Users size={13} className="text-zinc-500" /> {availableBeds} of {totalBeds} spots
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons row - Matches Screenshot 2 (hides Book Now if Full) */}
                        <div className="flex gap-3 pt-1 border-t border-zinc-850">
                          {isAvailable ? (
                            <>
                              <button
                                onClick={() => setSelectedRoomForDetails(room)}
                                className="w-1/2 py-2.5 bg-transparent border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleBookNowClick(room)}
                                className="w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-cyan-600/10"
                              >
                                Book Now
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedRoomForDetails(room)}
                              className="w-full py-2.5 bg-transparent border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center animate-fadeIn"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
                <Info className="text-zinc-600 mx-auto mb-3" size={32} />
                <h4 className="font-bold text-sm text-zinc-400">Aucun résultat trouvé</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">Essayez d'élargir vos filtres de recherche pour trouver un hébergement disponible.</p>
              </div>
            )}

            {/* AI Recommendations Results Display */}
            {aiRecommendations.length > 0 && (
              <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-zinc-850">
                <h3 className="font-heading font-extrabold text-sm text-zinc-200 flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400 animate-pulse" /> AI Recommended Rooms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiRecommendations.map(({ room, similarity }) => (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoomForDetails(room)}
                      className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl hover:border-cyan-500/40 cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-600 text-[8px] font-black text-white rounded-bl-lg font-mono">
                        {Math.round(similarity * 100)}% Match
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 font-mono">ROOM {room.roomNumber}</span>
                      <h4 className="font-bold text-xs text-zinc-200 truncate">{room.type.replace(/_/g, ' ')}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{room.hostel.name}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/60">
                        <span className="text-xs text-zinc-300 font-bold font-mono">{formatDailyPrice(Number(room.pricePerNight))}</span>
                        <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-wider">View</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* DETAIL MODAL POPUP */}
      {selectedRoomForDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-lg w-full flex flex-col gap-6 shadow-2xl relative">
            {/* Close button */}
            <button 
              onClick={() => setSelectedRoomForDetails(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title / Header */}
            <div>
              <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">Chambre {selectedRoomForDetails.roomNumber} (Étage {selectedRoomForDetails.floor})</span>
              <h3 className="font-heading font-black text-xl text-white mt-1">
                {selectedRoomForDetails.type === 'PRIVATE_ROOM' ? 'Chambre Privée Supérieure' : `Dortoir (${selectedRoomForDetails.type.replace('DORM_', '')})`}
              </h3>
            </div>

            {/* Room Image */}
            <div className="w-full h-48 rounded-xl overflow-hidden bg-zinc-950">
              <img 
                src={getRoomImageUrl(selectedRoomForDetails.hostel.city, selectedRoomForDetails.type, 0)} 
                alt="Room Cover" 
                className="w-full h-full object-cover opacity-80"
              />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500 block">Hostel</span>
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5 mt-1">
                  <MapPin size={12} className="text-cyan-400 shrink-0" /> {selectedRoomForDetails.hostel.name} ({selectedRoomForDetails.hostel.city})
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Price / Tarif</span>
                <span className="font-bold text-cyan-400 text-sm mt-1 block">
                  {formatDailyPrice(Number(selectedRoomForDetails.pricePerNight))} /night <span className="text-[10px] font-normal text-zinc-500">({formatMonthlyPrice(selectedRoomForDetails.pricePerNight)} /month)</span>
                </span>
              </div>
            </div>

            {/* Amenities Tag list */}
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Equipements & Services</span>
              <div className="flex flex-wrap gap-2">
                {selectedRoomForDetails.amenities.map((am: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-zinc-800 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 font-medium font-mono">
                    {am}
                  </span>
                ))}
              </div>
            </div>

            {/* Bed Layout and Statuses */}
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Structure & Disponibilité des lits ({selectedRoomForDetails.beds?.length || 0} lits)</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {selectedRoomForDetails.beds?.map((bed: any, i: number) => (
                  <div key={bed.id} className="p-2.5 bg-[#030712] border border-zinc-805 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-400 truncate pr-1">{bed.bedNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                      bed.status === 'AVAILABLE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {bed.status === 'AVAILABLE' ? 'Libre' : 'Occupé'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Book Trigger inside Details */}
            <div className="pt-2 border-t border-zinc-850 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRoomForDetails(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const r = selectedRoomForDetails;
                  setSelectedRoomForDetails(null);
                  handleBookNowClick(r);
                }}
                disabled={selectedRoomForDetails.beds?.filter((b: any) => b.status === 'AVAILABLE').length === 0}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-cyan-600/10"
              >
                Book This Room
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DATE PICKER BOOKING MODAL */}
      {selectedRoomForBooking && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-md w-full flex flex-col gap-5 shadow-2xl relative">
            
            <button 
              onClick={() => setSelectedRoomForBooking(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div>
              <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-wider uppercase flex items-center gap-1"><CreditCard size={10} /> Réservation Directe</span>
              <h3 className="font-heading font-black text-lg text-white mt-1">
                Réserver la Chambre {selectedRoomForBooking.roomNumber}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">{selectedRoomForBooking.hostel.name} ({selectedRoomForBooking.hostel.city})</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date d'arrivée</label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={e => setCheckInDate(e.target.value)}
                    className="w-full bg-[#030712] border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none text-center transition-all focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date de départ</label>
                  <input
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    className="w-full bg-[#030712] border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none text-center transition-all focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              {/* Price Calculation Summary */}
              {(() => {
                const start = new Date(checkInDate);
                const end = new Date(checkOutDate);
                const diffTime = end.getTime() - start.getTime();
                const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                const pricePerNight = Number(selectedRoomForBooking.pricePerNight);
                const total = pricePerNight * nights;

                if (isNaN(nights) || nights <= 0) return null;

                return (
                  <div className="bg-[#030712] p-4 rounded-xl border border-zinc-800/80 flex flex-col gap-2.5 text-xs text-zinc-400">
                    <div className="flex justify-between items-center">
                      <span>Tarif / nuit</span>
                      <span className="font-semibold text-zinc-200 font-mono">{formatDailyPrice(pricePerNight)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Durée</span>
                      <span className="font-semibold text-zinc-200">{nights} nuits</span>
                    </div>
                    <div className="border-t border-zinc-800/80 pt-2.5 flex justify-between items-center font-bold text-sm">
                      <span className="text-zinc-300">Total à régler</span>
                      <span className="text-cyan-400 font-mono text-base">{formatDailyPrice(total)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRoomForBooking(null)}
                  className="w-1/2 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-1/2 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/15"
                >
                  {bookingLoading ? 'Redirection...' : <><CheckCircle2 size={13} /> Réserver & Payer</>}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-8 border-t border-zinc-900 bg-[#030712] mt-auto text-center relative z-10">
        <p className="text-[11px] text-zinc-600">
          &copy; 2026 Roomify Management System. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}

export default function RoomsSearch() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-500 font-medium">Chargement des chambres...</span>
      </div>
    }>
      <RoomsSearchContent />
    </Suspense>
  );
}
