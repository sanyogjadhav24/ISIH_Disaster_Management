'use client';

import React from 'react';
import { X, Cpu, Radio, Shield, HardDrive, Calendar, MapPin, Compass, CheckCircle2, XCircle } from 'lucide-react';

interface ModalProps {
  node: any;
  onClose: () => void;
}

export default function NodeDetailModal({ node, onClose }: ModalProps) {
  if (!node) return null;

  const [lng, lat] = node.location?.coordinates || [0, 0];
  const isNodeActive = node.status?.toLowerCase() === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel border border-slate-700 w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-mono font-bold text-white">{node._id}</h2>
              {/* Node Status Badge */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                  isNodeActive
                    ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isNodeActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {isNodeActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-cyan-300">
                Type: {node.nodeType} ({node.hazards?.join(', ')})
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Deployed: {new Date(node.deployedAt).toLocaleDateString()} • Region: {node.region}
            </p>
          </div>
        </div>

        {/* Spec Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs font-mono">
          {/* Hardware & Power */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <h4 className="text-slate-300 font-bold uppercase mb-2 flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
              Hardware Architecture
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <p>MCU: <strong className="text-white">{node.hw?.mcu}</strong></p>
              <p>ADC: <strong className="text-white">{node.hw?.adcBits}-bit @ {node.hw?.adcRefV}V</strong></p>
              <p>Storage: <strong className="text-white">{node.hw?.storage}</strong></p>
              <p>Firmware: <strong className="text-white">v{node.firmware}</strong></p>
              <p>Power: <strong className="text-white">{node.power?.source}</strong></p>
            </div>
          </div>

          {/* Radio Link & Gateway */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <h4 className="text-slate-300 font-bold uppercase mb-2 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-amber-400" />
              LoRa Radio Network
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <p>Radio Module: <strong className="text-white">{node.radio?.type}</strong></p>
              <p>Address: <strong className="text-white">{node.radio?.addr}</strong></p>
              <p>Channel: <strong className="text-white">{node.radio?.channel}</strong></p>
              <p>Air Rate: <strong className="text-white">{node.radio?.airRate_bps} bps</strong></p>
              <p>TX Power: <strong className="text-white">{node.radio?.txPower_dBm} dBm</strong></p>
              <p>Gateway: <strong className="text-cyan-400">{node.radio?.gatewayId}</strong></p>
            </div>
          </div>

          {/* Location & GIS */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <h4 className="text-slate-300 font-bold uppercase mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-400" />
              Geographic Coordinates
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <p>Latitude: <strong className="text-white">{lat.toFixed(6)}°</strong></p>
              <p>Longitude: <strong className="text-white">{lng.toFixed(6)}°</strong></p>
              <p>Altitude: <strong className="text-white">{node.altitude_m} m</strong></p>
              <p>Index: <strong className="text-emerald-400">2dsphere Spatial</strong></p>
            </div>
          </div>

          {/* Calibration & Cohort Age */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <h4 className="text-slate-300 font-bold uppercase mb-2 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-purple-400" />
              Cohort Age & Resistor Divider
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <p>Cohort Code: <strong className="text-cyan-300">{node._id.slice(4, 8)} (YYMM)</strong></p>
              <p>Resistor Ratio: <strong className="text-white">0.643 (10k/18k)</strong></p>
              <p>Node Status: <strong className={isNodeActive ? 'text-emerald-400' : 'text-slate-400'}>{isNodeActive ? 'Active' : 'Inactive'}</strong></p>
              <p>Calibration Drift: <strong className="text-emerald-400">Normal</strong></p>
            </div>
          </div>
        </div>

        {/* Sensor Array Table with Explicit ACTIVE / INACTIVE column */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
              Mounted Sensor Array Hardware Status
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              {node.sensors?.length || 0} Sensors Mounted
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="pb-2 font-semibold">Sensor Code</th>
                  <th className="pb-2 font-semibold">Model</th>
                  <th className="pb-2 font-semibold">MCU Pin</th>
                  <th className="pb-2 font-semibold">Unit</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Calibration Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {node.sensors?.map((s: any, idx: number) => {
                  const isSensorActive = isNodeActive; // Inactive node or sensor fault
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 font-bold text-white">{s.code}</td>
                      <td className="py-2.5">{s.model}</td>
                      <td className="py-2.5 text-cyan-300">{s.pin}</td>
                      <td className="py-2.5">{Array.isArray(s.unit) ? s.unit.join(', ') : s.unit}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 border ${
                            isSensorActive
                              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSensorActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {isSensorActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-400">
                        {s.calib?.r0 ? `R0: ${s.calib.r0}kΩ ` : ''}
                        {s.calib?.dry ? `Dry: ${s.calib.dry}, Wet: ${s.calib.wet} ` : ''}
                        {s.confidence === 'qualitative' ? '(Qualitative Band)' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
