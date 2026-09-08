'use client';

import React from 'react';
import { Flame, Waves, Wind, Droplets, Gauge, AlertCircle, AlertTriangle, Mountain, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { HazardFilter } from './Header';

interface HazardPanelsProps {
  nodes: any[];
  onSelectNode: (node: any) => void;
  selectedNode: any;
  filter: HazardFilter;
}

export default function HazardPanels({
  nodes,
  onSelectNode,
  selectedNode,
  filter,
}: HazardPanelsProps) {
  // Filter nodes according to 4 unique tabs
  const fgNodes = nodes.filter((n) => n.nodeType === 'FG');
  const fsNodes = nodes.filter((n) => n.nodeType === 'FS');

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/90 border border-red-500 text-red-400 animate-pulse">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-orange-950/90 border border-orange-500 text-orange-400">
            HIGH
          </span>
        );
      case 'WATCH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/90 border border-amber-500 text-amber-300">
            WATCH
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900 border border-slate-700 text-slate-400">
            NORMAL
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const isActive = status?.toLowerCase() === 'active';
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${
          isActive
            ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-400 shadow-sm shadow-emerald-950/50'
            : 'bg-slate-900 border-slate-700 text-slate-400'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
        {isActive ? 'ACTIVE' : 'INACTIVE'}
      </span>
    );
  };

  const getSensorStatusBadge = (isNodeActive: boolean, value: any) => {
    const isLive = isNodeActive && value !== undefined && value !== null && !isNaN(value);
    return isLive ? (
      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.2 rounded inline-flex items-center gap-0.5">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        ACTIVE
      </span>
    ) : (
      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900/90 border border-slate-700/80 px-1 py-0.2 rounded inline-flex items-center gap-0.5">
        <span className="h-1 w-1 rounded-full bg-slate-500" />
        INACTIVE
      </span>
    );
  };

  const showFireGas = filter === 'ALL' || filter === 'FF' || filter === 'GL';
  const showFloodSlope = filter === 'ALL' || filter === 'FL' || filter === 'LS';
  const isSingleView = filter !== 'ALL';

  const activeFgCount = fgNodes.filter((n) => n.status?.toLowerCase() === 'active').length;
  const activeFsCount = fsNodes.filter((n) => n.status?.toLowerCase() === 'active').length;

  return (
    <div className={`grid gap-6 ${isSingleView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {/* 1. Fire & Gas Panel (Shown for ALL, FF, or GL) */}
      {showFireGas && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  filter === 'GL'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {filter === 'GL' ? <AlertTriangle className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-white">
                  {filter === 'FF'
                    ? 'Forest Fire Telemetry Array (FF)'
                    : filter === 'GL'
                    ? 'Gas Leak Telemetry Array (GL)'
                    : 'Fire & Gas Telemetry Matrix'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {filter === 'FF'
                    ? 'DHT11 Temp/RH, PMS5003 Smoke PM2.5, MQ-135 Air Quality'
                    : filter === 'GL'
                    ? 'MQ-4 (CH4 Methane), MQ-7 (CO Qualitative), MQ-135 VOCs'
                    : 'MQ-4 (CH4), MQ-7 (CO Qualitative), MQ-135, PM2.5, DHT11'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                activeFgCount > 0
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                {activeFgCount > 0 ? `${activeFgCount} Nodes Active` : `${fgNodes.length} Nodes Inactive (Standby)`}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {fgNodes.map((node) => {
              const v = node.latestReading?.v || {};
              const risk = node.latestReading?.risk || { level: 'NORMAL', score: 0 };
              const isSelected = selectedNode?._id === node._id;
              const isNodeActive = node.status?.toLowerCase() === 'active';

              return (
                <div
                  key={node._id}
                  onClick={() => onSelectNode(node)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Card Header: Node ID, Status Badge, Risk Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wide">{node._id}</span>
                      <span className="text-[10px] font-mono text-slate-400">GW: {node.radio?.gatewayId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Node Status Badge */}
                      {getStatusBadge(node.status)}
                      {/* Risk Level Badge */}
                      {getRiskBadge(risk.level)}
                    </div>
                  </div>

                  {/* Sensor Channels Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-center">
                    {/* Temp (DHT11) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'FF'
                          ? 'bg-red-950/30 border-red-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Temp</span>
                        {getSensorStatusBadge(isNodeActive, v.temp_c)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.temp_c !== undefined ? `${v.temp_c}°C` : '--'}
                      </span>
                    </div>

                    {/* Humidity (DHT11) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'FF'
                          ? 'bg-red-950/30 border-red-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Humidity</span>
                        {getSensorStatusBadge(isNodeActive, v.rh_pct)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.rh_pct !== undefined ? `${v.rh_pct}%` : '--'}
                      </span>
                    </div>

                    {/* PM2.5 (PMS5003) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'FF'
                          ? 'bg-red-950/30 border-red-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>PM2.5</span>
                        {getSensorStatusBadge(isNodeActive, v.pm25)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.pm25 !== undefined ? v.pm25 : '--'}
                      </span>
                    </div>

                    {/* CH4 (MQ-4) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'GL'
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>CH4 (MQ4)</span>
                        {getSensorStatusBadge(isNodeActive, v.mq4_ppm)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.mq4_ppm !== undefined ? `${v.mq4_ppm}ppm` : '--'}
                      </span>
                    </div>

                    {/* CO (MQ-7) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'GL'
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>CO (MQ7)</span>
                        {getSensorStatusBadge(isNodeActive, v.mq7_ppm)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.mq7_ppm !== undefined ? `${v.mq7_ppm}*` : '--'}
                      </span>
                    </div>

                    {/* VOC (MQ-135) */}
                    <div
                      className={`rounded-lg p-1.5 border transition-colors ${
                        filter === 'GL' || filter === 'FF'
                          ? 'bg-cyan-950/30 border-cyan-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>VOC (135)</span>
                        {getSensorStatusBadge(isNodeActive, v.mq135_ppm)}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {v.mq135_ppm !== undefined ? `${v.mq135_ppm}ppm` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-3 italic">
            *Sensors display INACTIVE until live hardware telemetry packets are received and verified.
          </p>
        </div>
      )}

      {/* 2. Flood & Slope Panel (Shown for ALL, FL, or LS) */}
      {showFloodSlope && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  filter === 'LS'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                }`}
              >
                {filter === 'LS' ? <Mountain className="h-4 w-4" /> : <Waves className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-white">
                  {filter === 'FL'
                    ? 'Flood Sensing Array (FL)'
                    : filter === 'LS'
                    ? 'Landslide & Slope Stability Array (LS)'
                    : 'Flood & Slope Telemetry Matrix'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {filter === 'FL'
                    ? 'LM393 Soil Moisture %, Hydraulic Saturation Thresholds'
                    : filter === 'LS'
                    ? 'SW-420 Seismic Geophone, Vibration Window, RMS Acceleration'
                    : 'LM393 Soil Moisture %, SW-420 Seismic Vibration Triggers'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                activeFsCount > 0
                  ? 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                {activeFsCount > 0 ? `${activeFsCount} Nodes Active` : `${fsNodes.length} Nodes Inactive (Standby)`}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {fsNodes.map((node) => {
              const v = node.latestReading?.v || {};
              const risk = node.latestReading?.risk || { level: 'NORMAL', score: 0 };
              const isSelected = selectedNode?._id === node._id;
              const isNodeActive = node.status?.toLowerCase() === 'active';

              return (
                <div
                  key={node._id}
                  onClick={() => onSelectNode(node)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Card Header: Node ID, Status Badge, Risk Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wide">{node._id}</span>
                      <span className="text-[10px] font-mono text-slate-400">GW: {node.radio?.gatewayId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Node Status Badge */}
                      {getStatusBadge(node.status)}
                      {/* Risk Level Badge */}
                      {getRiskBadge(risk.level)}
                    </div>
                  </div>

                  {/* Sensor Channels Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-center">
                    {/* Soil Saturation (LM393) */}
                    <div
                      className={`rounded-lg p-2 border transition-colors ${
                        filter === 'FL'
                          ? 'bg-blue-950/30 border-blue-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Soil Saturation</span>
                        {getSensorStatusBadge(isNodeActive, v.soil_pct)}
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-300">
                        {v.soil_pct !== undefined ? `${v.soil_pct}%` : '--'}
                      </span>
                    </div>

                    {/* Vibration Window (SW-420) */}
                    <div
                      className={`rounded-lg p-2 border transition-colors ${
                        filter === 'LS'
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Vibration Count</span>
                        {getSensorStatusBadge(isNodeActive, v.vib_count)}
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-300">
                        {v.vib_count !== undefined ? `${v.vib_count} count` : '--'}
                      </span>
                    </div>

                    {/* Vibration RMS */}
                    <div
                      className={`rounded-lg p-2 border transition-colors ${
                        filter === 'LS'
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Vib RMS</span>
                        {getSensorStatusBadge(isNodeActive, v.vib_rms)}
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-300">
                        {v.vib_rms !== undefined ? v.vib_rms : '--'}
                      </span>
                    </div>

                    {/* Peak Trigger Duration */}
                    <div
                      className={`rounded-lg p-2 border transition-colors ${
                        filter === 'LS'
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-950/80 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase mb-0.5">
                        <span>Trigger Window</span>
                        {getSensorStatusBadge(isNodeActive, v.vib_peak_ms)}
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-300">
                        {v.vib_peak_ms !== undefined ? `${v.vib_peak_ms}ms` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-3 italic">
            *Sensors display INACTIVE until live hardware telemetry packets are received and verified.
          </p>
        </div>
      )}
    </div>
  );
}
