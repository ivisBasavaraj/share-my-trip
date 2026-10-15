import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import { Waypoint } from '../../types';
import firebaseConfig from '../../../firebase-applet-config.json';
import { GoogleMapView } from './GoogleMapView';
import { 
  Navigation, 
  Layers, 
  Compass, 
  Key, 
  Check, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Database, 
  Wifi, 
  Sparkles,
  AlertCircle,
  Eye,
  Route,
  Maximize2
} from 'lucide-react';

interface TravelMapProps {
  waypoints: Waypoint[];
  activeWaypointId?: string;
  onSelectWaypoint?: (wp: Waypoint) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: { lat: number; lng: number };
}

// MapLibre Vector Tile Styles
const MAPLIBRE_STYLES = {
  navigation: {
    id: 'navigation',
    name: 'Navigation Vector',
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  bright: {
    id: 'bright',
    name: 'Clean Vector',
    url: 'https://tiles.openfreemap.org/styles/bright'
  },
  positron: {
    id: 'positron',
    name: 'Muted Light',
    url: 'https://tiles.openfreemap.org/styles/positron'
  }
};

// Haversine distance calculator for dynamic path length in km
function calculateTotalDistanceKm(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  const R = 6371; // Earth radius in km

  for (let i = 0; i < waypoints.length - 1; i++) {
    const lat1 = (waypoints[i].lat * Math.PI) / 180;
    const lon1 = (waypoints[i].lng * Math.PI) / 180;
    const lat2 = (waypoints[i + 1].lat * Math.PI) / 180;
    const lon2 = (waypoints[i + 1].lng * Math.PI) / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return Math.round(total * 10) / 10;
}

export const TravelMap: React.FC<TravelMapProps> = ({
  waypoints,
  activeWaypointId,
  onSelectWaypoint,
  onMapClick,
  center
}) => {
  // Map containers
  const maplibreContainerRef = useRef<HTMLDivElement>(null);
  const leafletContainerRef = useRef<HTMLDivElement>(null);

  // MapLibre instances and refs
  const maplibreMapRef = useRef<maplibregl.Map | null>(null);
  const maplibreMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Leaflet instances
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);



  // Selected Engine: always start on MapLibre — Google Maps requires an explicit Maps API key
  const [mapEngine, setMapEngine] = useState<'maplibre' | 'google' | 'leaflet'>('maplibre');

  const [maplibreStyle, setMaplibreStyle] = useState<keyof typeof MAPLIBRE_STYLES>('navigation');
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    // Only use an explicitly set Maps key — never the Firebase Web API key
    return (
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
      localStorage.getItem('srsplatform_gmap_key') ||
      ''
    );
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>('');
  const [googleErrorNotice, setGoogleErrorNotice] = useState<string | null>(null);
  const [maplibrePitch3D, setMaplibrePitch3D] = useState<boolean>(false);

  const totalKm = calculateTotalDistanceKm(waypoints);

  // ==========================================
  // 1. MapLibre GL JS Navigation Engine Setup
  // ==========================================
  useEffect(() => {
    if (mapEngine !== 'maplibre' || !maplibreContainerRef.current) return;

    const defaultLat = center ? center.lat : (waypoints[0]?.lat || 12.4208);
    const defaultLng = center ? center.lng : (waypoints[0]?.lng || 75.7382);

    // Initialize MapLibre GL JS Map
    const map = new maplibregl.Map({
      container: maplibreContainerRef.current,
      style: MAPLIBRE_STYLES[maplibreStyle].url,
      center: [defaultLng, defaultLat],
      zoom: 10,
      pitch: maplibrePitch3D ? 50 : 0,
      bearing: 0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    map.on('load', () => {
      // Add route GeoJSON source and glowing navigation layers
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: waypoints.map(w => [w.lng, w.lat])
          }
        }
      });

      // Route casing glow
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 7,
          'line-opacity': 0.45
        }
      });

      // Route main line
      map.addLayer({
        id: 'route-nav-main',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#d97706',
          'line-width': 4,
          'line-dasharray': [2, 1.5]
        }
      });

      syncMapLibreWaypoints(map);
    });

    maplibreMapRef.current = map;

    return () => {
      maplibreMarkersRef.current.forEach(m => m.remove());
      maplibreMarkersRef.current = [];
      map.remove();
      maplibreMapRef.current = null;
    };
  }, [mapEngine, maplibreStyle]);

  // Sync MapLibre Waypoints, Markers & Route Coordinates
  const syncMapLibreWaypoints = (map: maplibregl.Map) => {
    // Clear old markers
    maplibreMarkersRef.current.forEach(m => m.remove());
    maplibreMarkersRef.current = [];

    // Update GeoJSON source if loaded
    const source = map.getSource('route-line') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: waypoints.map(w => [w.lng, w.lat])
        }
      });
    }

    // Place interactive HTML custom markers
    waypoints.forEach((wp, index) => {
      const isActive = wp.id === activeWaypointId;

      const el = document.createElement('div');
      el.className = 'maplibre-marker-container cursor-pointer transition-transform duration-200 select-none';
      el.innerHTML = `
        <div class="relative group ${isActive ? 'scale-125 z-50' : 'hover:scale-110'}">
          <div class="w-8 h-8 rounded-full ${isActive ? 'bg-amber-600 ring-4 ring-amber-200' : 'bg-slate-900'} text-white flex items-center justify-center font-bold text-xs shadow-xl border-2 border-white">
            ${index + 1}
          </div>
          <div class="w-2.5 h-2.5 bg-slate-900 rotate-45 absolute -bottom-1 left-[11px] ${isActive ? 'bg-amber-600' : ''}"></div>
        </div>
      `;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (onSelectWaypoint) onSelectWaypoint(wp);
      });

      // MapLibre Popup
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 text-slate-800 font-sans">
          <div class="text-[10px] uppercase tracking-wider font-semibold text-amber-600 mb-0.5">Day ${wp.dayNumber} · Stop ${index + 1}</div>
          <div class="font-bold text-sm text-slate-900">${wp.title}</div>
          <div class="text-xs text-slate-500 mt-0.5">${wp.locationName}</div>
          ${wp.time ? `<div class="text-[11px] font-mono text-slate-600 mt-1">🕒 ${wp.time}</div>` : ''}
          ${wp.notes ? `<div class="text-xs italic text-slate-600 mt-1.5 border-t border-slate-100 pt-1">${wp.notes}</div>` : ''}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wp.lng, wp.lat])
        .setPopup(popup)
        .addTo(map);

      maplibreMarkersRef.current.push(marker);
    });

    // Auto-fit bounds if multiple waypoints exist
    if (waypoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      waypoints.forEach(wp => bounds.extend([wp.lng, wp.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
  };

  // Sync MapLibre when waypoints or activeWaypointId change
  useEffect(() => {
    if (mapEngine !== 'maplibre' || !maplibreMapRef.current) return;
    const map = maplibreMapRef.current;
    if (map.isStyleLoaded()) {
      syncMapLibreWaypoints(map);
    }
  }, [waypoints, activeWaypointId, mapEngine]);

  // Toggle 3D Pitch on MapLibre
  const toggle3DPitch = () => {
    if (!maplibreMapRef.current) return;
    const newPitch = !maplibrePitch3D;
    setMaplibrePitch3D(newPitch);
    maplibreMapRef.current.easeTo({
      pitch: newPitch ? 55 : 0,
      bearing: newPitch ? -15 : 0,
      duration: 800
    });
  };

  // ==========================================
  // 2. Leaflet Fallback Engine Setup
  // ==========================================
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletContainerRef.current) return;

    if (!leafletMapRef.current) {
      const defaultCenter: [number, number] = center
        ? [center.lat, center.lng]
        : waypoints.length > 0
        ? [waypoints[0].lat, waypoints[0].lng]
        : [12.4208, 75.7382];

      const map = L.map(leafletContainerRef.current, {
        center: defaultCenter,
        zoom: 10,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
      });

      markersLayerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapEngine]);

  // Sync Leaflet markers and polyline
  useEffect(() => {
    if (mapEngine !== 'leaflet') return;
    const map = leafletMapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (waypoints.length === 0) return;

    const latLngs: [number, number][] = [];

    waypoints.forEach((wp, index) => {
      latLngs.push([wp.lat, wp.lng]);
      const isActive = wp.id === activeWaypointId;

      const iconHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${isActive ? 'scale-125 z-50' : 'hover:scale-110'}">
          <div class="w-8 h-8 rounded-full ${isActive ? 'bg-amber-600 ring-4 ring-amber-200' : 'bg-slate-900'} text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
            ${index + 1}
          </div>
          <div class="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-3 ${isActive ? 'bg-amber-600' : ''}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-pin-marker',
        iconSize: [32, 38],
        iconAnchor: [16, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });

      const popupContent = `
        <div class="p-2 text-slate-800 font-sans">
          <div class="text-[10px] uppercase tracking-wider font-semibold text-amber-600 mb-0.5">Day ${wp.dayNumber} · Stop ${index + 1}</div>
          <div class="font-bold text-sm text-slate-900">${wp.title}</div>
          <div class="text-xs text-slate-500 mt-0.5">${wp.locationName}</div>
          ${wp.time ? `<div class="text-[11px] font-mono text-slate-600 mt-1">🕒 ${wp.time}</div>` : ''}
          ${wp.notes ? `<div class="text-xs italic text-slate-600 mt-1.5 border-t border-slate-100 pt-1">${wp.notes}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectWaypoint) onSelectWaypoint(wp);
      });

      markersLayer.addLayer(marker);
    });

    if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#d97706',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);
    }

    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 13 });
    }
  }, [waypoints, activeWaypointId, mapEngine]);

  // ==========================================
  // Fit All Bounds Button handler
  const fitAllBounds = () => {
    if (waypoints.length === 0) return;

    if (mapEngine === 'maplibre' && maplibreMapRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      waypoints.forEach(wp => bounds.extend([wp.lng, wp.lat]));
      maplibreMapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      const latLngs = waypoints.map((w) => [w.lat, w.lng] as [number, number]);
      leafletMapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
    }
  };

  const handleSaveApiKey = () => {
    if (tempKeyInput.trim()) {
      localStorage.setItem('srsplatform_gmap_key', tempKeyInput.trim());
      setGoogleApiKey(tempKeyInput.trim());
      setMapEngine('google');
      setShowKeyModal(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl border border-slate-200 bg-slate-100 shadow-sm flex flex-col" style={{ isolation: 'isolate' }}>
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Left Route Stats Card */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Navigation className="w-3.5 h-3.5 text-amber-600" />
            <span>{waypoints.length} Stops</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-mono tabular-nums text-slate-900 font-bold">{totalKm} km</span> path
          </div>
          <span className="text-slate-300">|</span>
          <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
            Click map to pin
          </div>
        </div>

        {/* Right Map Engine Toggle & Controls */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Engine Selector */}
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 text-xs">
            {/* MapLibre GL JS (Default Vector Navigation) */}
            <button
              onClick={() => setMapEngine('maplibre')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                mapEngine === 'maplibre'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="GPU-accelerated MapLibre GL JS Navigation Vector Map"
            >
              <Navigation className="w-3 h-3 text-amber-100" />
              <span>MapLibre GL</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-700/80 font-mono">GL JS</span>
            </button>

            {/* Google Maps Button */}
            <button
              onClick={() => {
                if (!googleApiKey) {
                  setShowKeyModal(true);
                } else {
                  setMapEngine('google');
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                mapEngine === 'google'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Official Google Maps Platform layers"
            >
              <Globe className="w-3 h-3" />
              <span>Google Maps</span>
            </button>

            {/* Leaflet / Offline Button */}
            <button
              onClick={() => setMapEngine('leaflet')}
              className={`px-2 py-1 rounded-lg font-medium transition-colors text-[11px] ${
                mapEngine === 'leaflet'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Lightweight raster map fallback"
            >
              2D Raster
            </button>
          </div>

          {/* MapLibre specific controls: 3D Tilt & Style Switcher */}
          {mapEngine === 'maplibre' && (
            <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1">
              <button
                onClick={toggle3DPitch}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  maplibrePitch3D
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle 3D Perspective Pitch Tilt"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">3D Tilt</span>
              </button>

              <select
                value={maplibreStyle}
                onChange={(e) => setMaplibreStyle(e.target.value as keyof typeof MAPLIBRE_STYLES)}
                aria-label="Map style theme"
                className="bg-transparent text-[11px] font-medium text-slate-700 border-0 focus:ring-0 cursor-pointer pr-1 py-0.5"
              >
                <option value="navigation">Nav Theme</option>
                <option value="bright">Clean Theme</option>
                <option value="positron">Light Theme</option>
              </select>
            </div>
          )}

          <button
            onClick={fitAllBounds}
            className="bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-md border border-slate-200 transition-colors text-xs flex items-center gap-1 font-medium"
            title="Fit all waypoints"
          >
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className="bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-md border border-slate-200 transition-colors text-xs font-medium"
            title="Configure Map Engines & Keys"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      </div>

      {/* Map Views: MapLibre GL JS vs Google Maps vs Leaflet */}
      {mapEngine === 'maplibre' && (
        <div ref={maplibreContainerRef} className="w-full h-full flex-1 z-0 rounded-2xl overflow-hidden" style={{ minHeight: '420px' }} />
      )}

      {mapEngine === 'google' && (
        <div className="w-full h-full flex-1 z-0 relative rounded-2xl overflow-hidden" style={{ minHeight: '420px' }}>
          <GoogleMapView
            apiKey={googleApiKey}
            waypoints={waypoints}
            activeWaypointId={activeWaypointId}
            onSelectWaypoint={onSelectWaypoint}
            onMapClick={onMapClick}
            center={center}
            onAuthError={(err) => {
              setGoogleErrorNotice(err);
              setMapEngine('maplibre');
            }}
          />
        </div>
      )}

      {mapEngine === 'leaflet' && (
        <div ref={leafletContainerRef} className="w-full h-full flex-1 z-0 rounded-2xl overflow-hidden" style={{ minHeight: '420px' }} />
      )}

      {/* MapLibre Active Badge in corner */}
      {mapEngine === 'maplibre' && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur border border-slate-200/90 text-[10px] text-slate-600 px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-900 font-mono">MapLibre GL JS</span>
          <span className="text-slate-400">· Vector GPU Navigation Active</span>
        </div>
      )}

      {/* Graceful Fallback Banner */}
      {googleErrorNotice && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] bg-amber-50/95 backdrop-blur border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] leading-tight">{googleErrorNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setMapEngine('maplibre'); setGoogleErrorNotice(null); }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[11px] transition-colors"
            >
              Use MapLibre GL
            </button>
            <button
              onClick={() => setGoogleErrorNotice(null)}
              className="text-amber-700 hover:text-amber-900 font-bold px-1 text-sm"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Key & Cloud Services Settings Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base mb-3">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>Map Engines & Cloud Navigation Setup</span>
            </div>

            {/* MapLibre High-Performance Feature Card */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 mb-3 space-y-1">
              <div className="flex items-center justify-between text-amber-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-600" />
                  MapLibre GL JS Navigation Engine
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">PRIMARY</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Full WebGL vector tile rendering, 3D perspective pitch tilt, dynamic smooth zoom, interactive waypoint pinning, and vector route line generation without external key quota limits.
              </p>
            </div>

            {/* Firebase Active Card */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 mb-4 space-y-1">
              <div className="flex items-center justify-between text-emerald-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Firebase Firestore Database: Connected
                </span>
                <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-mono truncate">
                ID: {firebaseConfig.firestoreDatabaseId}
              </div>
              <div className="text-[11px] text-emerald-700">
                Multi-tab IndexedDB cache active · Real-time waypoint syncing
              </div>
            </div>

            {/* Google Maps Configuration */}
            <div className="space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Google Maps API Key (Optional Alternative)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Enter an activated Google Maps API key to view Google satellite and terrain layers. MapLibre GL JS remains ready as the high-performance navigation map.
              </p>

              {/* Direct links to get / manage the key */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-semibold transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Open Google Cloud Credentials →
                </a>
                <a
                  href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors"
                >
                  Enable Maps JavaScript API →
                </a>
              </div>

              {/* Step-by-step mini guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Quick setup (2 min):</p>
                <p>1. Click <span className="font-semibold text-blue-700">Open Google Cloud Credentials</span> above</p>
                <p>2. Click <span className="font-semibold">+ Create Credentials → API Key</span></p>
                <p>3. In the <span className="font-semibold">Enable Maps JavaScript API</span> link, enable the API</p>
                <p>4. Copy the key and paste it below, then click <span className="font-semibold">Save Google Key</span></p>
              </div>

              <div>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempKeyInput || googleApiKey}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMapEngine('maplibre');
                    setShowKeyModal(false);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  Use MapLibre GL JS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapEngine('leaflet');
                    setShowKeyModal(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  2D Raster Map
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Google Key</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
