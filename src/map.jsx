// Leaflet + OpenStreetMap map (no API key). markers: [{ id, lat, lng, emoji, label }]
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export const HUB = { lat: 13.0382, lng: 80.1565 };
export default function LiveMap({ markers = [], rings = false, height = 220, fit = true, zoom = 14, testId }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), fitted = useRef(false);
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([HUB.lat, HUB.lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    if (rings) [3000, 5000].forEach(r => L.circle([HUB.lat, HUB.lng], { radius: r, color: '#16a34a', weight: 2, dashArray: '6 6', fillOpacity: r === 3000 ? 0.08 : 0.04 }).addTo(map.current));
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);
  useEffect(() => {
    layer.current.clearLayers();
    const pts = markers.filter(m => m.lat && m.lng);
    pts.forEach(m => L.marker([m.lat, m.lng], { icon: L.divIcon({ className: 'emoji-pin', html: `<div>${m.emoji}</div>${m.label ? `<small>${m.label}</small>` : ''}`, iconSize: [40, 40], iconAnchor: [20, 20] }) }).addTo(layer.current));
    if (fit && pts.length > 1 && !fitted.current) { map.current.fitBounds(L.latLngBounds(pts.map(m => [m.lat, m.lng])).pad(0.25)); fitted.current = true; }
  }, [JSON.stringify(markers)]);
  return <div ref={el} data-testid={testId} style={{ height, borderRadius: 14, overflow: 'hidden', zIndex: 0 }} />;
}
