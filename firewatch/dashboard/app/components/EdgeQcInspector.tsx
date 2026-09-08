'use client';

import React from 'react';
import { ShieldCheck, Filter, Cpu, CheckCircle2, AlertTriangle, HardDrive, Binary } from 'lucide-react';

interface EdgeQcProps {
  selectedNode: any;
}

export default function EdgeQcInspector({ selectedNode }: EdgeQcProps) {
  if (!selectedNode) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[220px]">
        <Filter className="h-8 w-8 text-slate-600 mb-2" />
        <h3 className="font-mono text-sm text-slate-300">Edge QC & Anomaly Inspector</h3>
        <p className="text-xs text-slate-500 font-mono mt-1 max-w-sm">
          Select any node on the map or matrix above to inspect its 1Hz ring-buffer edge filtering, kurtosis, MAD, and raw 12-bit ADC counts.
        </p>
      </div>
    );
  }

  const reading = selectedNode.latestReading;
  const q = reading?.q || { flags: [], kurt: {}, mad: {}, nWin: 60, rejected: 0, crossCheck: 'PASS' };
  const adc = reading?.adc || {};
  const link = reading?.link || { latency_ms: 3800, rssi: -94, seq: 1200 };
  const sdRef = reading?.sdRef || 'N/A';

  const isHold = q.crossCheck === 'HOLD';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold text-white flex items-center gap-2">
              Edge Quality Control Diagnostics • <span className="text-cyan-400">{selectedNode._id}</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Sampling: 1Hz (60s ring buffer) • Transmit Interval: 10 min • MCU: {selectedNode.hw?.mcu || 'MKR Zero'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
            isHold
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
          }`}>
            {isHold ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Cross-Check: {q.crossCheck || 'PASS'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Rejects: <strong className="text-white">{q.rejected || 0}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* 1. Quality Flags */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-cyan-400" />
              Active Quality Flags
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {q.flags?.length || 0}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[60px] items-start">
            {q.flags && q.flags.length > 0 ? (
              q.flags.map((flag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800 border border-slate-700 text-cyan-300"
                >
                  {flag}
                </span>
              ))
            ) : (
              <span className="text-xs font-mono text-slate-500 italic">No anomalies flagged in this window</span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-800/80 pt-1.5">
            Trims mild outliers (Z &gt; 3.5), flags severe excursions (Z &gt; 9.0)
          </p>
        </div>

        {/* 2. Statistical Dispersion (Kurtosis & MAD) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-amber-400" />
              Kurtosis & Dispersion
            </span>
            <span className="text-[10px] font-mono text-slate-400">Gate: k &gt; 3.0</span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            {q.kurt && Object.keys(q.kurt).length > 0 ? (
              Object.entries(q.kurt).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase">{key}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 font-semibold">k: {Number(val)}</span>
                    <span className="text-slate-500">mad: {q.mad?.[key] ?? '--'}</span>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs font-mono text-slate-500 italic">Telemetry channels normal</span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-800/80 pt-1.5">
            Heavy-tail detection distinguishes impulsive bursts from real ramps
          </p>
        </div>

        {/* 3. Raw 12-Bit ADC Counts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-1.5">
              <Binary className="h-3.5 w-3.5 text-purple-400" />
              Raw 12-Bit ADC Counts
            </span>
            <span className="text-[10px] font-mono text-slate-400">0 - 4095</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(adc).map(([ch, count]) => (
              <div key={ch} className="bg-slate-950/80 rounded p-1.5 border border-slate-800/60 flex justify-between">
                <span className="text-slate-400 uppercase">{ch}</span>
                <span className="text-white font-bold">{count as number}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-cyan-400" />
              SD Backup:
            </span>
            <span className="text-slate-300 truncate max-w-[120px]" title={sdRef}>
              {sdRef}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
