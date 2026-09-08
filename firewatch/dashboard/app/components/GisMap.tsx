'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Layers } from 'lucide-react';
import { HazardFilter } from './Header';

const DynamicMap = dynamic(() => import('./GisMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] bg-slate-900/60 animate-pulse rounded-2xl flex items-center justify-center font-mono text-xs text-slate-500">
      Loading GIS LoRa Grid...
    </div>
  ),
});

interface GisMapProps {
  nodes: any[];
  gateways: any[];
  selectedNode: any;
  onSelectNode: (node: any) => void;
  filter: HazardFilter;
}

export default function GisMap(props: GisMapProps) {
  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden glass-panel border border-slate-800">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[400] bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-300 flex items-center gap-2 shadow-lg pointer-events-none">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <span>PUNE GRID (E32 LoRa 30dBm / 4km step)</span>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-3 py-2 rounded-xl font-mono text-[11px] text-slate-300 flex flex-wrap items-center gap-3 shadow-lg pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-orange-500" />
          <span>Fire/Gas (FG)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-blue-500" />
          <span>Flood/Slope (FS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-cyan-400 bg-slate-900" />
          <span>Gateway (GW)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span>Critical Alarm</span>
        </div>
      </div>

      <DynamicMap {...props} />
    </div>
  );
}
