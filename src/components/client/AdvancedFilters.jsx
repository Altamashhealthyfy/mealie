import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";

// value is now an array of selected emails, or "all", or "unassigned"
function CoachSearchSelect({ value, onChange, healthCoaches, showUnassigned }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Normalise: value can be "all", "unassigned", or array of emails
  const selectedEmails = Array.isArray(value) ? value : (value !== "all" && value !== "unassigned" && value ? [value] : []);
  const isAll = !Array.isArray(value) && value === "all";
  const isUnassigned = !Array.isArray(value) && value === "unassigned";

  const filtered = (healthCoaches || []).filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCoach = (email) => {
    if (selectedEmails.includes(email)) {
      const next = selectedEmails.filter(e => e !== email);
      onChange(next.length === 0 ? "all" : next);
    } else {
      onChange([...selectedEmails, email]);
    }
  };

  const getLabel = () => {
    if (isUnassigned) return <span className="font-medium text-amber-700">Unassigned</span>;
    if (selectedEmails.length === 0) return <span className="text-muted-foreground">All Coaches</span>;
    if (selectedEmails.length === 1) {
      const c = (healthCoaches || []).find(c => c.email === selectedEmails[0]);
      return <span className="font-medium truncate">{c?.full_name || selectedEmails[0]}</span>;
    }
    return <span className="font-medium">{selectedEmails.length} coaches selected</span>;
  };

  const hasSelection = isUnassigned || selectedEmails.length > 0;

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0 overflow-hidden">{getLabel()}</div>
        {hasSelection ? (
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onChange("all"); setSearch(""); }} />
        ) : (
          <Search className="w-4 h-4 opacity-50 ml-2 flex-shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-md shadow-lg">
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
          <div className="max-h-56 overflow-y-auto">
            {/* All Coaches */}
            <div
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 ${isAll ? "bg-orange-50 font-medium" : ""}`}
              onClick={() => { onChange("all"); setSearch(""); setOpen(false); }}
            >
              <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center bg-white">
                {isAll && <span className="w-2 h-2 rounded-sm bg-orange-500 block" />}
              </span>
              All Coaches
            </div>

            {/* Unassigned */}
            {showUnassigned && (
              <div
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 border-b border-gray-100 ${isUnassigned ? "bg-amber-50 font-medium text-amber-700" : "text-amber-600"}`}
                onClick={() => { onChange("unassigned"); setSearch(""); setOpen(false); }}
              >
                <span className="w-4 h-4 rounded border border-amber-300 flex items-center justify-center bg-white">
                  {isUnassigned && <span className="w-2 h-2 rounded-sm bg-amber-500 block" />}
                </span>
                ⚠️ Unassigned Clients
              </div>
            )}

            {/* Coach list with checkboxes */}
            {filtered.map(coach => {
              const checked = selectedEmails.includes(coach.email);
              return (
                <div
                  key={coach.email}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 ${checked ? "bg-orange-50" : ""}`}
                  onClick={() => toggleCoach(coach.email)}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "bg-orange-500 border-orange-500" : "border-gray-300 bg-white"}`}>
                    {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{coach.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{coach.email}</p>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No coaches found</p>
            )}
          </div>

          {selectedEmails.length > 0 && (
            <div className="border-t px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">{selectedEmails.length} selected</span>
              <button className="text-xs text-orange-500 hover:underline" onClick={() => { onChange("all"); setSearch(""); }}>Clear</button>
            </div>
          )}
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

          {/* Health Coach Filter - only for super_admin */}
          {showCoachFilter && (
            <div>
              <Label className="text-xs mb-1 block">Health Coach</Label>
              <CoachSearchSelect value={coachFilter} onChange={setCoachFilter} healthCoaches={healthCoaches || []} showUnassigned />
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