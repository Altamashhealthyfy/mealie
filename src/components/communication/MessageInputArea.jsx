import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X, Loader2, Smile, Zap } from "lucide-react";

const QUICK_MESSAGES = [
  { label: "👍 On track!", text: "I'm on track with my diet today!" },
  { label: "❓ Need help", text: "I need some guidance, can we talk?" },
  { label: "✅ Done!", text: "I completed today's meal plan!" },
  { label: "💧 Water ✓", text: "I've completed my water intake goal today!" },
  { label: "🏋️ Workout ✓", text: "Completed my workout for today!" },
  { label: "😴 Sleep issue", text: "I've been having trouble sleeping, any tips?" },
];

const EMOJIS = ["😊", "👍", "❤️", "🙏", "💪", "😄", "🎉", "✅", "⭐", "🥗", "💧", "🏃"];

export default function MessageInputArea({
  messageText,
  setMessageText,
  attachedFile,
  setAttachedFile,
  onSendMessage,
  isLoading,
  isUploading,
  textareaRef,
  getFileIcon,
  formatFileSize,
  isGroup = false
}) {
  const fileInputRef = useRef(null);
  const [showSlidePanel, setShowSlidePanel] = React.useState(false);
  const [slideTab, setSlideTab] = React.useState("quick");

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1073741824) {
      alert("⚠️ File size must be less than 1 GB");
      return;
    }
    setAttachedFile(file);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickMessage = (text) => {
    setMessageText(text);
    setShowSlidePanel(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2 bg-white border-t-2 border-gray-100 p-3">
      {/* Attachment Preview */}
      {attachedFile && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
          isGroup ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className={isGroup ? 'text-blue-600' : 'text-orange-600'}>
            {getFileIcon(attachedFile.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{attachedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(attachedFile.size)}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={removeAttachment} 
            className="text-red-500 h-7 w-7 p-0 hover:bg-red-50 rounded-full flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Quick Messages / Emoji Slide Panel */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showSlidePanel ? 'max-h-56' : 'max-h-0'
      }`}>
        <div className={`p-3 border-t-2 rounded-t-xl space-y-2 ${
          isGroup ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'
        }`}>
          <div className="flex gap-2 mb-3">
            <Button 
              size="sm" 
              onClick={() => setSlideTab('quick')}
              className={`text-xs h-7 px-3 rounded-full font-medium transition-all ${
                slideTab === 'quick' 
                  ? isGroup ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              variant="ghost"
            >
              <Zap className="w-3.5 h-3.5 mr-1" /> Quick
            </Button>
            <Button 
              size="sm" 
              onClick={() => setSlideTab('emoji')}
              className={`text-xs h-7 px-3 rounded-full font-medium transition-all ${
                slideTab === 'emoji' 
                  ? isGroup ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              variant="ghost"
            >
              <Smile className="w-3.5 h-3.5 mr-1" /> Emoji
            </Button>
          </div>

          {slideTab === 'quick' && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {QUICK_MESSAGES.map((qm, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickMessage(qm.text)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all hover:scale-105 ${
                    isGroup 
                      ? 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-100' 
                      : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  {qm.label}
                </button>
              ))}
            </div>
          )}

          {slideTab === 'emoji' && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMessageText(prev => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Controls */}
      <div className="flex items-end gap-2 w-full">
        <input 
          ref={fileInputRef} 
          type="file" 
          onChange={handleFileSelect} 
          className="hidden" 
          accept="*/*" 
        />
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className={`h-9 w-9 flex-shrink-0 rounded-full transition-all ${
            isGroup 
              ? 'text-blue-600 hover:bg-blue-100' 
              : 'text-orange-600 hover:bg-orange-100'
          }`}
          disabled={isLoading || isUploading}
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setShowSlidePanel(!showSlidePanel)}
          className={`h-9 w-9 flex-shrink-0 rounded-full transition-all ${
            showSlidePanel 
              ? isGroup ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
              : isGroup ? 'text-blue-600 hover:bg-blue-100' : 'text-orange-600 hover:bg-orange-100'
          }`}
          title="Quick messages & emojis"
        >
          <Smile className="w-5 h-5" />
        </Button>

        <Textarea 
          ref={textareaRef}
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          className={`resize-none min-h-[38px] max-h-28 text-sm border-2 rounded-2xl flex-1 min-w-0 px-4 py-2 font-medium transition-all ${
            isGroup
              ? 'border-blue-200 focus:border-blue-400 bg-blue-50'
              : 'border-orange-200 focus:border-orange-400 bg-orange-50'
          }`}
          rows={1} 
          disabled={isLoading || isUploading}
        />

        <Button 
          onClick={onSendMessage} 
          disabled={isLoading || isUploading || (!messageText.trim() && !attachedFile)}
          className={`h-9 w-9 flex-shrink-0 p-0 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:scale-100 ${
            isGroup
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              : 'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
          }`}
          title="Send message (Shift+Enter for new line)"
        >
          {isLoading || isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}