import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format } from "date-fns";
import { Loader2, Heart, TrendingUp, Calendar, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ClientMPESSAnalytics() {
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['mpessAnalytics', user?.email],
    queryFn: async () => {
      const tracking = await base44.entities.MPESSTracker.filter({
        client_id: user?.email
      });
      return tracking.sort((a, b) => new Date(a.submission_date) - new Date(b.submission_date));
    },
    enabled: !!user?.email,
  });

  // Filter assessments by date range
  const filteredAssessments = assessments?.filter(a => {
    const submissionDate = new Date(a.submission_date);
    if (dateRange.start && submissionDate < new Date(dateRange.start)) return false;
    if (dateRange.end && submissionDate > new Date(dateRange.end)) return false;
    return true;
  }) || [];

  // Process data for charts using filtered assessments
  const timelineData = filteredAssessments?.map(a => ({
    date: format(new Date(a.submission_date), 'MMM yyyy'),
    submissionDate: a.submission_date,
    reviewed: a.coach_reviewed ? 1 : 0,
    id: a.id
  })) || [];

  // Calculate willingness average over time
  const willingnessTimeline = filteredAssessments?.map(a => {
    if (!a.submission_data?.mpess_willingness) return null;
    const values = Object.values(a.submission_data.mpess_willingness).filter(v => typeof v === 'number');
    const avg = values.length > 0 ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1) : 0;
    return {
      date: format(new Date(a.submission_date), 'MMM yyyy'),
      willingness: parseFloat(avg)
    };
  }).filter(Boolean) || [];

  // Root cause distribution
  const rootCauseCounts = filteredAssessments?.reduce((acc, a) => {
    if (a.submission_data?.mpess_root_cause) {
      const cause = a.submission_data.mpess_root_cause;
      acc[cause] = (acc[cause] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const rootCauseData = Object.entries(rootCauseCounts).map(([cause, count]) => ({
    name: cause.length > 20 ? cause.substring(0, 20) + "..." : cause,
    value: count
  }));

  // Physical factors checked over time
  const physicalSummary = filteredAssessments?.reduce((acc, a) => {
    if (a.submission_data?.mpess_physical) {
      const checked = Object.values(a.submission_data.mpess_physical).filter(v => v).length;
      acc.push({
        date: format(new Date(a.submission_date), 'MMM yyyy'),
        physicalFactors: checked
      });
    }
    return acc;
  }, []) || [];

  // Radar chart data for latest assessment (from filtered data)
  const latestAssessment = filteredAssessments?.[filteredAssessments.length - 1];
  const radarData = [
    {
      dimension: "Physical Factors",
      value: latestAssessment?.submission_data?.mpess_physical ? Object.values(latestAssessment.submission_data.mpess_physical).filter(v => v).length : 0,
      fullMark: 6
    },
    {
      dimension: "Emotional",
      value: latestAssessment?.submission_data?.mpess_emotional ? Object.keys(latestAssessment.submission_data.mpess_emotional).length : 0,
      fullMark: 5
    },
    {
      dimension: "Social",
      value: latestAssessment?.submission_data?.mpess_social ? Object.keys(latestAssessment.submission_data.mpess_social).length : 0,
      fullMark: 5
    },
    {
      dimension: "Body Comp",
      value: latestAssessment?.submission_data?.mpess_body_composition ? Object.values(latestAssessment.submission_data.mpess_body_composition).filter(v => v).length : 0,
      fullMark: 3
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
             <Heart className="w-8 h-8 text-pink-500" />
             Your MPESS Assessment Analytics
           </h1>
           <p className="text-gray-600">Track your progress across mind, physical, emotional, social & spiritual dimensions</p>
         </div>

         {/* Date Range Filter */}
         <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-gray-200">
           <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
             <div className="flex-1">
               <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
               <input
                 type="date"
                 value={dateRange.start || ''}
                 onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
               />
             </div>
             <div className="flex-1">
               <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
               <input
                 type="date"
                 value={dateRange.end || ''}
                 onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
               />
             </div>
             {(dateRange.start || dateRange.end) && (
               <Button
                 onClick={() => setDateRange({ start: null, end: null })}
                 variant="outline"
                 className="flex items-center gap-2"
               >
                 <X className="w-4 h-4" />
                 Clear Filter
               </Button>
             )}
           </div>
         </div>

         {assessments && assessments.length === 0 ? (
          <Alert className="border-blue-200 bg-blue-50">
            <Heart className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Complete your first MPESS assessment to see analytics and track your progress over time.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm">Total Submissions</p>
                  <p className="text-3xl font-bold text-orange-600">{assessments?.length || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm">Reviewed by Coach</p>
                  <p className="text-3xl font-bold text-green-600">{assessments?.filter(a => a.coach_reviewed).length || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm">Latest Assessment</p>
                  <p className="text-lg font-bold text-gray-900">
                    {latestAssessment ? format(new Date(latestAssessment.submission_date), 'MMM dd, yyyy') : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm">Avg Willingness</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {willingnessTimeline.length > 0 
                      ? (willingnessTimeline.reduce((sum, d) => sum + d.willingness, 0) / willingnessTimeline.length).toFixed(1)
                      : '-'
                    }/10
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Willingness Trend */}
            {willingnessTimeline.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Willingness to Heal Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={willingnessTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="willingness" 
                        stroke="#f97316" 
                        strokeWidth={2}
                        name="Average Willingness Score"
                        dot={{ fill: '#f97316', r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Physical Factors Timeline */}
            {physicalSummary.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Physical Factors Identified Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={physicalSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 6]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="physicalFactors" fill="#8b5cf6" name="Factors Identified" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Root Cause Distribution */}
            {rootCauseData.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Root Cause Assessment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rootCauseData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-40 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(item.value / Math.max(...rootCauseData.map(d => d.value))) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-900 w-8 text-right">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Latest Assessment Radar */}
            {radarData.some(d => d.value > 0) && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Latest Assessment Profile</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    {latestAssessment ? format(new Date(latestAssessment.submission_date), 'MMMM dd, yyyy') : ''}
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" />
                      <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                      <Radar name="Count" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Coach Feedback */}
            {assessments?.filter(a => a.coach_notes).length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Coach Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assessments
                    ?.filter(a => a.coach_notes)
                    ?.reverse()
                    .map(a => (
                      <div key={a.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-semibold mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {format(new Date(a.submission_date), 'MMMM dd, yyyy')}
                        </p>
                        <p className="text-gray-700">{a.coach_notes}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}