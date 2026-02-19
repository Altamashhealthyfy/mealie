import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, BookOpen, Play, FileText } from 'lucide-react';
import { toast } from 'sonner';

const typeIcons = {
  pdf: FileText,
  article: FileText,
  video: Play,
  guide: BookOpen,
  infographic: BookOpen,
  workbook: FileText,
  worksheet: FileText,
  other: FileText
};

export default function ResourceSuggestionPanel({ clientId, onAssign, isLoading = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadSuggestions();
    }
  }, [clientId]);

  const loadSuggestions = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('suggestResourcesForClient', {
        clientId,
        limit: 5
      });
      setSuggestions(res.data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load resource suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignResource = async (resourceId) => {
    setAssigning(resourceId);
    try {
      await onAssign?.(resourceId);
      // Reload suggestions after assigning
      await loadSuggestions();
    } catch (error) {
      console.error('Error assigning resource:', error);
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            AI Suggested Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            AI Suggested Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <p className="text-sm">No resources match this client's current needs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          AI Suggested Resources
        </CardTitle>
        <CardDescription>Personalized recommendations based on client goals and progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map(suggestion => {
          const Icon = typeIcons[suggestion.type] || FileText;
          return (
            <div
              key={suggestion.id}
              className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg hover:border-yellow-400 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm">{suggestion.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{suggestion.reason}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-white">
                      {suggestion.category.replace(/_/g, ' ')}
                    </Badge>
                    {suggestion.reading_time_minutes && (
                      <Badge variant="outline" className="text-xs bg-white">
                        {suggestion.reading_time_minutes} min read
                      </Badge>
                    )}
                    {suggestion.duration_minutes && (
                      <Badge variant="outline" className="text-xs bg-white">
                        {suggestion.duration_minutes} min video
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleAssignResource(suggestion.id)}
                disabled={assigning === suggestion.id || isLoading}
                className="mt-2 w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {assigning === suggestion.id ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign to Client'
                )}
              </Button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={loadSuggestions}
          disabled={loading}
          className="w-full text-yellow-700 hover:bg-yellow-100"
        >
          Refresh Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}