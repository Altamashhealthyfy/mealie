import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter } from "lucide-react";
import ClientCard from "./ClientCard";

export default function UnifiedClientHub({
  clients = [],
  onClientAction = () => {},
  visibleActions = [
    "progress",
    "progressReview",
    "analytics",
    "reports",
    "tracker",
    "message",
    "view",
    "edit",
    "assignCoach",
    "assignTeam",
  ],
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGoal, setFilterGoal] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const defaultActions = [
    "progress",
    "progressReview",
    "analytics",
    "reports",
    "tracker",
    "message",
    "view",
    "edit",
    "assignCoach",
    "assignTeam",
  ];

  // Get unique values for filters
  const statuses = [...new Set(clients.map((c) => c.status).filter(Boolean))];
  const goals = [...new Set(clients.map((c) => c.goal).filter(Boolean))];

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || client.status === filterStatus;

    const matchesGoal = filterGoal === "all" || client.goal === filterGoal;

    return matchesSearch && matchesStatus && matchesGoal;
  });

  // Group clients by status
  const groupedByStatus = {
    active: filteredClients.filter((c) => c.status === "active"),
    inactive: filteredClients.filter((c) => c.status === "inactive"),
    completed: filteredClients.filter((c) => c.status === "completed"),
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Goal</label>
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Goals</option>
              {goals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal.replace(/_/g, " ").charAt(0).toUpperCase() +
                    goal.replace(/_/g, " ").slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Results</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
              <span className="text-sm font-semibold text-gray-900">
                {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">
            All ({filteredClients.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({groupedByStatus.active.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({groupedByStatus.inactive.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({groupedByStatus.completed.length})
          </TabsTrigger>
        </TabsList>

        {/* All Clients */}
        <TabsContent value="all" className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600 mb-2">No clients found</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  visibleActions={visibleActions}
                  onActionClick={onClientAction}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Clients */}
        <TabsContent value="active" className="space-y-4">
          {groupedByStatus.active.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">No active clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByStatus.active.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  visibleActions={visibleActions}
                  onActionClick={onClientAction}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inactive Clients */}
        <TabsContent value="inactive" className="space-y-4">
          {groupedByStatus.inactive.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">No inactive clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByStatus.inactive.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  visibleActions={visibleActions}
                  onActionClick={onClientAction}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Clients */}
        <TabsContent value="completed" className="space-y-4">
          {groupedByStatus.completed.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">No completed clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByStatus.completed.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  visibleActions={visibleActions}
                  onActionClick={onClientAction}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}