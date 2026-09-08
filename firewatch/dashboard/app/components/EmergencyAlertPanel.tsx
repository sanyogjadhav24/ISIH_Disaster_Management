'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, MessageSquare, ShieldAlert, Volume2, VolumeX, Send, RefreshCw, CheckCircle2, Radio, BellRing, PhoneOutgoing } from 'lucide-react';

interface AlertRecord {
  _id?: string;
  type: 'SMS' | 'VOICE_CALL';
  nodeId: string;
  hazard: string;
  level: string;
  message: string;
  voiceSpeechText?: string;
  recipient: {
    name: string;
    role: string;
    phone: string;
  };
  status: string;
  provider: string;
  dispatchedAt: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
}

interface EmergencyAlertPanelProps {
  onDispatchAlert?: (type: 'SMS' | 'VOICE_CALL', contact: Contact, event?: any) => Promise<void>;
}

export default function EmergencyAlertPanel({ onDispatchAlert }: EmergencyAlertPanelProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [dispatchingContactId, setDispatchingContactId] = useState<string | null>(null);
  const [lastDispatchedSid, setLastDispatchedSid] = useState<string | null>(null);

  // Fetch recent alerts and contacts
  const fetchAlertData = async () => {
    try {
      setLoading(true);
      const [alertsRes, contactsRes] = await Promise.all([
        fetch('/api/alerts/dispatch?limit=15'),
        fetch('/api/alerts/contacts'),
      ]);

      const alertsJson = await alertsRes.json();
      const contactsJson = await contactsRes.json();

      if (alertsJson.success) setAlerts(alertsJson.data);
      if (contactsJson.success) setContacts(contactsJson.data);
    } catch (err) {
      console.error('Failed to load alert history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertData();
    const interval = setInterval(fetchAlertData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API Voice Synthesizer
  const speakVoiceAlert = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  // Dispatch SMS or Call to specific responder
  const handleTriggerDirectAlert = async (type: 'SMS' | 'VOICE_CALL', contact: Contact) => {
    setDispatchingContactId(`${contact.id}-${type}`);
    try {
      const res = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          nodeId: 'FGMH26080001',
          hazard: 'FF',
          level: 'CRITICAL',
          recipientPhone: contact.phone,
          recipientName: contact.name,
          recipientRole: contact.role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastDispatchedSid(data.data.externalRef || 'DISPATCHED');
        if (type === 'VOICE_CALL' && data.data.voiceSpeechText) {
          speakVoiceAlert(data.data.voiceSpeechText);
        }
        await fetchAlertData();
      }
    } catch (err) {
      console.error('Direct dispatch failed:', err);
    } finally {
      setDispatchingContactId(null);
    }
  };

  // Quick Test Multi-Channel Dispatch
  const handleTestBroadcast = async () => {
    if (contacts.length === 0) return;
    const primary = contacts[0];
    await handleTriggerDirectAlert('SMS', primary);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 p-0.5 flex items-center justify-center shadow-lg shadow-red-950/50">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
              <BellRing className="h-4 w-4 animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-semibold text-white">
                Emergency Alert & Telephony Dispatch Center
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 font-bold">
                SMS & VOICE CALL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Auto-dispatches alerts to first responders when sensors detect critical hazard excursions.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              audioEnabled
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle Emergency Voice Audio Announcer"
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{audioEnabled ? 'Voice On' : 'Voice Muted'}</span>
          </button>

          <button
            onClick={handleTestBroadcast}
            disabled={loading}
            className="px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-200 transition-all font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Test Broadcast</span>
          </button>

          <button
            onClick={fetchAlertData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh Alert Logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Emergency Responder Contacts Directory */}
        <div className="xl:col-span-6 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span className="uppercase font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-amber-400" />
              On-Duty First Responder Directory
            </span>
            <span>{contacts.length} Designated Authorities</span>
          </div>

          <div className="space-y-2">
            {contacts.map((contact) => {
              const isSendingSms = dispatchingContactId === `${contact.id}-SMS`;
              const isCalling = dispatchingContactId === `${contact.id}-VOICE_CALL`;

              return (
                <div
                  key={contact.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-mono text-white">{contact.name}</strong>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {contact.phone}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{contact.role}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTriggerDirectAlert('SMS', contact)}
                      disabled={isSendingSms || isCalling}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>{isSendingSms ? 'Sending...' : 'Send SMS'}</span>
                    </button>

                    <button
                      onClick={() => handleTriggerDirectAlert('VOICE_CALL', contact)}
                      disabled={isSendingSms || isCalling}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>{isCalling ? 'Calling...' : 'Voice Call'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Telephony & SMS Dispatch Logs */}
        <div className="xl:col-span-6 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span className="uppercase font-semibold text-slate-200 flex items-center gap-1.5">
              <PhoneOutgoing className="h-3.5 w-3.5 text-red-400" />
              Real-Time Alert Dispatch Feed
            </span>
            <span className="text-cyan-400">{alerts.length} Dispatched Records</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center font-mono text-xs text-slate-500">
                No alerts dispatched yet. Click &quot;Test Broadcast&quot; or trigger from the incident queue.
              </div>
            ) : (
              alerts.map((al, idx) => {
                const isSms = al.type === 'SMS';
                return (
                  <div
                    key={al._id || idx}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-xs font-mono flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                            isSms
                              ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
                              : 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                          }`}
                        >
                          {isSms ? <MessageSquare className="h-3 w-3" /> : <PhoneCall className="h-3 w-3" />}
                          {al.type}
                        </span>
                        <span className="text-white font-semibold">{al.recipient?.name}</span>
                        <span className="text-slate-400 text-[10px]">({al.recipient?.role})</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {al.status}
                        </span>
                        <span>{new Date(al.dispatchedAt).toLocaleTimeString('en-IN', { hour12: false })}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800/80 truncate">
                      {al.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Node: <strong className="text-cyan-400">{al.nodeId}</strong> ({al.hazard})</span>
                      <span className="truncate max-w-[200px]" title={al.provider}>
                        Channel: {al.provider}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
