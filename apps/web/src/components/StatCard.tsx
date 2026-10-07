import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'amber' | 'emerald' | 'rose' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'amber',
}) => {
  const variantStyles = {
    amber: {
      border: 'border-amber-200 hover:border-amber-300',
      glow: 'hover:shadow-lg hover:shadow-amber-500/10',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      valueColor: 'text-amber-700',
    },
    emerald: {
      border: 'border-emerald-200 hover:border-emerald-300',
      glow: 'hover:shadow-lg hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      valueColor: 'text-emerald-700',
    },
    rose: {
      border: 'border-rose-200 hover:border-rose-300',
      glow: 'hover:shadow-lg hover:shadow-rose-500/10',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      valueColor: 'text-rose-700',
    },
    blue: {
      border: 'border-maroon-200 hover:border-maroon-300',
      glow: 'hover:shadow-glow-maroon',
      iconBg: 'bg-maroon-50 text-maroon-700 border border-maroon-100',
      valueColor: 'text-maroon-700',
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      className={`p-6 rounded-3xl bg-white border ${current.border} transition-all duration-200 shadow-card ${current.glow} flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-2xl ${current.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-black tracking-tight ${current.valueColor}`}>{value}</div>
        {subtitle && <div className="text-xs text-slate-500 font-medium mt-1">{subtitle}</div>}
      </div>
    </div>
  );
};
