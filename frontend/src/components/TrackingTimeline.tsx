import { ShipmentStatus, TrackingEvent } from '../types';
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; icon: React.ElementType; color: string; bgColor: string; dotColor: string }> = {
  CREATED:          { label: 'Created',          icon: Package,      color: 'text-blue-400',    bgColor: 'bg-blue-500/10 border border-blue-500/20',    dotColor: 'bg-blue-400' },
  PICKED_UP:        { label: 'Picked Up',        icon: Truck,        color: 'text-violet-400',  bgColor: 'bg-violet-500/10 border border-violet-500/20', dotColor: 'bg-violet-400' },
  IN_TRANSIT:       { label: 'In Transit',       icon: Truck,        color: 'text-amber-400',   bgColor: 'bg-amber-500/10 border border-amber-500/20',   dotColor: 'bg-amber-400' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: MapPin,       color: 'text-orange-400',  bgColor: 'bg-orange-500/10 border border-orange-500/20', dotColor: 'bg-orange-400' },
  DELIVERED:        { label: 'Delivered',        icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border border-emerald-500/20', dotColor: 'bg-emerald-400' },
  DELAYED:          { label: 'Delayed',          icon: AlertTriangle,color: 'text-red-400',     bgColor: 'bg-red-500/10 border border-red-500/20',       dotColor: 'bg-red-400' },
  CANCELLED:        { label: 'Cancelled',        icon: XCircle,      color: 'text-slate-500',   bgColor: 'bg-slate-700/50 border border-slate-600',      dotColor: 'bg-slate-500' },
};

const STATUS_ORDER: ShipmentStatus[] = [
  'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

interface Props {
  events: TrackingEvent[];
  currentStatus: ShipmentStatus;
}

export default function TrackingTimeline({ events, currentStatus }: Props) {
  const isTerminal = currentStatus === 'CANCELLED' || currentStatus === 'DELAYED';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-4">
      {/* Progress stepper */}
      {!isTerminal && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
          <div className="flex items-center justify-between">
            {STATUS_ORDER.map((status, index) => {
              const config = STATUS_CONFIG[status];
              const isCompleted = index <= currentIndex;
              const isCurrent = status === currentStatus;

              return (
                <div key={status} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div className={`h-0.5 flex-1 transition-colors ${
                        isCompleted ? 'bg-amber-500' : 'bg-slate-700'
                      }`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-900 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/25'
                        : isCompleted
                        ? 'bg-amber-500/80 text-slate-900'
                        : 'bg-slate-700 text-slate-600 border border-slate-600'
                    }`}>
                      <config.icon className="w-3.5 h-3.5" />
                    </div>
                    {index < STATUS_ORDER.length - 1 && (
                      <div className={`h-0.5 flex-1 transition-colors ${
                        index < currentIndex ? 'bg-amber-500' : 'bg-slate-700'
                      }`} />
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium text-center leading-tight ${
                    isCurrent ? 'text-amber-400' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Terminal state banner */}
      {isTerminal && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${STATUS_CONFIG[currentStatus].bgColor}`}>
          {(() => { const C = STATUS_CONFIG[currentStatus].icon; return <C className={`w-5 h-5 ${STATUS_CONFIG[currentStatus].color}`} />; })()}
          <div>
            <p className={`text-sm font-semibold ${STATUS_CONFIG[currentStatus].color}`}>
              Shipment {STATUS_CONFIG[currentStatus].label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentStatus === 'CANCELLED' ? 'This shipment has been cancelled.' : 'This shipment is delayed. Contact support for updates.'}
            </p>
          </div>
        </div>
      )}

      {/* Timeline events */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Tracking History
        </h3>
        <div className="space-y-0">
          {events.map((event, index) => {
            const config = STATUS_CONFIG[event.status];
            const isLast = index === events.length - 1;
            return (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor} ${config.color}`}>
                    <config.icon className="w-4 h-4" />
                  </div>
                  {!isLast && <div className="w-px flex-1 min-h-[32px] bg-slate-700/50 my-1" />}
                </div>
                <div className="pb-5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
                    <p className="text-xs text-slate-600 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{event.description}</p>
                  {event.location && (
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
