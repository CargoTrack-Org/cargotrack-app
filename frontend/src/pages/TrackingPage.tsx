import { useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { TrackingInfo } from '../types';
import TrackingTimeline from '../components/TrackingTimeline';
import { Truck, Search, MapPin, Package, Calendar, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../components/TrackingTimeline';

export default function TrackingPage() {
  const { trackingNumber: paramTracking } = useParams<{ trackingNumber: string }>();
  const [input, setInput] = useState(paramTracking || '');
  const [trackingNumber, setTrackingNumber] = useState(paramTracking || '');

  const { data, isLoading, error } = useQuery<TrackingInfo>({
    queryKey: ['tracking', trackingNumber],
    queryFn: async () => {
      const { data } = await api.get(`/tracking/${trackingNumber}`);
      return data;
    },
    enabled: !!trackingNumber,
  });

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setTrackingNumber(input.trim());
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-slate-800" style={{ backgroundColor: '#0f1117' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.2) 0%, transparent 60%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-5">
            <Truck className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Track Shipment</h1>
          <p className="text-sm text-slate-500 mb-8">Enter a tracking number to get real-time status updates</p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., CT-2026-123456"
                className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-slate-900 text-sm font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Track <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && trackingNumber && (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-16 text-center">
            <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">Shipment not found</p>
            <p className="text-xs text-slate-600 mt-1">Check your tracking number and try again</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Tracking Number</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{data.trackingNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="text-sm font-medium text-slate-200">{data.shipmentType}</p>
                  </div>
                  <StatusBadge status={data.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">From</p>
                    <p className="text-sm font-medium text-slate-200">{data.origin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">To</p>
                    <p className="text-sm font-medium text-slate-200">{data.destination}</p>
                  </div>
                </div>
                {data.estimatedDeliveryDate && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Est. Delivery</p>
                      <p className="text-sm font-medium text-slate-200">
                        {new Date(data.estimatedDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <TrackingTimeline events={data.trackingEvents} currentStatus={data.status} />
          </div>
        )}
      </div>
    </div>
  );
}
