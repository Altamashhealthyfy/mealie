import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Maximize2, Minimize2, Users, Circle
} from "lucide-react";

/**
 * VideoCallRoom
 * Props:
 *  - roomId: string
 *  - localName: string
 *  - remoteName: string
 *  - onEnd: () => void
 *  - isInitiator: boolean
 *  - signalingChannel: { send(msg), onMessage(cb), start(), stop() }
 */
export default function VideoCallRoom({ roomId, localName, remoteName, onEnd, isInitiator, signalingChannel }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const remoteDescSet = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const mountedRef = useRef(true);
  const remoteConnectedRef = useRef(false);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const addPendingCandidates = async (pc) => {
    for (const candidate of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
    pendingCandidates.current = [];
  };

  useEffect(() => {
    mountedRef.current = true;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ]
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingChannel.send({ type: 'ice-candidate', candidate: e.candidate, roomId });
      }
    };

    pc.ontrack = (e) => {
      console.log('ontrack fired, streams:', e.streams, 'track:', e.track);
      if (e.streams && e.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play().catch(err => console.warn('Remote play error:', err));
        }
      } else if (e.track) {
        // fallback: build stream manually
        if (remoteVideoRef.current) {
          let stream = remoteVideoRef.current.srcObject;
          if (!stream || !(stream instanceof MediaStream)) {
            stream = new MediaStream();
            remoteVideoRef.current.srcObject = stream;
          }
          stream.addTrack(e.track);
          remoteVideoRef.current.play().catch(err => console.warn('Remote play error:', err));
        }
      }
      if (!remoteConnectedRef.current) {
        remoteConnectedRef.current = true;
        setRemoteConnected(true);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (!mountedRef.current) return;
      console.log('Connection state:', pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        remoteConnectedRef.current = false;
        setRemoteConnected(false);
      } else if (pc.connectionState === 'connected') {
        remoteConnectedRef.current = true;
        setRemoteConnected(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!mountedRef.current) return;
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    // Handle incoming signaling messages
    const handleMessage = async (msg) => {
      if (!mountedRef.current || !pcRef.current) return;
      const peer = pcRef.current;

      try {
        if (msg.type === 'offer' && !isInitiator) {
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          remoteDescSet.current = true;
          await addPendingCandidates(peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          signalingChannel.send({ type: 'answer', sdp: answer, roomId });

        } else if (msg.type === 'answer' && isInitiator) {
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          remoteDescSet.current = true;
          await addPendingCandidates(peer);

        } else if (msg.type === 'ice-candidate') {
          if (remoteDescSet.current) {
            try { await peer.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          } else {
            // Queue until remote description is set
            pendingCandidates.current.push(msg.candidate);
          }

        } else if (msg.type === 'end-call') {
          cleanup();
          onEnd?.();
        }
      } catch (err) {
        console.error('Signal handling error:', err);
      }
    };

    signalingChannel.onMessage(handleMessage);
    signalingChannel.start();

    // Get local media then start
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signalingChannel.send({ type: 'offer', sdp: offer, roomId });
        }
      } catch (err) {
        console.error('Media error:', err);
        if (mountedRef.current) {
          setError('Could not access camera/microphone. Please check browser permissions and try again.');
        }
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      signalingChannel.stop();
      cleanup();
    };
  }, []);

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

  const startRecording = async () => {
    try {
      // Canvas-based composite: remote (main) + local PiP
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const remoteVideo = remoteVideoRef.current;
      const localVideo = localVideoRef.current;

      const drawFrame = () => {
        if (!recording && mediaRecorderRef.current?.state !== 'recording') return;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 1280, 720);

        // Draw remote video (main area)
        if (remoteVideo && remoteVideo.readyState >= 2) {
          ctx.drawImage(remoteVideo, 0, 0, 1280, 720);
        }
        // Draw local PiP (bottom-right)
        if (localVideo && localVideo.readyState >= 2) {
          ctx.drawImage(localVideo, 1280 - 260, 720 - 160, 240, 145);
          ctx.strokeStyle = '#4a5568';
          ctx.lineWidth = 2;
          ctx.strokeRect(1280 - 260, 720 - 160, 240, 145);
        }
        requestAnimationFrame(drawFrame);
      };

      const canvasStream = canvas.captureStream(30);

      // Add audio tracks
      const audioTracks = [];
      localStreamRef.current?.getAudioTracks().forEach(t => audioTracks.push(t));
      const remoteStream = remoteVideo?.srcObject;
      if (remoteStream instanceof MediaStream) {
        remoteStream.getAudioTracks().forEach(t => audioTracks.push(t));
      }

      const recordingStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks
      ]);

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

      const mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error('Recording error:', e);
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

      // Kick off canvas rendering
      requestAnimationFrame(drawFrame);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${new Date().getTime()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
      };
      clearInterval(recordingTimerRef.current);
      setRecording(false);
      setRecordingTime(0);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <VideoOff className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white text-lg font-semibold mb-2">Camera/Mic Error</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Button onClick={onEnd} className="bg-red-600 hover:bg-red-700 text-white">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
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
                <Badge className="bg-blue-500 text-white text-xs px-2 py-0">Sharing screen</Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-gray-400 hover:text-white">
          {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!remoteConnected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white font-bold">{remoteName?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>
              <p className="text-white text-lg font-medium">{remoteName}</p>
              <p className="text-gray-400 text-sm mt-1 animate-pulse">Waiting to connect…</p>
            </div>
          </div>
        )}

        {/* Local PiP */}
        <div className="absolute top-4 right-4 w-36 h-24 sm:w-48 sm:h-32 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl bg-gray-800">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
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
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${screenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          {screenSharing ? <MonitorOff className="w-5 h-5 text-white" /> : <Monitor className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleRecording}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'}`}
          title={recording ? `Recording... ${formatDuration(recordingTime)}` : 'Start recording'}
        >
          <Circle className={`w-5 h-5 text-white ${recording ? 'fill-white' : ''}`} />
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