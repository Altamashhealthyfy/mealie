import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  MessageSquare,
  Eye,
  Edit2,
  UserPlus,
  Users,
  Mail,
  BarChart3,
  LineChart,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientCard({
  client,
  visibleActions = [
    "progress",
    "message",
    "view",
    "edit",
    "assignCoach",
    "assignTeam",
  ],
  onActionClick = () => {},
}) {
  const actionIcons = {
    progress: { icon: TrendingUp, label: "Progress Dashboard", color: "text-purple-600" },
    message: { icon: MessageSquare, label: "Message", color: "text-blue-600" },
    view: { icon: Eye, label: "View", color: "text-gray-600" },
    edit: { icon: Edit2, label: "Edit", color: "text-orange-600" },
    assignCoach: { icon: UserPlus, label: "Assign to Coach", color: "text-green-600" },
    assignTeam: { icon: Users, label: "Assign to Team", color: "text-indigo-600" },
  };

  const initials = client.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "C";

  const handleAction = (action) => {
    onActionClick(action, client);
  };

  return (
    <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-5 space-y-4">
        {/* Client Info Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{client.full_name}</h3>
            <p className="text-sm text-gray-600 truncate">{client.email}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge
            className={`${
              client.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {client.status || "inactive"}
          </Badge>
          {client.food_preference && (
            <Badge className="bg-blue-100 text-blue-800 capitalize">
              {client.food_preference}
            </Badge>
          )}
          {client.plan_tier === "advanced" && (
            <Badge className="bg-purple-100 text-purple-800">Has Active Plan</Badge>
          )}
        </div>

        {/* Goal */}
        {client.goal && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium mb-1">Goal</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {client.goal.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {visibleActions.map((action) => {
            const actionConfig = actionIcons[action];
            if (!actionConfig) return null;

            const Icon = actionConfig.icon;
            return (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className={`w-full justify-start ${actionConfig.color} border-current hover:bg-gray-50`}
                onClick={() => handleAction(action)}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="text-sm">{actionConfig.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}