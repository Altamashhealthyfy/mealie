import React from 'react';
import { CheckCheck, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

export default function ReadReceiptIndicator({ isImportant, readBy, createdDate }) {
  if (!isImportant) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      {readBy && readBy.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCheck className="w-3 h-3" />
              <span>{readBy.length} read</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              {readBy.map((reader, idx) => (
                <div key={idx}>
                  {reader.user_id} - {format(new Date(reader.read_at), 'MMM dd, HH:mm')}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Pending read</span>
        </div>
      )}
    </div>
  );
}