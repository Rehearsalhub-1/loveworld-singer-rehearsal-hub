"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Save, Crosshair, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';

import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { adminApi as apiClient } from '@/lib/admin-api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
};

export default function GeofenceConfigSection() {
  const { currentZone } = useZone();
  const [lat, setLat] = useState('6.458985');
  const [lon, setLon] = useState('3.406232');
  const [radius, setRadius] = useState('200');
  const [activeEventName, setActiveEventName] = useState('Rehearsal');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const docId = currentZone?.id
    ? isHQGroup(currentZone.id) ? 'geofence_hq' : `geofence_${currentZone.id}`
    : 'geofence';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiClient.get<{
          success?: boolean;
          data?: {
            latitude?: number;
            longitude?: number;
            radius?: number;
            activeEventName?: string;
          } | null;
        }>(`/settings/${encodeURIComponent(docId)}`);

        if (res.success !== false && res.data) {
          const data = res.data;
          if (data.latitude != null) setLat(String(data.latitude));
          if (data.longitude != null) setLon(String(data.longitude));
          if (data.radius != null) setRadius(String(data.radius));
          if (data.activeEventName) setActiveEventName(data.activeEventName);
        } else {
          setLat('6.458985');
          setLon('3.406232');
          setRadius('200');
          setActiveEventName('Rehearsal');
        }
      } catch (err) {
        console.error("Failed to load geofence", err);
      }
    };
    loadSettings();
  }, [docId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        latitude: parseFloat(lat) || 6.458985,
        longitude: parseFloat(lon) || 3.406232,
        radius: parseInt(radius, 10) || 200,
        activeEventName: activeEventName.trim() || 'Rehearsal',
        zoneId: currentZone?.id || 'general',
        updatedAt: new Date().toISOString(),
      };

      await apiClient.patch(`/settings/${encodeURIComponent(docId)}`, payload);
      showToast('Geofence settings published successfully! Mobile clock-in active.');
    } catch (err: any) {
      console.error('Failed to save geofence:', err);
      showToast(err?.message || 'Failed to save geofence settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setLat(e.latLng.lat().toFixed(6));
      setLon(e.latLng.lng().toFixed(6));
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(6));
          setLon(position.coords.longitude.toFixed(6));
          showToast('Updated coordinates to your current GPS position');
        },
        (_error) => {
          showToast('Could not access GPS. Please allow location permissions.', 'error');
        }
      );
    } else {
      showToast('Geolocation is not supported by your browser.', 'error');
    }
  };

  const position = {
    lat: parseFloat(lat) || 6.458985,
    lng: parseFloat(lon) || 3.406232
  };
  const radiusNum = parseInt(radius, 10) || 200;

  return (
    <div className="w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar bg-slate-50/50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[120] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
              <MapPin className="w-5 h-5" />
            </div>
            Geofenced Clock-in Map
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Configure the boundary radius and coordinate center for mobile rehearsal clock-ins ({currentZone?.name || 'HQ Zone'}).
          </p>
        </div>
        <button
          onClick={handleGetCurrentLocation}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-2xl text-purple-700 font-bold text-xs transition-all shadow-xs active:scale-95 self-start sm:self-auto"
        >
          <Crosshair size={15} />
          Use My Current Location
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Map Section */}
        <div className="flex-1 w-full rounded-3xl overflow-hidden shadow-xs border border-slate-200 bg-white relative z-10 min-h-[440px] flex flex-col">
          {loadError ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center bg-rose-50/50 text-rose-600 p-8 text-center min-h-[440px]">
              <MapPin size={48} className="mb-4 opacity-40" />
              <p className="font-bold text-sm">Failed to load Google Maps interface.</p>
              <p className="text-xs mt-1.5 opacity-80 max-w-sm">You can still specify the latitude, longitude, and radius manually in the controls panel.</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full flex-1 flex items-center justify-center bg-slate-50 min-h-[440px]">
              <Loader2 className="animate-spin text-purple-600" size={32} />
            </div>
          ) : (
            <div className="w-full h-[480px]">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={position}
                zoom={16}
                onClick={handleMapClick}
                options={{
                  disableDefaultUI: false,
                  clickableIcons: false,
                }}
              >
                <Marker position={position} />
                <Circle
                  center={position}
                  radius={radiusNum}
                  options={{
                    fillColor: '#9333ea',
                    fillOpacity: 0.2,
                    strokeColor: '#9333ea',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              </GoogleMap>
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="w-full lg:w-88 bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 flex flex-col space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 tracking-tight">Geofence Parameters</h3>
            <p className="text-[11px] text-slate-400">Target zone: {docId}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 block">Latitude</label>
              <input
                type="number" step="any" value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none font-mono text-xs font-bold"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 block">Longitude</label>
              <input
                type="number" step="any" value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 block">Radius Boundary (Meters)</label>
              <input
                type="number" value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none font-mono text-xs font-bold"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 block">Active Event Title</label>
              <input
                type="text" value={activeEventName}
                onChange={(e) => setActiveEventName(e.target.value)}
                placeholder="e.g. Rehearsal"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none text-xs font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl font-bold text-xs transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Publishing...' : 'Save Geofence'}
          </button>
        </div>
      </div>
    </div>
  );
}
