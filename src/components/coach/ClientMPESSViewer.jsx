import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle,
  CheckCircle2,
  Lightbulb
} from "lucide-react";

export default function ClientMPESSViewer({ clientProfile, userProfile }) {
  const mpessData = userProfile?.mpess_assessment || {};
  
  if (!mpessData.root_cause && Object.keys(mpessData).length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No MPESS assessment data available</p>
            <p className="text-xs text-gray-400">Client hasn't completed the assessment yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Root Cause */}
      {mpessData.root_cause && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🔍</span>
              Root Cause Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">{mpessData.root_cause}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Physical Factors */}
      {mpessData.physical_factors?.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">💪</span>
              Physical Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mpessData.physical_factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{factor}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Triggers */}
      {mpessData.emotional_triggers && Object.keys(mpessData.emotional_triggers).length > 0 && (
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">❤️</span>
              Emotional Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(mpessData.emotional_triggers).map(([trigger, intensity]) => (
                <div key={trigger} className="p-2 bg-pink-50 rounded text-xs">
                  <p className="font-semibold text-gray-700">{trigger}</p>
                  <p className="text-pink-600">Intensity: {intensity}/5</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social & Environmental */}
      {mpessData.social_environmental && Object.keys(mpessData.social_environmental).length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">👥</span>
              Social & Environmental
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(mpessData.social_environmental).map(([factor, level]) => (
                <div key={factor} className="p-2 bg-blue-50 rounded text-xs">
                  <p className="font-semibold text-gray-700">{factor}</p>
                  <p className="text-blue-600">Level: {level}/4</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spiritual & Self-Connection */}
      {mpessData.spiritual_self_connection && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🌿</span>
              Spiritual & Self-Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-yellow-100 text-yellow-800">
              {mpessData.spiritual_self_connection}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Motivation Rating */}
      {mpessData.motivation_rating && Object.keys(mpessData.motivation_rating).length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">⭐</span>
              Motivation & Commitment Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(mpessData.motivation_rating).map(([item, rating]) => (
                <div key={item} className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">{item}</p>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(rating / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-purple-600 w-6 text-right">{rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coaching Tips */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• Address the identified root cause with targeted interventions</p>
          <p>• Monitor physical factors and suggest lifestyle adjustments</p>
          <p>• Build emotional resilience through supportive coaching</p>
          <p>• Enhance motivation through goal-setting and progress tracking</p>
        </CardContent>
      </Card>
    </div>
  );
}