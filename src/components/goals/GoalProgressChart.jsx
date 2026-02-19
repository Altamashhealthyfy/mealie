import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

export default function GoalProgressChart({ goal }) {
  const history = goal.progress_history || [];
  if (history.length < 2) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
        Log at least 2 entries to see your chart
      </div>
    );
  }

  const data = history.map((h) => ({
    date: format(parseISO(h.date), "MMM d"),
    value: h.value,
  }));

  const isDecreasing = goal.target_value < (goal.start_value ?? 0);
  const color = isDecreasing ? "#f97316" : "#22c55e";

  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 8 }}
            formatter={(v) => [`${v} ${goal.unit}`, "Value"]}
          />
          <ReferenceLine y={goal.target_value} stroke="#6366f1" strokeDasharray="4 2" label={{ value: "Target", fontSize: 9, fill: "#6366f1" }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}