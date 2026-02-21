import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, Clock, Star, Menu, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ContentTypePicker from '@/components/communication/ContentTypePicker';

export default function EnhancedMessageInput({
  messageText,
  onMessageChange,
  onSend,
  onFileSelect,
  onSchedule,
  onTypeSelect,
  attachedFile,
  onRemoveFile,
  isLoading,
  disabled,
  isImportant,
  onImportantChange,
  showQuickReply,
  showProgressShare,
  showAutoCheckIn,
  contentType,
  fileInputRef,
  textareaRef,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  return (
    <div className="p-3 md:p-4 border-t-2 border-orange-500 bg-white space-y-3">
      {/* Attached File Preview */}
      {attachedFile && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachedFile.name}
                </p>
                <p className="text-xs text-gray-600">
                  {(attachedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="space-y-2">
        {/* Input Field - Takes Full Width */}
        <Textarea
          ref={textareaRef}
          placeholder="Type your message..."
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="resize-none text-sm border-2 border-gray-200 focus:border-orange-500 rounded-xl"
          rows={3}
          disabled={disabled}
        />

        {/* Action Buttons Row - Better Grouped */}
        <div className="flex items-end gap-2">
          {/* Group 1: Attachments & Options */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1">
            {/* Attachment */}
            <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="h-9 w-9 p-0 hover:bg-gray-200"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4 text-orange-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-48 p-2">
                <ContentTypePicker
                  selectedType={contentType}
                  onTypeSelect={(type) => {
                    onTypeSelect(type);
                    setShowAttachmentMenu(false);
                  }}
                  disabled={disabled}
                  compact
                />
              </PopoverContent>
            </Popover>

            {/* Importance Flag */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImportantChange(!isImportant)}
              className={`h-9 w-9 p-0 ${
                isImportant
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  : 'hover:bg-gray-200'
              }`}
              title="Mark as important"
            >
              <Star className="w-4 h-4" />
            </Button>
          </div>

          {/* Group 2: Input Spacer */}
          <div className="flex-1" />

          {/* Group 3: Secondary Actions (Collapsible on Mobile) */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSchedule}
              disabled={disabled}
              className="h-9 px-2 text-xs hover:bg-gray-200"
              title="Schedule message"
            >
              <Clock className="w-4 h-4 mr-1" />
              <span className="hidden md:inline">Schedule</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <Popover open={showMenu} onOpenChange={setShowMenu}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-gray-200"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-56">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSchedule();
                      setShowMenu(false);
                    }}
                    disabled={disabled}
                    className="w-full justify-start"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Message
                  </Button>
                  {showQuickReply && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      ⚡ Quick Replies
                    </Button>
                  )}
                  {showProgressShare && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      📊 Progress Share
                    </Button>
                  )}
                  {showAutoCheckIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      📅 Auto Check-in
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Group 4: Send Button - Primary Action */}
          <Button
            onClick={onSend}
            disabled={disabled || !messageText.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-9 px-4 font-semibold shadow-lg text-white whitespace-nowrap"
          >
            {disabled ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 text-center">
        Shift+Enter for new line •
        <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono mx-1">
          Enter
        </kbd>
        to send
      </p>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => onFileSelect(e.target.files?.[0])}
        className="hidden"
        accept="*/*"
      />
    </div>
  );
}