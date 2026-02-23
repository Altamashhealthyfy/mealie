import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2, X, Smile, Sticker } from "lucide-react";
import { Card } from "@/components/ui/card";

const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😊","😄","😂","🤣","😍","🥰","😘","😎","🤩","😅","😆","🙂","😉","😋","🥳","🤗","😇","🥺","😔","😢","😭","😱","😤","😠","🤔","🤭","🤫","😴","🥱","😷","🤒"],
  "👍 Gestures": ["👍","👎","👏","🙌","🤝","✌️","🤞","👊","💪","🙏","🫶","❤️","💯","🔥","⭐","✅","❌","💡","🎉","🎊"],
  "🍎 Food": ["🍎","🥗","🥤","💧","🥦","🍌","🥑","🍓","🍊","🥕","🍳","🍚","🫙","🥙","🍵","☕","🧃","🥛"],
  "💪 Health": ["💪","🏃","🧘","🏋️","🚴","🤸","🎯","🏆","⚡","🌟","🌱","🌿","💊","🩺","❤️‍🔥","🧬","🫀","🫁"],
};

const STICKERS = [
  { emoji: "🎉", label: "Great job!" },
  { emoji: "💪", label: "Keep it up!" },
  { emoji: "🌟", label: "You're a star!" },
  { emoji: "🥗", label: "Eat healthy!" },
  { emoji: "💧", label: "Stay hydrated!" },
  { emoji: "🏃", label: "Stay active!" },
  { emoji: "🎯", label: "On target!" },
  { emoji: "❤️", label: "Well done!" },
  { emoji: "🙌", label: "Amazing!" },
  { emoji: "🔥", label: "On fire!" },
  { emoji: "🌱", label: "Growing!" },
  { emoji: "✅", label: "Goal met!" },
  { emoji: "🧘", label: "Stay calm!" },
  { emoji: "🏆", label: "Champion!" },
  { emoji: "🤩", label: "Impressive!" },
  { emoji: "💯", label: "100%!" },
];

export default function EnhancedMessageInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled,
  attachedFiles = [],
  onRemoveFile
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("😊 Smileys");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (value || '').trim()) {
        onSend();
      }
    }
  };

  const insertEmoji = (emoji) => {
    onChange((value || '') + emoji);
    textareaRef.current?.focus();
  };

  const sendSticker = (sticker) => {
    onChange(`${sticker.emoji} ${sticker.label}`);
    setShowStickerPicker(false);
    setTimeout(() => onSend(), 50);
  };

  const toggleEmoji = () => {
    setShowEmojiPicker(prev => !prev);
    setShowStickerPicker(false);
  };

  const toggleSticker = () => {
    setShowStickerPicker(prev => !prev);
    setShowEmojiPicker(false);
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
                <Button variant="ghost" size="sm" onClick={() => onRemoveFile(idx)} className="text-red-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-lg p-3">
          {/* Category tabs */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button key={cat} onClick={() => setEmojiCategory(cat)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${emojiCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                {cat.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
            {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-100">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Health Stickers — Click to send instantly</p>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {STICKERS.map((sticker, i) => (
              <button key={i} onClick={() => sendSticker(sticker)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <span className="text-2xl">{sticker.emoji}</span>
                <span className="text-xs text-gray-600 text-center leading-tight">{sticker.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 w-full items-end">
        <input ref={fileInputRef} type="file" multiple onChange={(e) => {}} className="hidden" />
        
        {/* Emoji button */}
        <Button variant="outline" size="icon"
          onClick={toggleEmoji}
          disabled={disabled}
          title="Emoji"
          className={`flex-shrink-0 h-10 w-10 ${showEmojiPicker ? 'border-orange-500 bg-orange-50' : ''}`}>
          <Smile className="w-4 h-4 text-orange-500" />
        </Button>

        {/* Sticker button */}
        <Button variant="outline" size="icon"
          onClick={toggleSticker}
          disabled={disabled}
          title="Stickers"
          className={`flex-shrink-0 h-10 w-10 ${showStickerPicker ? 'border-purple-500 bg-purple-50' : ''}`}>
          <span className="text-base">🎨</span>
        </Button>

        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            disabled={disabled}
            rows={2}
            className="resize-none w-full"
          />
        </div>
        <Button
          onClick={onSend}
          disabled={disabled || isLoading || !(value || '').trim()}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex-shrink-0 h-10 w-10"
          size="icon"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}