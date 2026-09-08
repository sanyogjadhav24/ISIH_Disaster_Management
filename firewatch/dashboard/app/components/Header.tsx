'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Radio, RefreshCw, Flame, AlertTriangle, Waves, Mountain, Activity, PhoneCall } from 'lucide-react';

export type HazardFilter = 'ALL' | 'FF' | 'GL' | 'FL' | 'LS';

interface HeaderProps {
  stats: any;
  activeFilter: HazardFilter;
  setActiveFilter: (f: HazardFilter) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function Header({
  stats,
  activeFilter,
  setActiveFilter,
  onRefresh,
  loading,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const criticals = stats?.events?.critical || 0;
  const highs = stats?.events?.high || 0;

  const tabs: { id: HazardFilter; label: string; icon: React.ReactNode; count: number; activeClass: string }[] = [
    {
      id: 'ALL',
      label: 'All Hazards',
      icon: <Activity className="h-3.5 w-3.5 text-cyan-400" />,
      count: stats?.nodes?.total || 12,
      activeClass: 'bg-slate-700 text-white shadow-sm border-slate-600',
    },
    {
      id: 'FF',
      label: 'Forest Fire',
      icon: <Flame className="h-3.5 w-3.5 text-red-400" />,
      count: stats?.nodes?.fg || 8,
      activeClass: 'bg-gradient-to-r from-red-900/90 to-amber-900/90 border-red-500/50 text-red-100 shadow-sm',
    },
    {
      id: 'GL',
      label: 'Gas Leak',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
      count: stats?.nodes?.fg || 8,
      activeClass: 'bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-amber-500/50 text-amber-100 shadow-sm',
    },
    {
      id: 'FL',
      label: 'Flood',
      icon: <Waves className="h-3.5 w-3.5 text-blue-400" />,
      count: stats?.nodes?.fs || 4,
      activeClass: 'bg-gradient-to-r from-blue-900/90 to-cyan-900/90 border-blue-500/50 text-blue-100 shadow-sm',
    },
    {
      id: 'LS',
      label: 'Landslide',
      icon: <Mountain className="h-3.5 w-3.5 text-emerald-400" />,
      count: stats?.nodes?.fs || 4,
      activeClass: 'bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border-emerald-500/50 text-emerald-100 shadow-sm',
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-cyan-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-950/40">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono font-bold tracking-wider text-base lg:text-lg text-white">
                DISASTER WATCH <span className="text-cyan-400 font-sans font-light text-xs border border-cyan-500/30 px-2 py-0.5 rounded-full bg-cyan-950/40">MULTI-HAZARD MESH</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                (stats?.nodes?.online || 0) > 0
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900/90 border-slate-700 text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  (stats?.nodes?.online || 0) > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`} />
                {(stats?.nodes?.online || 0) > 0 ? `ONLINE (${stats.nodes.online} ACTIVE)` : 'STANDBY (AWAITING PACKETS)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              LoRa E32-900T30D • Edge QC Filter • Timeseries Engine
            </p>
          </div>
        </div>

        {/* Center: 4 Unique Hazard Tabs (+ All) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                  isActive
                    ? tab.activeClass
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300 font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Alarms counter & Refresh & Clock */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-[11px] font-semibold">
            <PhoneCall className="h-3 w-3 text-red-400 animate-pulse" />
            <span>SMS & CALL BROADCAST ARMED</span>
          </span>

          {criticals > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/80 border border-red-500/50 rounded-lg text-red-300 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>{criticals} CRITICAL</span>
            </div>
          )}
          {highs > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-500/50 rounded-lg text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{highs} HIGH</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span>{timeStr || 'Loading...'}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60 disabled:opacity-50"
            title="Refresh Network Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
