import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Maximize2, Minimize2, Users
} from "lucide-react";

/**
 * VideoCallRoom
 * Props:
 *  - roomId: string (unique call room identifier)
 *  - localName: string
 *  - remoteName: string
 *  - onEnd: () => void
 *  - isInitiator: boolean (true = coach/caller, false = client/callee)
 *  - signalingChannel: { send(msg), onMessage(cb) } – caller must provide
 */
export default function VideoCallRoom({ roomId, localName, remoteName, onEnd, isInitiator, signalingChannel }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingChannel.send({ type: 'ice-candidate', candidate: e.candidate, roomId });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setRemoteConnected(true);
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setRemoteConnected(false);
      }
    };

    return pc;
  }, [signalingChannel, roomId]);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signalingChannel.send({ type: 'offer', sdp: offer, roomId });
        }
      } catch (err) {
        console.error('Media error:', err);
        alert('Could not access camera/microphone. Please check permissions.');
        onEnd?.();
      }
    };

    start();

    const handleMessage = async (msg) => {
      if (!mounted || msg.roomId !== roomId) return;
      const pc = pcRef.current;

      if (msg.type === 'offer' && !isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingChannel.send({ type: 'answer', sdp: answer, roomId });
      } else if (msg.type === 'answer' && isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === 'ice-candidate') {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else if (msg.type === 'end-call') {
        cleanup();
        onEnd?.();
      }
    };

    signalingChannel.onMessage(handleMessage);

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
  };

  const handleEndCall = () => {
    signalingChannel.send({ type: 'end-call', roomId });
    cleanup();
    onEnd?.();
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setScreenSharing(true);

        screenTrack.onended = () => stopScreenShare();
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const pc = pcRef.current;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (pc && camTrack) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(camTrack);
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenSharing(false);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{remoteName}</p>
            <div className="flex items-center gap-2">
              {remoteConnected ? (
                <Badge className="bg-green-500 text-white text-xs px-2 py-0">
                  Connected • {formatDuration(callDuration)}
                </Badge>
              ) : (
                <Badge className="bg-yellow-500 text-white text-xs px-2 py-0 animate-pulse">
                  Connecting…
                </Badge>
              )}
              {screenSharing && (
                <Badge className="bg-blue-500 text-white text-xs px-2 py-0">
                  Sharing screen
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-gray-400 hover:text-white"
        >
          {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {/* Remote video (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!remoteConnected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white font-bold">
                  {remoteName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <p className="text-white text-lg font-medium">{remoteName}</p>
              <p className="text-gray-400 text-sm mt-1 animate-pulse">Waiting to connect…</p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-36 h-24 sm:w-48 sm:h-32 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!camOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <p className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
            {localName || 'You'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 py-4 sm:py-6 bg-gray-800 border-t border-gray-700">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            camOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            screenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          {screenSharing ? <MonitorOff className="w-5 h-5 text-white" /> : <Monitor className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all shadow-lg"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}