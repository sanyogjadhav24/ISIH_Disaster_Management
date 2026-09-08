'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header, { HazardFilter } from './components/Header';
import NetworkStatsCards from './components/NetworkStatsCards';
import GisMap from './components/GisMap';
import HazardPanels from './components/HazardPanels';
import EdgeQcInspector from './components/EdgeQcInspector';
import IncidentQueue from './components/IncidentQueue';
import TelemetryChart from './components/TelemetryChart';
import NodeDetailModal from './components/NodeDetailModal';
import { ShieldAlert, ExternalLink, HelpCircle } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [inspectingNode, setInspectingNode] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<HazardFilter>('ALL');
  const [loading, setLoading] = useState(true);

  // Fetch all live network data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, nodesRes, gwRes, eventsRes] = await Promise.all([
        fetch('/api/network/stats'),
        fetch('/api/nodes'),
        fetch('/api/gateways'),
        fetch('/api/events?limit=50'),
      ]);

      const statsJson = await statsRes.json();
      const nodesJson = await nodesRes.json();
      const gwJson = await gwRes.json();
      const eventsJson = await eventsRes.json();

      if (statsJson.success) setStats(statsJson.data);
      if (nodesJson.success && Array.isArray(nodesJson.data)) {
        setNodes(nodesJson.data);
        // Default selected node if none selected yet
        if (!selectedNode && nodesJson.data.length > 0) {
          // Select an active or critical node if available
          const critNode = nodesJson.data.find(
            (n: any) => n.latestReading?.risk?.level === 'CRITICAL' || n.latestReading?.risk?.level === 'HIGH'
          );
          setSelectedNode(critNode || nodesJson.data[0]);
        }
      }
      if (gwJson.success) setGateways(gwJson.data);
      if (eventsJson.success) setEvents(eventsJson.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle operator triage
  const handleUpdateEventState = async (eventId: string, newState: string) => {
    try {
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, state: newState, by: 'HQ-Cmdr-1' }),
      });
      if (res.ok) {
        // Refresh events & stats
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update event state:', err);
    }
  };

  const handleSelectNodeById = (nodeId: string) => {
    const found = nodes.find((n) => n._id === nodeId);
    if (found) {
      setSelectedNode(found);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Header */}
      <Header
        stats={stats}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* KPI Metric Cards */}
        <NetworkStatsCards stats={stats} />

        {/* GIS Grid Map & Incident Triage Queue */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2 font-mono text-xs text-slate-400">
              <span className="uppercase font-semibold text-slate-200">Interactive LoRa Grid Topology</span>
              {selectedNode && (
                <button
                  onClick={() => setInspectingNode(selectedNode)}
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Inspect Hardware {selectedNode._id} <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
            <GisMap
              nodes={nodes}
              gateways={gateways}
              selectedNode={selectedNode}
              onSelectNode={(node) => setSelectedNode(node)}
              filter={activeFilter}
            />
          </div>

          <div className="xl:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2 font-mono text-xs text-slate-400">
              <span className="uppercase font-semibold text-slate-200">Multi-Hazard Event Stream</span>
              <span className="text-amber-400">{events.length} Recorded Incidents</span>
            </div>
            <IncidentQueue
              events={events}
              onUpdateEventState={handleUpdateEventState}
              onSelectNodeById={handleSelectNodeById}
            />
          </div>
        </div>

        {/* Hazard Telemetry Matrices (FG & FS) */}
        <div>
          <div className="flex items-center justify-between mb-2 font-mono text-xs text-slate-400">
            <span className="uppercase font-semibold text-slate-200">Active Sensor Telemetry Arrays</span>
            <span>Click any node card to focus diagnostics</span>
          </div>
          <HazardPanels
            nodes={nodes}
            onSelectNode={(node) => setSelectedNode(node)}
            selectedNode={selectedNode}
            filter={activeFilter}
          />
        </div>

        {/* Edge Quality Control Diagnostics & Historical Timeseries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EdgeQcInspector selectedNode={selectedNode} />
          <TelemetryChart selectedNode={selectedNode} />
        </div>
      </main>

      {/* Hardware Details Modal */}
      {inspectingNode && (
        <NodeDetailModal
          node={inspectingNode}
          onClose={() => setInspectingNode(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 lg:px-8 py-4 font-mono text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>Disaster Watch Multi-Hazard Sensing Network</span>
          <span>•</span>
          <span>MongoDB Atlas (<code className="text-cyan-400">firewatch_sim</code>)</span>
        </div>
        <div>
          <span>Architecture: MKR Zero SAMD21 + LoRa E32-900T30D + Edge QC Reference</span>
        </div>
      </footer>
    </div>
  );
}
