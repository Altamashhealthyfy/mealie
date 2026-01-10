import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Download, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function FileVersionHistory({ originalFileId }) {
  const { data: versions = [] } = useQuery({
    queryKey: ['fileVersions', originalFileId],
    queryFn: () => base44.entities.FileVersion.filter({ original_file_id: originalFileId }),
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File Version History</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-gray-500">No versions found</p>
          ) : (
            versions.map((version) => (
              <Card key={version.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={version.is_current ? 'bg-green-500' : 'bg-gray-500'}>
                          v{version.version_number}
                        </Badge>
                        {version.is_current && <Badge variant="outline">Current</Badge>}
                      </div>
                      <p className="font-medium">{version.file_name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(version.file_size)} • Uploaded by {version.uploaded_by}
                      </p>
                      {version.change_notes && (
                        <p className="text-sm text-gray-700 mt-2">
                          📝 {version.change_notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(version.created_date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <a
                      href={version.file_url}
                      download
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}