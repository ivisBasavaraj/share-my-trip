import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { Waypoint } from '../../types';

interface GoogleMapViewProps {
  apiKey: string;
  waypoints: Waypoint[];
  activeWaypointId?: string;
  onSelectWaypoint?: (wp: Waypoint) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: { lat: number; lng: number };
  onAuthError?: (msg: string) => void;
}

// Inner component to handle Polyline, bounds fitting, and map click listeners using the native map instance
const GoogleMapController: React.FC<{
  waypoints: Waypoint[];
  activeWaypointId?: string;
  onMapClick?: (lat: number, lng: number) => void;
  center?: { lat: number; lng: number };
}> = ({ waypoints, onMapClick, center }) => {
  const map = useMap();
  const polylineRef = React.useRef<google.maps.Polyline | null>(null);

  // Handle map click
  useEffect(() => {
    if (!map || !onMapClick) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  // Handle route Polyline
  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (waypoints.length > 1) {
      const path = waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#d97706',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map
      });
      polylineRef.current = polyline;
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, waypoints]);

  // Auto-fit bounds on waypoint changes
  useEffect(() => {
    if (!map) return;
    if (waypoints.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      waypoints.forEach(wp => bounds.extend({ lat: wp.lat, lng: wp.lng }));
      map.fitBounds(bounds, 50);
    } else if (center) {
      map.setCenter(center);
      map.setZoom(11);
    }
  }, [map, waypoints, center]);

  return null;
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  apiKey,
  waypoints,
  activeWaypointId,
  onSelectWaypoint,
  onMapClick,
  center,
  onAuthError
}) => {
  const [selectedPin, setSelectedPin] = useState<Waypoint | null>(null);

  // Intercept Google Maps auth failures globally
  useEffect(() => {
    const prev = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (onAuthError) {
        onAuthError(
          'Google Maps API key is invalid or missing Maps JavaScript API access. ' +
          'Switched to MapLibre GL JS. Add a valid key via the 🔑 button.'
        );
      }
    };
    return () => {
      window.gm_authFailure = prev;
    };
  }, [onAuthError]);

  // Set default center
  const defaultCenter = center
    ? center
    : waypoints.length > 0
    ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
    : { lat: 12.4208, lng: 75.7382 };

  useEffect(() => {
    if (activeWaypointId) {
      const match = waypoints.find(w => w.id === activeWaypointId);
      if (match) setSelectedPin(match);
    }
  }, [activeWaypointId, waypoints]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '420px', height: '100%' }}>
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'places']}
        onLoad={() => {
          // Hook up auth failure callback if triggered
        }}
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={defaultCenter}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={true}
          mapTypeControl={true}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* Synchronizer and polyline controller */}
          <GoogleMapController
            waypoints={waypoints}
            activeWaypointId={activeWaypointId}
            onMapClick={onMapClick}
            center={center}
          />

          {/* Advanced Markers */}
          {waypoints.map((wp, index) => {
            const isActive = wp.id === activeWaypointId;
            return (
              <AdvancedMarker
                key={wp.id}
                position={{ lat: wp.lat, lng: wp.lng }}
                title={wp.title}
                onClick={() => {
                  setSelectedPin(wp);
                  if (onSelectWaypoint) onSelectWaypoint(wp);
                }}
              >
                <Pin
                  background={isActive ? '#d97706' : '#0f172a'}
                  glyphColor="#ffffff"
                  borderColor={isActive ? '#fef3c7' : '#ffffff'}
                  scale={isActive ? 1.25 : 1.0}
                  glyphText={`${index + 1}`}
                />
              </AdvancedMarker>
            );
          })}

          {/* Info Window */}
          {selectedPin && (
            <InfoWindow
              position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
              onCloseClick={() => setSelectedPin(null)}
            >
              <div className="p-1 font-sans text-slate-800 max-w-[220px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Day {selectedPin.dayNumber}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {selectedPin.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedPin.locationName}
                </div>
                {selectedPin.time && (
                  <div className="text-[10px] font-mono text-slate-600 mt-1">
                    🕒 {selectedPin.time}
                  </div>
                )}
                {selectedPin.notes && (
                  <div className="text-[11px] italic text-slate-600 mt-1.5 border-t border-slate-100 pt-1">
                    {selectedPin.notes}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
