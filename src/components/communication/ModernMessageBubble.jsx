import React from "react";
import { Check, CheckCheck, Download, Image as ImageIcon, Video, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ModernMessageBubble({ message, isFromClient, formatToIST, handleDownload, getFileIcon, formatFileSize }) {
  const isImage = message.attachment_type?.startsWith('image/');
  const isVideo = message.attachment_type?.startsWith('video/');

  return (
    <div className={`flex ${isFromClient ? 'justify-end' : 'justify-start'} mb-3 animate-in fade-in duration-300`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2.5 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl ${
        isFromClient
          ? 'bg-gradient-to-br from-orange-500 via-orange-500 to-red-500 text-white rounded-br-none'
          : 'bg-white text-gray-900 border-2 border-gray-100 rounded-bl-none'
      }`}>
        {/* Message Text */}
        {message.message && !message.message.includes('(File attachment)') && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
        )}

        {/* Attachment */}
        {message.attachment_url && (
          <div className="mt-2">
            {isImage ? (
              <div className="relative group rounded-lg overflow-hidden">
                <img 
                  src={message.attachment_url} 
                  alt={message.attachment_name}
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '280px' }}
                />
                <button 
                  onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-10"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ) : isVideo ? (
              <video 
                controls 
                className="max-w-full rounded-lg"
                style={{ maxHeight: '280px' }}
              >
                <source src={message.attachment_url} type={message.attachment_type} />
              </video>
            ) : (
              <button 
                onClick={() => handleDownload(message.attachment_url, message.attachment_name)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all w-full text-left mt-2 group ${
                  isFromClient 
                    ? 'bg-white/20 border-white/30 hover:bg-white/30' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className={`flex-shrink-0 ${isFromClient ? 'text-white' : 'text-gray-600'}`}>
                  {getFileIcon(message.attachment_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isFromClient ? 'text-white' : 'text-gray-900'}`}>
                    {message.attachment_name || 'Attachment'}
                  </p>
                  {message.attachment_size && (
                    <p className={`text-xs ${isFromClient ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatFileSize(message.attachment_size)}
                    </p>
                  )}
                </div>
                <Download className={`w-4 h-4 flex-shrink-0 ${isFromClient ? 'text-white' : 'text-gray-600'}`} />
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-between gap-1.5 mt-2 text-xs ${
          isFromClient ? 'text-white/70' : 'text-gray-400'
        }`}>
          <span className="font-medium">{formatToIST(message.created_date)}</span>
          {isFromClient && (
            <>
              {message.read ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}