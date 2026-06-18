'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Coffee, Utensils, Train, Compass, AlertCircle } from 'lucide-react';

interface HostelMapProps {
  address: string;
  city: string;
  hostelName: string;
}

interface PointOfInterest {
  name: string;
  type: 'cafe' | 'restaurant' | 'station' | 'attraction';
  latOffset: number;
  lngOffset: number;
}

export default function HostelMap({ address, city, hostelName }: HostelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const poiMarkersRef = useRef<L.Marker[]>([]);

  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Generate some local interest points dynamically based on coords
  const [pois, setPois] = useState<PointOfInterest[]>([]);

  // Geocoding using Nominatim (OSM)
  useEffect(() => {
    if (!address || !city) return;

    const geocode = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const query = encodeURIComponent(`${address}, ${city}`);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
          {
              headers: {
              'User-Agent': 'Roomify-App/1.0'
            }
          }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setCoordinates([lat, lon]);

          // Mock some POIs nearby
          setPois([
            { name: 'Café de la Poste', type: 'cafe', latOffset: 0.0015, lngOffset: -0.001 },
            { name: 'Restaurant Le Marrakech', type: 'restaurant', latOffset: -0.001, lngOffset: 0.0025 },
            { name: 'Gare Routière', type: 'station', latOffset: 0.003, lngOffset: 0.001 },
            { name: 'Place Historique', type: 'attraction', latOffset: -0.002, lngOffset: -0.002 }
          ]);
        } else {
          // Fallback to City level if full address not found
          const cityQuery = encodeURIComponent(city);
          const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${cityQuery}&limit=1`,
            {
              headers: {
                'User-Agent': 'Roomify-App/1.0'
              }
            }
          );
          const cityData = await cityResponse.json();
          if (cityData && cityData.length > 0) {
            const lat = parseFloat(cityData[0].lat);
            const lon = parseFloat(cityData[0].lon);
            setCoordinates([lat, lon]);
            
            setPois([
              { name: 'Café Central', type: 'cafe', latOffset: 0.002, lngOffset: -0.0015 },
              { name: 'Restaurant Local', type: 'restaurant', latOffset: -0.0015, lngOffset: 0.002 },
              { name: 'Station Taxi', type: 'station', latOffset: 0.0025, lngOffset: 0.001 }
            ]);
          } else {
            // Default fallback coordinates (Rabat, Morocco)
            setCoordinates([34.020882, -6.84165]);
            setErrorMsg('Adresse introuvable. Affichage par défaut.');
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        // Fallback coordinates (Rabat, Morocco)
        setCoordinates([34.020882, -6.84165]);
        setErrorMsg('Erreur de connexion cartographique. Position par défaut.');
      } finally {
        setLoading(false);
      }
    };

    geocode();
  }, [address, city]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!coordinates || !mapContainerRef.current) return;

    // Destroy existing map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false // custom zoom positioning below
    }).setView(coordinates, 15);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Zoom controls at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom marker with cyan glowing ring
    const hostelHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-cyan-600/30 animate-ping"></div>
        <div class="absolute w-6 h-6 rounded-full bg-cyan-500/50 flex items-center justify-center border border-cyan-400">
          <div class="w-3 h-3 rounded-full bg-cyan-400"></div>
        </div>
      </div>
    `;

    const hostelIcon = L.divIcon({
      html: hostelHtml,
      className: 'custom-hostel-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(coordinates, { icon: hostelIcon }).addTo(map);
    marker.bindPopup(`
      <div style="color: #0f172a; font-family: sans-serif; padding: 2px;">
        <strong style="font-size: 13px;">${hostelName}</strong><br/>
        <span style="font-size: 11px; color: #64748b;">${address}, ${city}</span>
      </div>
    `).openPopup();
    
    markerRef.current = marker;

    // Add POIs Markers
    // Clean existing POI markers
    poiMarkersRef.current.forEach(m => m.remove());
    poiMarkersRef.current = [];

    pois.forEach(poi => {
      const poiLat = coordinates[0] + poi.latOffset;
      const poiLng = coordinates[1] + poi.lngOffset;

      const getPoiIconHtml = (type: string) => {
        let color = 'bg-cyan-500';
        if (type === 'cafe') color = 'bg-cyan-500';
        if (type === 'station') color = 'bg-cyan-500';
        if (type === 'restaurant') color = 'bg-cyan-500';

        return `
          <div class="w-5 h-5 rounded-full ${color} text-white flex items-center justify-center border border-slate-900 shadow-lg text-[10px]">
            📍
          </div>
        `;
      };

      const poiIcon = L.divIcon({
        html: getPoiIconHtml(poi.type),
        className: 'custom-poi-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const poiMarker = L.marker([poiLat, poiLng], { icon: poiIcon }).addTo(map);
      poiMarker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 11px;">
          <strong>${poi.name}</strong><br/>
          <span style="color: #64748b; text-transform: capitalize;">${poi.type}</span>
        </div>
      `);
      poiMarkersRef.current.push(poiMarker);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, pois, address, city, hostelName]);

  return (
    <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Compass size={14} /> Localisation & Points d'intérêt
        </h3>
        {errorMsg && (
          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
            <AlertCircle size={10} /> {errorMsg}
          </span>
        )}
      </div>

      <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-slate-800">
        {loading ? (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 text-slate-500">
            <svg className="animate-spin h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-[10px] text-slate-400">Chargement de la carte...</span>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        )}
      </div>

      {/* Legend / Nearbys */}
      {!loading && pois.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500 block animate-pulse"></span>
            <span className="truncate"><strong>{hostelName}</strong> (Hébergement)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500 block"></span>
            <span className="truncate">Cafés & Salons de thé</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500 block"></span>
            <span className="truncate">Restaurants locaux</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500 block"></span>
            <span className="truncate">Transports à proximité</span>
          </div>
        </div>
      )}
    </div>
  );
}
