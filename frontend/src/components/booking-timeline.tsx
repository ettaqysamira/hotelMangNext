'use client';

import { CheckCircle2, Clock, CreditCard, MapPin, Key, Home } from 'lucide-react';

interface BookingTimelineProps {
  status: string;
  paymentStatus: string;
  checkInDate: string;
}

export default function BookingTimeline({ status, paymentStatus, checkInDate }: BookingTimelineProps) {
  const steps = [
    { 
      label: 'Réservé', 
      icon: <Clock size={14} />, 
      done: true,
      color: 'text-cyan-400'
    },
    { 
      label: 'Payé', 
      icon: <CreditCard size={14} />, 
      done: paymentStatus === 'PAID',
      color: 'text-cyan-400'
    },
    { 
      label: 'Confirmé', 
      icon: <CheckCircle2 size={14} />, 
      done: status === 'CONFIRMED' || status === 'COMPLETED',
      color: 'text-cyan-400'
    },
    { 
      label: 'Check-in', 
      icon: <Key size={14} />, 
      done: status === 'COMPLETED',
      color: 'text-cyan-400'
    },
    { 
      label: 'Séjour', 
      icon: <Home size={14} />, 
      done: status === 'COMPLETED',
      color: 'text-cyan-400'
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
            step.done 
              ? `${step.color} bg-cyan-400/10 border border-cyan-400/20` 
              : 'text-[#5a6478] bg-[#0d1117]/40 border border-[#1c2333]'
          }`}>
            {step.icon}
            <span>{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-4 h-px ${step.done ? 'bg-cyan-400/30' : 'bg-[#1c2333]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
