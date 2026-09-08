'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, Clock, RefreshCw, BarChart3 } from 'lucide-react';

interface TelemetryChartProps {
  selectedNode: any;
}

export default function TelemetryChart({ selectedNode }: TelemetryChartProps) {
  const [readings, setReadings] = useState<any[]>([]);
  const [hours, setHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode) return;

    const fetchReadings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/readings?nodeId=${selectedNode._id}&hours=${hours}&limit=150`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Format for charts
          const formatted = json.data.map((r: any) => ({
            time: new Date(r.ts).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            temp: r.v?.temp_c,
            humidity: r.v?.rh_pct,
            pm25: r.v?.pm25,
            ch4: r.v?.mq4_ppm,
            co: r.v?.mq7_ppm,
            soil: r.v?.soil_pct,
            vib: r.v?.vib_count,
            riskScore: r.risk?.score ? Math.round(r.risk.score * 100) : 0,
            flagsCount: r.q?.flags?.length || 0,
          }));
          setReadings(formatted);
        }
      } catch (err) {
        console.error('Failed to load telemetry readings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [selectedNode, hours]);

  if (!selectedNode) return null;

  const isFG = selectedNode.nodeType === 'FG';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold text-white">
              Telemetry Timeseries Dynamics • <span className="text-cyan-400">{selectedNode._id}</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              10-Minute Transmit Interval • BSON Columnar Compressed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono text-xs">
          {[6, 24, 72, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                hours === h
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {h >= 24 ? `${h / 24}d` : `${h}h`}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-[280px] w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center font-mono text-xs text-slate-500 gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            Loading timeseries history...
          </div>
        ) : readings.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center font-mono text-xs text-slate-500">
            No readings recorded for this window.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '11px', paddingTop: '10px' }} />

              {isFG ? (
                <>
                  <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#f97316" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="humidity" name="RH (%)" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#eab308" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="ch4" name="CH4 (ppm)" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="riskScore" name="Risk %" stroke="#a855f7" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="soil" name="Soil Saturation (%)" stroke="#38bdf8" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="vib" name="Vibration Triggers" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="riskScore" name="Risk %" stroke="#ef4444" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
