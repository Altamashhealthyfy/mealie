import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function EnhancedMessageInput({
  value,
  onChange,
  onSend,
  onFileAttach,
  isLoading,
  disabled,
  attachedFiles = [],
  onRemoveFile
}) {
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSend();
      }
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        // Upload file using base44 integration
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: file,
          headers: {
            'X-File-Name': file.name,
            'X-File-Type': file.type
          }
        }).then(res => res.json());

        if (onFileAttach) {
          onFileAttach({
            url: response.file_url,
            name: file.name,
            type: file.type,
            size: file.size
          });
        }
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 w-full">
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          {attachedFiles.map((file, idx) => (
            <Card key={idx} className="p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Uploading...'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(idx)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 w-full items-end">
        <div className="flex-1 min-w-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            disabled={disabled}
            rows={3}
            className="resize-none w-full"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
            className="flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            onClick={onSend}
            disabled={disabled || isLoading || !value.trim()}
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}