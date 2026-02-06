import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

const severityColors = {
  mild: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  severe: 'bg-red-100 text-red-800 border-red-300'
};

const statusIcons = {
  normal: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  abnormal: <AlertCircle className="w-4 h-4 text-yellow-600" />,
  critical: <AlertTriangle className="w-4 h-4 text-red-600" />
};

export default function AIAnalysisDisplay({ analysis, status, isCoachView = false }) {
  if (status === 'pending') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-blue-900">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">AI is analyzing your report... This may take a minute.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          AI analysis failed. Please try uploading the report again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      {analysis.key_metrics && analysis.key_metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Key Health Metrics
            </CardTitle>
            <CardDescription>Extracted values from your report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.key_metrics.map((metric, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{metric.name}</p>
                    <div className="flex items-center gap-2">
                      {statusIcons[metric.status]}
                      <Badge 
                        variant={metric.status === 'normal' ? 'outline' : 'secondary'}
                        className={metric.status === 'normal' ? 'bg-green-50 text-green-800 border-green-300' : metric.status === 'abnormal' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' : 'bg-red-50 text-red-800 border-red-300'}
                      >
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  {metric.reference_range && (
                    <p className="text-sm text-gray-600">Normal: {metric.reference_range}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abnormalities */}
      {analysis.abnormalities && analysis.abnormalities.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Abnormalities Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.abnormalities.map((abnormality, idx) => (
              <Alert key={idx} variant="destructive" className={`border-2 ${severityColors[abnormality.severity]}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{abnormality.finding}</span>
                    <Badge className={severityColors[abnormality.severity]}>
                      {abnormality.severity}
                    </Badge>
                  </div>
                  <p className="text-sm">{abnormality.implication}</p>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {isCoachView ? 'Detailed Clinical Summary' : 'What This Means'}
            </h4>
            <p className="text-gray-700 leading-relaxed">
              {isCoachView ? analysis.coach_summary : analysis.summary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {analysis.next_steps && analysis.next_steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
            <CardDescription>Suggested follow-up tests or actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.next_steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Discussion Points (Coach View) */}
      {isCoachView && analysis.discussion_points && analysis.discussion_points.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Key Discussion Points</CardTitle>
            <CardDescription>Important topics to discuss with your client</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.discussion_points.map((point, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">•</span>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}