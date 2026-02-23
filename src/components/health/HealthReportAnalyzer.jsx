import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, TrendingUp, FileText,
  Activity, Heart, Zap, ChevronRight, Clock, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HealthReportAnalyzer({ clientId, clientName, onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [reportType, setReportType] = useState('Blood Work');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/pdf', 'application/pdf'].includes(selectedFile.type)) {
        setError('Please upload a PNG, JPG, or PDF file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Analyze with backend function
      const response = await base44.functions.invoke('analyzeHealthReport', {
        file_url,
        client_id: clientId,
        client_name: clientName,
        report_type: reportType
      });

      setAnalysis(response);
      onAnalysisComplete?.(response);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze report');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!analysis && (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Health Report
            </CardTitle>
            <CardDescription>
              Upload a blood work, lab report, or medical document for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-2 block">Report Type</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Blood Work">Blood Work</option>
                  <option value="Thyroid Panel">Thyroid Panel</option>
                  <option value="Lipid Panel">Lipid Panel</option>
                  <option value="Liver Function">Liver Function Tests</option>
                  <option value="Kidney Function">Kidney Function Tests</option>
                  <option value="Glucose Testing">Glucose Testing</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block cursor-pointer">
                <span className="text-sm font-semibold text-gray-700 mb-3 block">Select File</span>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-100 transition-colors">
                  <FileText className="w-12 h-12 mx-auto text-blue-400 mb-2" />
                  <p className="text-sm text-gray-700 font-medium">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, or PDF (max 10MB)</p>
                </div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/png,image/jpeg,application/pdf"
                />
              </label>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Report...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      <AnimatePresence mode="wait">
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Health Score Card */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-6 h-6 text-green-600" />
                    Health Analysis Summary
                  </CardTitle>
                  <Badge className={`text-lg px-4 py-2 ${
                    analysis.summary.status === 'Healthy' ? 'bg-green-500' :
                    analysis.summary.status === 'Monitor' ? 'bg-yellow-500' :
                    'bg-red-500'
                  } text-white`}>
                    {analysis.summary.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Overall Health Score</span>
                    <span className="text-3xl font-bold text-green-600">{analysis.summary.health_score}/100</span>
                  </div>
                  <Progress value={analysis.summary.health_score} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-600">{analysis.indicators_measured}</p>
                    <p className="text-xs text-gray-600">Indicators Measured</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-600">{analysis.normal_count}</p>
                    <p className="text-xs text-gray-600">Normal Values</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-2xl font-bold text-orange-600">{analysis.concerning_count}</p>
                    <p className="text-xs text-gray-600">Concerns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Summary */}
            {analysis.clinical_insights?.clinical_summary && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Clinical Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {analysis.clinical_insights.clinical_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Concerns */}
              {analysis.clinical_insights?.concerns?.length > 0 && (
                <Card className="border-l-4 border-red-500 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Areas of Concern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.clinical_insights.concerns.slice(0, 3).map((concern, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Positive Observations */}
              {analysis.clinical_insights?.positive_observations?.length > 0 && (
                <Card className="border-l-4 border-green-500 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Positive Observations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.clinical_insights.positive_observations.slice(0, 3).map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coaching Recommendations */}
            {analysis.clinical_insights?.coaching_recommendations?.length > 0 && (
              <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Coaching Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.clinical_insights.coaching_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 pt-0.5">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Detailed Indicators */}
            {(analysis.detailed_analysis?.normal_indicators?.length > 0 || analysis.detailed_analysis?.concerning_indicators?.length > 0) && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Detailed Indicator Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Concerning */}
                  {analysis.detailed_analysis.concerning_indicators.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-3">⚠️ Outside Normal Range</h4>
                      <div className="space-y-2">
                        {analysis.detailed_analysis.concerning_indicators.map((indicator, idx) => (
                          <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{indicator.name}</span>
                              <Badge className={indicator.status === 'High' ? 'bg-red-600' : 'bg-orange-600'}>
                                {indicator.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">
                              <strong>Value:</strong> {indicator.value} {indicator.unit} 
                              <br />
                              <strong>Range:</strong> {indicator.range} {indicator.unit}
                            </p>
                            {indicator.recommendation && (
                              <p className="text-sm text-red-700 mt-2">💡 {indicator.recommendation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Normal */}
                  {analysis.detailed_analysis.normal_indicators.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3">✓ Normal Range</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysis.detailed_analysis.normal_indicators.map((indicator, idx) => (
                          <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-medium text-gray-900">{indicator.name}</p>
                            <p className="text-sm text-gray-700">
                              {indicator.value} {indicator.unit}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Report Metadata */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Report Type</p>
                  <p className="font-semibold text-gray-900">{analysis.report_type}</p>
                </div>
                <div>
                  <p className="text-gray-600">Test Date</p>
                  <p className="font-semibold text-gray-900">{analysis.test_date || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Lab</p>
                  <p className="font-semibold text-gray-900">{analysis.lab_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Analyzed</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(analysis.analysis_date).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setFile(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Analyze Another Report
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Print Report
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}