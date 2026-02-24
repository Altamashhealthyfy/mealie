import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientListSidebar({ 
  clients, 
  selectedClient, 
  searchQuery, 
  onSearchChange, 
  onClientSelect, 
  onClose, 
  getLastMessage, 
  getUnreadCount, 
  isLoading,
  formatDateTimeIST 
}) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50">
      {/* Modern Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-lg text-gray-900">Clients</h3>
          <p className="text-xs text-gray-500 mt-0.5">{clients.length} clients</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Enhanced Search */}
      <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm bg-white border-gray-200 rounded-lg focus-visible:ring-orange-500 focus-visible:border-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Client List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto text-orange-500 animate-spin mb-3">⟳</div>
              <p className="text-sm text-gray-500 font-medium">Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto text-gray-300 mb-3 text-3xl">📭</div>
              <p className="text-sm text-gray-600 font-medium">{searchQuery ? 'No clients found' : 'No clients yet'}</p>
              <p className="text-xs text-gray-500 mt-1">{searchQuery ? 'Try a different search' : 'Start by adding a client'}</p>
            </div>
          ) : (
            clients.map((client) => {
              const lastMessage = getLastMessage(client.id);
              const unreadCount = getUnreadCount(client.id);
              const isSelected = selectedClient?.id === client.id;

              return (
                <button
                  key={client.id}
                  onClick={() => onClientSelect(client)}
                  className={`w-full px-3 py-3 rounded-xl cursor-pointer transition-all text-left duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200'
                      : 'hover:bg-white hover:shadow-sm text-gray-900 bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-gradient-to-br from-orange-400 to-red-400 text-white'
                    }`}>
                      {(client.full_name || 'C').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {client.full_name}
                        </h4>
                        {unreadCount > 0 && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-orange-500 text-white'
                          }`}>
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className={`text-xs truncate mt-1 ${isSelected ? 'text-white/75' : 'text-gray-600'}`}>
                          {lastMessage.sender_type === 'dietitian' ? '📤 ' : '📥 '}
                          {lastMessage.attachment_url
                            ? '📎 Attachment'
                            : lastMessage.content_type === 'video_signal' || (lastMessage.message && lastMessage.message.startsWith('{"type"'))
                              ? '📹 Video call'
                              : lastMessage.message?.slice(0, 40) || '(No text)'}
                        </p>
                      )}
                      {lastMessage?.created_date && (
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatDateTimeIST(lastMessage.created_date)}
                        </p>
                      )}
                    </div>
                    {isSelected && <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}