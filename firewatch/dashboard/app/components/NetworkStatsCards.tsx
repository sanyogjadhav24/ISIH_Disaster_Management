'use client';

import React from 'react';
import { Cpu, Radio, Database, ShieldCheck, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface StatsProps {
  stats: any;
}

export default function NetworkStatsCards({ stats }: StatsProps) {
  const nodes = stats?.nodes || { total: 12, fg: 8, fs: 4, online: 12 };
  const gateways = stats?.gateways || { total: 2, online: 2 };
  const readings = stats?.readings?.total || 23143;
  const events = stats?.events?.total || 113;
  const openEvents = stats?.events?.open || 0;
  const telemetry = stats?.telemetry || { avgRssi: -94, avgLatency: 3600, crossCheckHoldRate: 18 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Nodes */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Deployed Mesh Nodes</span>
          <span className="h-8 w-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-white">{nodes.total}</span>
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
            nodes.online > 0
              ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
              : 'text-slate-400 bg-slate-900 border-slate-700'
          }`}>
            {nodes.online > 0 ? `${nodes.online} ACTIVE` : 'INACTIVE (STANDBY)'}
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>FG: <strong className="text-red-400 font-semibold">{nodes.fg}</strong> (Fire/Gas)</span>
          <span>FS: <strong className="text-blue-400 font-semibold">{nodes.fs}</strong> (Flood/Slope)</span>
        </div>
      </div>

      {/* Card 2: Gateways & LoRa Link */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">LoRa Radio Link</span>
          <span className="h-8 w-8 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Radio className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-white">{telemetry.avgRssi}</span>
          <span className="text-xs font-mono text-slate-400">dBm (Avg RSSI)</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Gateways: <strong className="text-amber-400">{gateways.total} ESP32</strong></span>
          <span>Latency: <strong className="text-slate-200">{(telemetry.avgLatency / 1000).toFixed(1)}s</strong></span>
        </div>
      </div>

      {/* Card 3: Time-Series Telemetry */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Time-Series Readings</span>
          <span className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-white">{(readings / 1000).toFixed(1)}k</span>
          <span className="text-xs font-mono text-emerald-400">10-MIN INTERVALS</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Storage: <strong className="text-slate-200">Columnar BSON</strong></span>
          <span>Window: <strong className="text-slate-200">60s 1Hz ring</strong></span>
        </div>
      </div>

      {/* Card 4: Edge Filter & Alerts */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Incidents / Events</span>
          <span className="h-8 w-8 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-white">{events}</span>
          <span className="text-xs font-mono text-amber-400 font-medium">{openEvents} ACTIONABLE</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Cross-Check: <strong className="text-cyan-400">Active</strong></span>
          <span>Suppression: <strong className="text-slate-200">{telemetry.crossCheckHoldRate}% HOLD</strong></span>
        </div>
      </div>
    </div>
  );
}
