import React from "react";
import { X, Phone, History, Calendar, MessageSquare, Star, Zap, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import PushNotificationManager from "@/components/notifications/PushNotificationManager";
import InitiateConversation from "@/components/communication/InitiateConversation";

export default function ChatSidebar({
  isOpen,
  onClose,
  coachName,
  coachUser,
  clientProfile,
  clientGroups,
  onStartCall,
  onShowCallHistory,
  showCallHistory,
  userEmail,
  isClient
}) {
  const joinDate = clientProfile?.join_date ? new Date(clientProfile.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-2xl
          transform transition-transform duration-300 ease-out
          md:relative md:translate-x-0 md:inset-auto md:z-auto md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0">
          <span className="font-bold text-white text-lg">Chat Info</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 md:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Coach Info */}
        <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-xl">{coachName.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-base truncate">{coachName}</p>
              <p className="text-sm text-gray-500">Health Coach</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Stats */}
        <div className="p-4 border-b flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Journey</p>
          <div className="space-y-2">
            {joinDate && (
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <Calendar className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span>Joined: {joinDate}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span>{clientProfile?.messages_count || 0} messages sent</span>
            </div>
            {clientProfile?.goal && (
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <Zap className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span className="capitalize">{clientProfile.goal.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onStartCall();
                onClose();
              }}
              className="w-full justify-start text-green-600 hover:bg-green-50 border-green-200 text-xs h-9"
            >
              <Phone className="w-3.5 h-3.5 mr-2" /> Video Call Coach
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onShowCallHistory(!showCallHistory);
                onClose();
              }}
              className="w-full justify-start text-purple-600 hover:bg-purple-50 border-purple-200 text-xs h-9"
            >
              <History className="w-3.5 h-3.5 mr-2" /> Call History
            </Button>
            {isClient && (
              <div className="w-full">
                <InitiateConversation />
              </div>
            )}
          </div>
        </div>

        {/* Groups */}
        {clientGroups.length > 0 && (
          <div className="p-4 border-b flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Groups ({clientGroups.length})
            </p>
            <div className="space-y-1.5">
              {clientGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100"
                >
                  <Users className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-800 truncate">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification toggle */}
        <div className="p-4 mt-auto border-t flex-shrink-0">
          <PushNotificationManager userEmail={userEmail} />
        </div>
      </div>
    </>
  );
}