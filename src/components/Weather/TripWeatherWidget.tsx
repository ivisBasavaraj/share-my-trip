import React, { useState, useEffect } from 'react';
import { Trip, TripWeatherInfo } from '../../types';
import { fetchTripWeather } from '../../services/tripService';
import { 
  CloudSun, 
  Droplets, 
  Wind, 
  Thermometer, 
  AlertCircle, 
  SunMedium, 
  CloudRain, 
  Compass,
  Sparkles
} from 'lucide-react';

interface TripWeatherWidgetProps {
  trip: Trip;
}

export const TripWeatherWidget: React.FC<TripWeatherWidgetProps> = ({ trip }) => {
  const [weather, setWeather] = useState<TripWeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchTripWeather(trip.id, trip.destination)
      .then((data) => {
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [trip.id, trip.destination]);

  if (loading || !weather) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-8 bg-slate-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Destination Weather & Road Advisory</h3>
            <p className="text-[11px] text-slate-500">{weather.destination}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-2xl font-black text-slate-900">{weather.temperatureC}°</span>
          <span className="text-xs text-slate-500 font-sans">C</span>
        </div>
      </div>

      {/* Advisory Banner */}
      {weather.advisory && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">{weather.advisory}</p>
        </div>
      )}

      {/* Weather Stats Bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-semibold">
            <Droplets className="w-3 h-3 text-blue-500" />
            <span>Precipitation</span>
          </div>
          <div className="text-slate-800 font-bold font-mono mt-1 text-xs">{weather.precipitationChance}%</div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-semibold">
            <Wind className="w-3 h-3 text-emerald-500" />
            <span>Wind</span>
          </div>
          <div className="text-slate-800 font-bold font-mono mt-1 text-xs">{weather.windSpeedKmh} km/h</div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-semibold">
            <Thermometer className="w-3 h-3 text-amber-500" />
            <span>Humidity</span>
          </div>
          <div className="text-slate-800 font-bold font-mono mt-1 text-xs">{weather.humidity}%</div>
        </div>
      </div>

      {/* 5-Day Forecast Grid */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Multi-Day Forecast
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
            {weather.forecast.map((day, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-600">{day.day}</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 mt-0.5">{day.tempHigh}°</span>
                <span className="text-[9px] text-slate-400">{day.tempLow}°</span>
                <span className="text-[9px] text-slate-500 mt-1 truncate max-w-full">{day.condition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
