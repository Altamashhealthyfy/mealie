import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";

function CoachSearchSelect({ value, onChange, healthCoaches }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = value !== "all" ? (healthCoaches || []).find(c => c.email === value) : null;

  const filtered = (healthCoaches || []).filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {selected ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="truncate font-medium">{selected.full_name}</span>
            <span className="text-xs text-gray-400 truncate">{selected.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">All Coaches</span>
        )}
        {selected ? (
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onChange("all"); setSearch(""); }} />
        ) : (
          <Search className="w-4 h-4 opacity-50 ml-2 flex-shrink-0" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-orange-400"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 ${value === "all" ? "bg-orange-50 font-medium" : ""}`}
              onClick={() => { onChange("all"); setSearch(""); setOpen(false); }}
            >
              All Coaches
            </div>
            {filtered.map(coach => (
              <div
                key={coach.email}
                className={`px-3 py-2 cursor-pointer hover:bg-orange-50 ${value === coach.email ? "bg-orange-50" : ""}`}
                onClick={() => { onChange(coach.email); setSearch(""); setOpen(false); }}
              >
                <p className="text-sm font-medium text-gray-900">{coach.full_name}</p>
                <p className="text-xs text-gray-500">{coach.email}</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No coaches found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

          {/* Handled By Coach Filter (assigned_coach) */}
          {(healthCoaches?.length > 0) && (
            <div>
              <Label className="text-xs mb-1 block">Handled By Coach</Label>
              <CoachSearchSelect value={coachFilter} onChange={setCoachFilter} healthCoaches={healthCoaches} />
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