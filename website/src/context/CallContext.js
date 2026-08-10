import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useSocket } from "./SocketContext";
import {
  startCall,
  acceptCall,
  rejectCall,
  busyCall,
  cancelCall,
  endCall,
  missedCall,
} from "../api/callApi";
import { toast } from "react-toastify";

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

// Global Agora RTC Client instance
const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();

  // Call States
  const [callState, setCallState] = useState("idle"); // "idle" | "ringing_outgoing" | "ringing_incoming" | "connected"
  const [activeCall, setActiveCall] = useState(null); // { _id, caller, receiver, type, channelName, status, agora, isIncoming }
  const [remoteUser, setRemoteUser] = useState(null);

  // Ref to always hold latest activeCall for async socket listeners
  const activeCallRef = useRef(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Controls States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showCallHistoryModal, setShowCallHistoryModal] = useState(false);

  // Refs for tracks and timers
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const durationTimerRef = useRef(null);
  const ringingTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  // 1. Ringtone Generator using Web Audio API
  const playRingtone = (isIncoming = false) => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContextRef.current = new AudioCtx();

      const playBeep = () => {
        if (!audioContextRef.current) return;
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(isIncoming ? 440 : 350, audioContextRef.current.currentTime);
        gain.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        osc.start();
        osc.stop(audioContextRef.current.currentTime + 1.2);
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, isIncoming ? 2500 : 3000);
    } catch (e) {
      console.error("Audio Context Error:", e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  // 2. Agora RTC Event Subscriptions
  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      console.log(`📡 Agora Remote User Published: ${user.uid}, mediaType: ${mediaType}`);
      await agoraClient.subscribe(user, mediaType);
      setRemoteUser(user);

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      console.log(`📡 Agora Remote User Unpublished: ${user.uid}, mediaType: ${mediaType}`);
      if (mediaType === "video") {
        setRemoteUser((prev) => (prev?.uid === user.uid ? { ...prev, videoTrack: null } : prev));
      }
    };

    const handleUserLeft = (user) => {
      console.log(`📡 Agora Remote User Left: ${user.uid}`);
      toast.info("Remote user disconnected");
      cleanupAndResetCall();
    };

    agoraClient.on("user-published", handleUserPublished);
    agoraClient.on("user-unpublished", handleUserUnpublished);
    agoraClient.on("user-left", handleUserLeft);

    return () => {
      agoraClient.off("user-published", handleUserPublished);
      agoraClient.off("user-unpublished", handleUserUnpublished);
      agoraClient.off("user-left", handleUserLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Socket.IO Call Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming Call Triggered
    const handleIncomingCall = (data) => {
      if (activeCallRef.current) {
        // Automatically report busy if already in another call
        busyCall(data.callId);
        return;
      }

      const callObj = {
        _id: data.callId,
        caller: data.caller,
        type: data.type,
        channelName: data.channelName,
        isIncoming: true,
      };

      setActiveCall(callObj);
      setCallState("ringing_incoming");
      playRingtone(true);

      // Auto missed call after 35s
      ringingTimeoutRef.current = setTimeout(() => {
        declineIncomingCall(data.callId, true);
      }, 35000);
    };

    // Caller receives Call Accepted event from Receiver
    const handleCallAccepted = async (data) => {
      stopRingtone();
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

      setCallState("connected");
      toast.success("Call connected!");

      const targetCall = activeCallRef.current;
      if (targetCall && targetCall.agora) {
        await joinAgoraChannel(
          targetCall.agora.appId,
          targetCall.channelName || data.channelName,
          targetCall.agora.token,
          targetCall.agora.uid,
          targetCall.type
        );
      }
    };

    // Call Rejected
    const handleCallRejected = () => {
      stopRingtone();
      toast.error("Call rejected");
      cleanupAndResetCall();
    };

    // Receiver Busy
    const handleCallBusy = () => {
      stopRingtone();
      toast.warn("User is busy on another call");
      cleanupAndResetCall();
    };

    // Call Cancelled by caller
    const handleCallCancelled = () => {
      stopRingtone();
      toast.info("Call cancelled by caller");
      cleanupAndResetCall();
    };

    // Call Missed
    const handleCallMissed = () => {
      stopRingtone();
      toast.info("Missed call");
      cleanupAndResetCall();
    };

    // Call Ended
    const handleCallEnded = () => {
      stopRingtone();
      toast.info("Call ended");
      cleanupAndResetCall();
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_busy", handleCallBusy);
    socket.on("call_cancelled", handleCallCancelled);
    socket.on("call_missed", handleCallMissed);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_busy", handleCallBusy);
      socket.off("call_cancelled", handleCallCancelled);
      socket.off("call_missed", handleCallMissed);
      socket.off("call_ended", handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // 4. Timer for Connected Call Duration
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // 5. Join Agora RTC Channel & Publish Local Tracks (With Camera Fallback)
  const joinAgoraChannel = async (appId, channelName, token, uid, callType) => {
    try {
      if (!appId || appId === "5e8f49d21e0a4fbc8a1b2c3d4e5f6a7b") {
        toast.error("Please add a valid AGORA_APP_ID in backend .env");
        cleanupAndResetCall();
        return;
      }

      if (agoraClient.connectionState !== "DISCONNECTED") {
        try {
          await agoraClient.leave();
        } catch (e) {}
      }

      console.log(`🚀 Joining Agora channel: ${channelName}, UID: ${uid}, appId: ${appId}`);
      await agoraClient.join(appId, channelName, token || null, uid);

      let audioTrack = null;
      let videoTrack = null;

      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
      } catch (audioErr) {
        console.warn("Microphone track creation error:", audioErr);
      }

      if (callType === "video") {
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrackRef.current = videoTrack;
        } catch (videoErr) {
          console.warn("Camera track creation error (falling back to audio):", videoErr);
          toast.warn("Camera unavailable. Continuing with audio.");
        }
      }

      const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
      if (tracksToPublish.length > 0) {
        await agoraClient.publish(tracksToPublish);
        console.log("✅ Local tracks published successfully to Agora");
      }
    } catch (err) {
      console.error("Agora Join Channel Error:", err);
      const errStr = String(err?.message || err || "");
      if (errStr.includes("can not find appid") || errStr.includes("invalid vendor key")) {
        toast.error("Invalid AGORA_APP_ID! Update backend .env with your real App ID from console.agora.io");
      } else {
        toast.error("Failed to connect call: " + errStr);
      }
      cleanupAndResetCall();
    }
  };

  // 6. Initiate Outgoing Call (Voice / Video)
  const initiateCall = async (receiverUser, type = "audio") => {
    if (!receiverUser || !receiverUser._id) {
      toast.error("Invalid recipient user");
      return;
    }

    try {
      const res = await startCall(receiverUser._id, type);
      if (res && res.success) {
        const callObj = {
          _id: res.call._id,
          receiver: receiverUser,
          type,
          channelName: res.call.channelName,
          agora: res.agora,
          isIncoming: false,
        };

        setActiveCall(callObj);
        setCallState("ringing_outgoing");
        playRingtone(false);

        // Auto cancel after 40 seconds if unanswered
        ringingTimeoutRef.current = setTimeout(() => {
          cancelOutgoingCall(res.call._id);
        }, 40000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to start call";
      toast.error(msg);
      cleanupAndResetCall();
    }
  };

  // 7. Answer Incoming Call
  const answerIncomingCall = async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;

    stopRingtone();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    try {
      const res = await acceptCall(currentCall._id);
      if (res && res.success) {
        setActiveCall((prev) => ({
          ...prev,
          agora: res.agora,
        }));
        setCallState("connected");

        await joinAgoraChannel(
          res.agora.appId,
          currentCall.channelName,
          res.agora.token,
          res.agora.uid,
          currentCall.type
        );
      }
    } catch (err) {
      toast.error("Failed to accept call");
      cleanupAndResetCall();
    }
  };

  // 8. Decline Incoming Call
  const declineIncomingCall = async (callIdToReject = null, isTimeout = false) => {
    const targetId = callIdToReject || activeCallRef.current?._id;
    stopRingtone();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    if (targetId) {
      try {
        if (isTimeout) {
          await missedCall(targetId);
        } else {
          await rejectCall(targetId);
        }
      } catch (e) {}
    }

    cleanupAndResetCall();
  };

  // 9. Cancel Outgoing Call
  const cancelOutgoingCall = async (callIdToCancel = null) => {
    const targetId = callIdToCancel || activeCallRef.current?._id;
    stopRingtone();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    if (targetId) {
      try {
        await cancelCall(targetId);
      } catch (e) {}
    }

    cleanupAndResetCall();
  };

  // 10. End Active Call (Hangup)
  const leaveAndEndCall = async () => {
    const currentCall = activeCallRef.current;
    stopRingtone();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    if (currentCall?._id) {
      try {
        await endCall(currentCall._id);
      } catch (e) {}
    }

    cleanupAndResetCall();
  };

  // 11. Toggle Microphone
  const toggleMicrophone = async () => {
    if (localAudioTrackRef.current) {
      const nextMute = !isMuted;
      await localAudioTrackRef.current.setMuted(nextMute);
      setIsMuted(nextMute);
    }
  };

  // 12. Toggle Camera
  const toggleCamera = async () => {
    if (localVideoTrackRef.current) {
      const nextVideoOff = !isVideoOff;
      await localVideoTrackRef.current.setMuted(nextVideoOff);
      setIsVideoOff(nextVideoOff);
    }
  };

  // 13. Cleanup and Reset Call State
  const cleanupAndResetCall = async () => {
    stopRingtone();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    // Stop and close local tracks
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (e) {}
      localAudioTrackRef.current = null;
    }

    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      } catch (e) {}
      localVideoTrackRef.current = null;
    }

    // Leave Agora Channel safely
    try {
      if (agoraClient.connectionState !== "DISCONNECTED") {
        await agoraClient.leave();
      }
    } catch (e) {}

    setCallState("idle");
    setActiveCall(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        remoteUser,
        isMuted,
        isVideoOff,
        callDuration,
        showCallHistoryModal,
        setShowCallHistoryModal,
        localVideoTrack: localVideoTrackRef.current,
        initiateCall,
        answerIncomingCall,
        declineIncomingCall,
        cancelOutgoingCall,
        leaveAndEndCall,
        toggleMicrophone,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
