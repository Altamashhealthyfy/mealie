import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VoiceCommandControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setShowTranscript(true);
      };

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            interim += transcriptSegment + ' ';
          } else {
            interim += transcriptSegment;
          }
        }
        setTranscript(interim.toLowerCase().trim());
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!transcript) return;

    const command = transcript.toLowerCase();
    const routes = {
      'home': createPageUrl('ClientDashboard'),
      'dashboard': createPageUrl('ClientDashboard'),
      'progress': createPageUrl('ProgressTracking'),
      'my progress': createPageUrl('ProgressTracking'),
      'meals': createPageUrl('MyAssignedMealPlan'),
      'meal plan': createPageUrl('MyAssignedMealPlan'),
      'food log': createPageUrl('FoodLog'),
      'log': createPageUrl('FoodLog'),
      'messages': createPageUrl('ClientCommunication'),
      'message': createPageUrl('ClientCommunication'),
      'coach': createPageUrl('ClientCommunication'),
      'appointments': createPageUrl('ClientAppointments'),
      'appointment': createPageUrl('ClientAppointments'),
      'wellness': createPageUrl('MPESSTracker'),
      'mpess': createPageUrl('MPESSTracker'),
      'recipes': createPageUrl('ClientRecipes'),
      'recipe': createPageUrl('ClientRecipes'),
      'resources': createPageUrl('ClientResourceTracker'),
      'resource': createPageUrl('ClientResourceTracker'),
      'goals': createPageUrl('ClientPersonalGoals'),
      'goal': createPageUrl('ClientPersonalGoals'),
      'profile': createPageUrl('Profile'),
      'settings': createPageUrl('Profile'),
      'help': createPageUrl('HelpCenter'),
    };

    for (const [key, url] of Object.entries(routes)) {
      if (command.includes(key)) {
        navigate(url);
        setTranscript('');
        setShowTranscript(false);
        break;
      }
    }
  }, [transcript, navigate]);

  const toggleListening = () => {
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
    }
  };

  const isCommunicationPage = location.pathname.toLowerCase().includes('communication');

  if (!isSupported || isCommunicationPage) return null;

  return (
    <>
      {/* Floating Voice Button */}
      <button
        onClick={toggleListening}
        className={`fixed w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center md:bottom-8 md:right-8 bottom-24 right-6 ${
          isListening
            ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:scale-110'
        }`}
        title={isListening ? 'Listening...' : 'Click to use voice commands'}
      >
        {isListening ? (
          <Volume2 className="w-6 lg:w-7 h-6 lg:h-7 text-white" />
        ) : (
          <Mic className="w-6 lg:w-7 h-6 lg:h-7 text-white" />
        )}
      </button>

      {/* Transcript Display */}
      {showTranscript && (
        <div className="fixed max-w-xs bg-white rounded-xl shadow-xl border-2 border-orange-200 p-4 z-40 animate-in fade-in slide-in-from-bottom-4 md:bottom-28 md:right-8 bottom-40 right-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-semibold text-gray-900">Voice Command</span>
            </div>
            <button
              onClick={() => setShowTranscript(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 break-words">
            {transcript || 'Listening...'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-400">Try: "home", "progress", "messages", "meals", etc.</p>
          </div>
        </div>
      )}
    </>
  );
}