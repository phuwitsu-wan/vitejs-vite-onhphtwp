import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import tambonGeo from '../data/tambons.json';
import districtGeo from '../data/districts.json';
import { FLOOD_POINTS } from '../data/seasons.js';
import { LEVEL_LABEL } from '../lib/risk.js';

export const LEVEL_COLOR = { none: '#cfe3c8', watch: '#f7d154', alert: '#f08a24', high: '#d43d3d', nodata: '#d9d9d9' };

export default function MapView(props) {
  const { levels, selected, onSelect, district, showBase, showFlood, labelFor } = props;
  const box = useRef(null);
  const map = useRef(null);
  const tLayer = useRef(null);
  const base = useRef(null);
  const floodLayer = useRef(null);
  const cb = useRef({});
  cb.current = { levels: levels, selected: selected, onSelect: onSelect, labelFor: labelFor, district: district };

  function styleFor(f) {
    const c = cb.current;
    const id = f.properties.id;
    const lv = c.levels[id] || 'nodata';
    const sel = c.selected === id;
    const dim = c.district && f.properties.amp !== c.district;
    return {
      fillColor: LEVEL_COLOR[lv], fillOpacity: dim ? 0.25 : 0.85,
      color: sel ? '#111' : '#ffffff', weight: sel ? 3 : 0.8, opacity: 1
    };
  }

  useEffect(function () {
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, minZoom: 7, maxZoom: 14, zoomSnap: 0.25 });
    map.current = m;
    m.attributionControl.setPrefix(false);
    tLayer.current = L.geoJSON(tambonGeo, {
      style: styleFor,
      onEachFeature: function (f, layer) {
        layer.on('click', function () { cb.current.onSelect(f.properties.id); });
        layer.bindTooltip(function () {
          const c = cb.current;
          const lv = c.levels[f.properties.id] || 'nodata';
          return '<b>ต.' + f.properties.tam + '</b> อ.' + f.properties.amp + '<br>' + (lv === 'nodata' ? 'ไม่มีข้อมูล' : LEVEL_LABEL[lv]) + (c.labelFor ? c.labelFor(f.properties.id) : '');
        }, { sticky: true, direction: 'top', opacity: 0.95 });
      }
    }).addTo(m);
    L.geoJSON(districtGeo, { style: { fill: false, color: '#2b3a2f', weight: 1.6, opacity: 0.75 }, interactive: false }).addTo(m);
    districtGeo.features.forEach(function (f) {
      L.marker([f.properties.lat, f.properties.lon], {
        interactive: false,
        icon: L.divIcon({ className: 'amp-label', html: '<span>' + f.properties.amp + '</span>', iconSize: [0, 0] })
      }).addTo(m);
    });
    floodLayer.current = L.layerGroup(FLOOD_POINTS.map(function (p) {
      return L.circleMarker([p.lat, p.lon], { radius: 6, color: '#1c5fa8', weight: 2, fillColor: '#5aa9f0', fillOpacity: 0.9 })
        .bindTooltip('จุดเสี่ยงน้ำท่วม (แผนฯ): ' + p.name);
    }));
    m.fitBounds(tLayer.current.getBounds(), { padding: [10, 10] });
    const ro = new ResizeObserver(function () { m.invalidateSize({ pan: false }); if (!cb.current.district) m.fitBounds(tLayer.current.getBounds(), { padding: [10, 10], animate: false }); });
    ro.observe(box.current);
    return function () { ro.disconnect(); m.remove(); };
  }, []);

  useEffect(function () {
    if (tLayer.current) tLayer.current.setStyle(styleFor);
  }, [levels, selected, district]);

  useEffect(function () {
    const m = map.current;
    if (!m) return;
    if (showBase && !base.current) {
      base.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', subdomains: 'abc', maxZoom: 18, opacity: 0.55
      });
    }
    if (base.current) {
      if (showBase) base.current.addTo(m).bringToBack(); else base.current.remove();
    }
  }, [showBase]);

  useEffect(function () {
    const m = map.current;
    if (!m || !floodLayer.current) return;
    if (showFlood) floodLayer.current.addTo(m); else floodLayer.current.remove();
  }, [showFlood]);

  useEffect(function () {
    const m = map.current;
    if (!m || !tLayer.current) return;
    if (district) {
      const b = L.latLngBounds([]);
      tLayer.current.eachLayer(function (l) { if (l.feature.properties.amp === district) b.extend(l.getBounds()); });
      if (b.isValid()) m.fitBounds(b, { padding: [20, 20] });
    } else {
      m.fitBounds(tLayer.current.getBounds(), { padding: [10, 10] });
    }
  }, [district]);

  useEffect(function () {
    const m = map.current;
    if (!m || !tLayer.current || !selected) return;
    tLayer.current.eachLayer(function (l) {
      if (l.feature.properties.id === selected) {
        l.bringToFront();
      }
    });
  }, [selected]);

  return <div className="map" ref={box} role="application" aria-label="แผนที่ความเสี่ยงรายตำบล จังหวัดเพชรบูรณ์" />;
}
