import React from "react";

export default function NutrientBar({ label, value, unit, max, color }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-800">{value != null ? `${value}${unit}` : '—'}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}