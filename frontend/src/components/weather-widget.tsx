'use client';

import { useState, useEffect } from 'react';
import { CloudSun, Sun, Cloud, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

const OWM_KEY = 'YOUR_FREE_OWM_KEY';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface WeatherWidgetProps {
  city: string;
  checkIn: string;
  checkOut: string;
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sun')) return <Sun size={16} className="text-amber-400" />;
  if (c.includes('cloud')) return <Cloud size={16} className="text-slate-400" />;
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={16} className="text-blue-400" />;
  if (c.includes('snow')) return <CloudSnow size={16} className="text-blue-200" />;
  if (c.includes('thunder')) return <CloudLightning size={16} className="text-amber-400" />;
  return <CloudSun size={16} className="text-slate-400" />;
}

export default function WeatherWidget({ city, checkIn, checkOut }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;

    // Prendre la météo du jour du check-in
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OWM_KEY}`
        );
        const data = await res.json();
        if (data?.main?.temp) {
          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather[0]?.description || '',
            icon: data.weather[0]?.icon || ''
          });
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5a6478] text-[10px]">
        <div className="w-4 h-4 border border-cyan-400/30 border-t-transparent rounded-full animate-spin" />
        Météo...
      </div>
    );
  }

  if (!weather) return null;

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="flex items-center gap-2 text-[11px] text-[#e8edf5]">
      {getWeatherIcon(weather.condition)}
      <span className="font-bold">{weather.temp}°C</span>
      <span className="text-[#8892a8] capitalize">{weather.condition}</span>
      <span className="text-[#5a6478]">· {nights} nuits</span>
    </div>
  );
}
