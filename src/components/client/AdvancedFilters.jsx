import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";

export default function AdvancedFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  coachFilter,
  setCoachFilter,
  addedByCoachFilter,
  setAddedByCoachFilter,
  goalFilter,
  setGoalFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  lastActiveFilter,
  setLastActiveFilter,
  hasActivePlan,
  setHasActivePlan,
  healthCoaches,
  showCoachFilter,
  activeFiltersCount
}) {
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCoachFilter('all');
    if (setAddedByCoachFilter) setAddedByCoachFilter('all');
    setGoalFilter('all');
    setSortBy('created_date');
    setSortOrder('desc');
    setLastActiveFilter('all');
    setHasActivePlan('all');
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Filters & Sorting</h3>
            {activeFiltersCount > 0 && (
              <Badge className="bg-orange-500">{activeFiltersCount} active</Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Label className="text-xs mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goal */}
          <div>
            <Label className="text-xs mb-1 block">Goal</Label>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="weight_gain">Weight Gain</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                <SelectItem value="health_improvement">Health Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Last Active */}
          <div>
            <Label className="text-xs mb-1 block">Last Active</Label>
            <Select value={lastActiveFilter} onValueChange={setLastActiveFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Has Plan */}
          <div>
            <Label className="text-xs mb-1 block">Meal Plan</Label>
            <Select value={hasActivePlan} onValueChange={setHasActivePlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="yes">Has Active Plan</SelectItem>
                <SelectItem value="no">No Active Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Added By Coach Filter */}
          {healthCoaches?.length > 0 && setAddedByCoachFilter && (
            <div>
              <Label className="text-xs mb-1 block">Added By Coach</Label>
              <Select value={addedByCoachFilter || 'all'} onValueChange={setAddedByCoachFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Coaches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  {healthCoaches.map(coach => (
                    <SelectItem key={coach.email} value={coach.email}>
                      {coach.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Handled By Coach Filter (assigned_coach) */}
          {healthCoaches?.length > 0 && (
            <div>
              <Label className="text-xs mb-1 block">Handled By Coach</Label>
              <Select value={coachFilter} onValueChange={setCoachFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {healthCoaches.map(coach => (
                    <SelectItem key={coach.email} value={coach.email}>
                      {coach.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sort By */}
          <div>
            <Label className="text-xs mb-1 block">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">Date Added</SelectItem>
                <SelectItem value="full_name">Name</SelectItem>
                <SelectItem value="last_active">Last Active</SelectItem>
                <SelectItem value="progress">Progress Trend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-xs mb-1 block">Order</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}