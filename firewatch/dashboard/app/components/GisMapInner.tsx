'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HazardFilter } from './Header';

interface GisMapProps {
  nodes: any[];
  gateways: any[];
  selectedNode: any;
  onSelectNode: (node: any) => void;
  filter: HazardFilter;
}

export default function GisMapInner({
  nodes,
  gateways,
  selectedNode,
  onSelectNode,
  filter,
}: GisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [18.54, 73.88],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Free Dark Canvas basemap tiles (No API key required, no watermarks)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Esri, HERE, MapmyIndia, OpenStreetMap',
    }).addTo(map);

    // Reference labels overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Lines
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const lg = layerGroupRef.current;
    lg.clearLayers();

    // 1. Draw Gateways
    const gwMap: Record<string, [number, number]> = {};
    gateways.forEach((gw) => {
      const [lng, lat] = gw.location.coordinates;
      gwMap[gw._id] = [lat, lng];

      // Gateway Pulsing Icon
      const gwIcon = L.divIcon({
        className: 'custom-gw-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-2 rounded-full bg-cyan-500/20 radar-dot"></div>
            <div class="h-8 w-8 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
            </div>
            <span class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-cyan-300 whitespace-nowrap">${gw._id}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const m = L.marker([lat, lng], { icon: gwIcon });
      m.bindPopup(`
        <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 4px;">
          <h4 style="font-weight: bold; margin-bottom: 4px;">📡 ${gw._id}</h4>
          <p>MCU: ${gw.mcu}</p>
          <p>Radio: ${gw.radio?.type} (Ch ${gw.radio?.channel})</p>
          <p>Heard Nodes: ${gw.nodesHeard?.length || 0}</p>
        </div>
      `);
      lg.addLayer(m);
    });

    // 2. Filter & Draw Nodes based on 4 unique tabs
    const filteredNodes = nodes.filter((n) => {
      if (filter === 'ALL') return true;
      if (filter === 'FF') return n.hazards?.includes('FF') || n.nodeType === 'FG';
      if (filter === 'GL') return n.hazards?.includes('GL') || n.nodeType === 'FG';
      if (filter === 'FL') return n.hazards?.includes('FL') || n.nodeType === 'FS';
      if (filter === 'LS') return n.hazards?.includes('LS') || n.nodeType === 'FS';
      return true;
    });

    filteredNodes.forEach((node) => {
      const [lng, lat] = node.location.coordinates;
      const gwId = node.radio?.gatewayId;
      const gwCoords = gwMap[gwId];
      const isNodeActive = node.status?.toLowerCase() === 'active';
      const statusText = isNodeActive ? 'ACTIVE' : 'INACTIVE';
      const statusColor = isNodeActive ? '#10b981' : '#94a3b8';
      const riskLevel = node.latestReading?.risk?.level || 'NORMAL';

      // Draw animated radio hop line to its gateway when active
      if (gwCoords) {
        const polyline = L.polyline([[lat, lng], gwCoords], {
          color: node.nodeType === 'FG' ? '#f97316' : '#38bdf8',
          weight: isNodeActive ? 2 : 1.5,
          opacity: isNodeActive ? 0.8 : 0.25,
          dashArray: isNodeActive ? '6, 8' : '4, 6',
          className: isNodeActive ? 'lora-link-active' : '',
        });
        lg.addLayer(polyline);
      }

      let ringColor = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
      let haloColor = 'rgba(16, 185, 129, 0.4)';

      if (riskLevel === 'CRITICAL') {
        ringColor = 'border-red-500 bg-red-500/20 text-red-400';
        haloColor = 'rgba(239, 68, 68, 0.6)';
      } else if (riskLevel === 'HIGH') {
        ringColor = 'border-orange-500 bg-orange-500/20 text-orange-400';
        haloColor = 'rgba(249, 115, 22, 0.5)';
      } else if (riskLevel === 'WATCH') {
        ringColor = 'border-amber-400 bg-amber-400/20 text-amber-300';
        haloColor = 'rgba(245, 158, 11, 0.45)';
      }

      const isSelected = selectedNode && selectedNode._id === node._id;

      // Node marker DivIcon with active animated beacon
      const nodeIcon = L.divIcon({
        className: 'custom-node-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            ${
              isNodeActive
                ? `<div class="absolute -inset-3.5 rounded-full ${riskLevel === 'CRITICAL' ? 'beacon-pulse-critical' : 'beacon-pulse-active'}" style="background-color: ${haloColor};"></div>`
                : (riskLevel !== 'NORMAL' ? `<div class="absolute -inset-3 rounded-full radar-dot" style="background-color: ${haloColor};"></div>` : '')
            }
            <div class="h-7 w-7 rounded-lg border-2 ${ringColor} flex items-center justify-center bg-slate-950 shadow-md ${
          isSelected ? 'ring-2 ring-white scale-125' : ''
        }">
              ${
                node.nodeType === 'FG'
                  ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
                  : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`
              }
            </div>
            <span class="absolute -bottom-4 px-1 py-0.2 rounded bg-slate-900/90 border border-slate-800 text-[9px] font-mono text-slate-300">${node._id.slice(-4)}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: nodeIcon });
      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 4px; min-width: 170px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 13px;">🛰️ ${node._id}</strong>
            <span style="background: ${isNodeActive ? '#ecfdf5' : '#f1f5f9'}; color: ${statusColor}; border: 1px solid ${statusColor}; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 4px;">
              ${statusText}
            </span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <div>Type: <strong>${node.nodeType}</strong> (${node.hazards?.join(', ') || ''})</div>
            <div>Gateway: <strong>${gwId}</strong></div>
            <div>Status: <strong style="color: ${statusColor};">${statusText}</strong></div>
            <div>Risk: <strong style="color: ${riskLevel === 'CRITICAL' ? '#ef4444' : riskLevel === 'HIGH' ? '#f97316' : '#10b981'};">${riskLevel}</strong></div>
          </div>
        </div>
      `);
      marker.on('click', () => {
        onSelectNode(node);
      });
      lg.addLayer(marker);
    });
  }, [nodes, gateways, selectedNode, onSelectNode, filter]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[420px] rounded-2xl" />;
}
