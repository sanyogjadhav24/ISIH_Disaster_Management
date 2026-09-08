'use client';

import React, { useState } from 'react';
import { AlertOctagon, CheckCircle, AlertTriangle, XCircle, Clock, Check, ShieldCheck, ChevronRight, MessageSquare, PhoneCall, CheckCheck } from 'lucide-react';

interface IncidentQueueProps {
  events: any[];
  onUpdateEventState: (eventId: string, newState: string) => Promise<void>;
  onSelectNodeById: (nodeId: string) => void;
}

export default function IncidentQueue({
  events,
  onUpdateEventState,
  onSelectNodeById,
}: IncidentQueueProps) {
  const [filterState, setFilterState] = useState<string>('OPEN');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dispatchedAlerts, setDispatchedAlerts] = useState<Record<string, 'SMS' | 'VOICE_CALL' | 'BOTH'>>({});
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const filteredEvents = events.filter((ev) => {
    if (filterState === 'ALL') return true;
    return (ev.ack?.state || 'OPEN') === filterState;
  });

  const handleStateChange = async (evId: string, state: string) => {
    setUpdatingId(evId);
    try {
      await onUpdateEventState(evId, state);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDispatchAlert = async (ev: any, type: 'SMS' | 'VOICE_CALL') => {
    const evId = String(ev._id);
    setDispatchingId(`${evId}-${type}`);
    try {
      const res = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          eventId: evId,
          nodeId: ev.nodeId,
          hazard: ev.hazard,
          level: ev.level,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchedAlerts((prev) => {
          const current = prev[evId];
          let updated: 'SMS' | 'VOICE_CALL' | 'BOTH' = type;
          if ((current === 'SMS' && type === 'VOICE_CALL') || (current === 'VOICE_CALL' && type === 'SMS')) {
            updated = 'BOTH';
          }
          return { ...prev, [evId]: updated };
        });

        // Trigger browser audio speech if voice call
        if (type === 'VOICE_CALL' && data.data?.voiceSpeechText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(data.data.voiceSpeechText);
            utterance.rate = 1.0;
            utterance.pitch = 1.05;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Speech error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to dispatch alert from incident card:', err);
    } finally {
      setDispatchingId(null);
    }
  };

  const getHazardLabel = (h: string) => {
    switch (h) {
      case 'FF':
        return <span className="text-red-400 font-mono font-bold">🔥 Forest Fire</span>;
      case 'GL':
        return <span className="text-amber-400 font-mono font-bold">⚠️ Gas Leak</span>;
      case 'FL':
        return <span className="text-blue-400 font-mono font-bold">🌊 Flood</span>;
      case 'LS':
        return <span className="text-orange-400 font-mono font-bold">⛰️ Landslide</span>;
      default:
        return <span className="text-slate-300 font-mono">{h}</span>;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 border border-red-500 text-red-400 animate-pulse">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-950 border border-orange-500 text-orange-400">HIGH</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950 border border-amber-500 text-amber-300">WATCH</span>;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
      {/* Header & Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertOctagon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold text-white">Incident Response & Triage Queue</h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Live Threshold Crossings • Instant SMS & Voice Call Dispatch
            </p>
          </div>
        </div>

        {/* State filter buttons */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono text-xs">
          {['OPEN', 'ACKED', 'RESOLVED', 'FALSE_POSITIVE', 'ALL'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterState(s)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterState === s
                  ? 'bg-slate-700 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="mt-4 space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 font-mono text-xs text-slate-500">
            No incidents found for current filter ({filterState}).
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const evId = String(ev._id);
            const isBusy = updatingId === evId;
            const ackState = ev.ack?.state || 'OPEN';
            const alertStatus = dispatchedAlerts[evId];
            const isDispatchingSms = dispatchingId === `${evId}-SMS`;
            const isDispatchingCall = dispatchingId === `${evId}-VOICE_CALL`;

            return (
              <div
                key={evId}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getLevelBadge(ev.level)}
                    <span className="text-xs">{getHazardLabel(ev.hazard)}</span>
                    <button
                      onClick={() => onSelectNodeById(ev.nodeId)}
                      className="font-mono text-xs font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                    >
                      {ev.nodeId} <ChevronRight className="h-3 w-3" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">
                      Score: <strong className="text-white">{ev.score}</strong>
                    </span>

                    {/* Alert Dispatch Badge */}
                    {alertStatus && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                        <CheckCheck className="h-3 w-3" />
                        {alertStatus === 'BOTH' ? 'SMS & CALL DISPATCHED' : `${alertStatus} DISPATCHED`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(ev.ts).toLocaleTimeString('en-IN', { hour12: false })}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                      {ackState}
                    </span>
                  </div>
                </div>

                {/* Trigger snapshot and rule */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                  <div className="text-slate-400">
                    <span>Deciding Rule: </span>
                    <span className="text-amber-300 font-semibold">{ev.rule}</span>
                    {ev.trigger?.peak && (
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                        {Object.entries(ev.trigger.peak).map(([k, val]) => (
                          <span key={k} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80">
                            {k}: <strong className="text-white">{Number(val)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Telephony Dispatch & Operator Triage Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {/* Emergency SMS Button */}
                    <button
                      onClick={() => handleDispatchAlert(ev, 'SMS')}
                      disabled={isDispatchingSms || isDispatchingCall}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono transition-all flex items-center gap-1 disabled:opacity-50"
                      title="Dispatch Emergency SMS to on-duty responders"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>{isDispatchingSms ? 'Sending...' : 'Send SMS'}</span>
                    </button>

                    {/* Emergency Voice Call Button */}
                    <button
                      onClick={() => handleDispatchAlert(ev, 'VOICE_CALL')}
                      disabled={isDispatchingSms || isDispatchingCall}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-[11px] font-mono transition-all flex items-center gap-1 disabled:opacity-50"
                      title="Trigger Automated Emergency Voice Call broadcast"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>{isDispatchingCall ? 'Calling...' : 'Voice Call'}</span>
                    </button>

                    {/* Triage State Buttons */}
                    {ackState === 'OPEN' && (
                      <button
                        onClick={() => handleStateChange(evId, 'ACKED')}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono transition-colors flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Ack
                      </button>
                    )}

                    {ackState !== 'RESOLVED' && (
                      <button
                        onClick={() => handleStateChange(evId, 'RESOLVED')}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" /> Resolve
                      </button>
                    )}

                    {ackState !== 'FALSE_POSITIVE' && (
                      <button
                        onClick={() => handleStateChange(evId, 'FALSE_POSITIVE')}
                        disabled={isBusy}
                        title="Flags incident as false alarm to tune edge thresholds"
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-800 text-[11px] font-mono transition-colors flex items-center gap-1"
                      >
                        <XCircle className="h-3 w-3" /> False
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
