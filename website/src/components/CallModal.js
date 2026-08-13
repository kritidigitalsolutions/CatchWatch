import React, { useEffect, useRef, useState } from "react";
import { useCall } from "../context/CallContext";
import { getCallHistory } from "../api/callApi";
import {
  FaPhone,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaTimes,
  FaHistory,
  FaArrowDown,
  FaArrowUp,
  FaSync
} from "react-icons/fa";
import { BiPhoneCall, BiVideo } from "react-icons/bi";

export const CallModal = () => {
  const {
    callState,
    activeCall,
    remoteUser,
    isMuted,
    isVideoOff,
    callDuration,
    showCallHistoryModal,
    setShowCallHistoryModal,
    localVideoTrack,
    initiateCall,
    answerIncomingCall,
    declineIncomingCall,
    cancelOutgoingCall,
    leaveAndEndCall,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Play local video track in PIP container
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && !isVideoOff) {
      try {
        localVideoTrack.play(localVideoRef.current, { fit: "cover" });
      } catch (e) {
        console.warn("Local video track play error:", e);
      }
    }
  }, [localVideoTrack, isVideoOff, callState]);

  // Play remote video track in main container
  useEffect(() => {
    if (remoteUser?.videoTrack && remoteVideoRef.current) {
      try {
        remoteUser.videoTrack.play(remoteVideoRef.current, { fit: "cover" });
      } catch (e) {
        console.warn("Remote video track play error:", e);
      }
    }
  }, [remoteUser, remoteUser?.videoTrack, remoteUser?._ts, callState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const partnerUser = activeCall?.isIncoming ? activeCall?.caller : activeCall?.receiver;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. INCOMING CALL POPUP OVERLAY                            */}
      {/* ========================================================= */}
      {callState === "ringing_incoming" && activeCall && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
            {/* Incoming Call Badge */}
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-950/50 text-brand-orange rounded-full text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5 animate-pulse">
              {activeCall.type === "video" ? <FaVideo /> : <FaPhone />} Incoming {activeCall.type} Call
            </span>

            {/* Caller Avatar */}
            <div className="relative mb-4">
              <img
                src={partnerUser?.profileImage || "/logo192.png"}
                alt={partnerUser?.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-brand-orange shadow-lg animate-bounce"
              />
            </div>

            {/* Caller Name */}
            <h3 className="font-black text-lg text-gray-800 dark:text-white mb-1">
              {partnerUser?.name || "Unknown Caller"}
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              @{partnerUser?.username || "user"}
            </p>

            {/* Action Buttons */}
            <div className="flex justify-center items-center gap-8 w-full">
              {/* Decline Button */}
              <button
                onClick={() => declineIncomingCall()}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xl shadow-lg transition duration-200 group-hover:scale-110">
                  <FaPhoneSlash />
                </div>
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Decline</span>
              </button>

              {/* Accept Button */}
              <button
                onClick={() => answerIncomingCall()}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xl shadow-lg transition duration-200 group-hover:scale-110">
                  <FaPhone className="animate-pulse" />
                </div>
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. OUTGOING CALL RINGING OVERLAY                          */}
      {/* ========================================================= */}
      {callState === "ringing_outgoing" && activeCall && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/50 text-blue-600 rounded-full text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5 animate-pulse">
              {activeCall.type === "video" ? <FaVideo /> : <FaPhone />} Calling ({activeCall.type})...
            </span>

            {/* Receiver Avatar */}
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-brand-orange/30 animate-ping"></div>
              <img
                src={partnerUser?.profileImage || "/logo192.png"}
                alt={partnerUser?.name}
                className="relative w-24 h-24 rounded-full object-cover border-4 border-brand-orange shadow-lg"
              />
            </div>

            <h3 className="font-black text-lg text-gray-800 dark:text-white mb-1">
              {partnerUser?.name || "User"}
            </h3>
            <p className="text-xs text-gray-400 mb-8">Ringing...</p>

            {/* Cancel Call Button */}
            <button
              onClick={() => cancelOutgoingCall()}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xl shadow-lg transition duration-200 group-hover:scale-110">
                <FaPhoneSlash />
              </div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ACTIVE CONNECTED CALL OVERLAY                          */}
      {/* ========================================================= */}
      {callState === "connected" && activeCall && (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in overflow-hidden">
          {/* Top Info Bar */}
          <div className="flex justify-between items-center z-20">
            <div className="flex items-center gap-3">
              <img
                src={partnerUser?.profileImage || "/logo192.png"}
                alt={partnerUser?.name}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
              <div>
                <h4 className="font-extrabold text-sm text-white">{partnerUser?.name || "User"}</h4>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {formatDuration(callDuration)}
                </span>
              </div>
            </div>

            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-wider">
              {activeCall.type} Call
            </div>
          </div>

          {/* Center Call View Area */}
          <div className="relative flex-1 my-4 rounded-3xl overflow-hidden bg-gray-900 border border-white/10 flex items-center justify-center">
            {activeCall.type === "video" ? (
              <>
                {/* Main Remote Video Stream */}
                <div className="relative w-full h-full">
                  <div ref={remoteVideoRef} className="w-full h-full object-cover" />
                  {!remoteUser?.videoTrack && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-gray-900 text-gray-400 z-10">
                      <img
                        src={partnerUser?.profileImage || "/logo192.png"}
                        alt={partnerUser?.name}
                        className="w-20 h-20 rounded-full object-cover opacity-60 border-2 border-white/10"
                      />
                      <p className="text-xs font-bold">Connecting video stream...</p>
                    </div>
                  )}
                </div>

                {/* PIP Local Video Stream */}
                <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-52 bg-black rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden z-20">
                  {isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-xs font-bold">
                      Camera Off
                    </div>
                  ) : (
                    <div ref={localVideoRef} className="w-full h-full object-cover" />
                  )}
                </div>
              </>
            ) : (
              /* Voice Call Big Avatar Display */
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-brand-orange/20 animate-ping"></div>
                  <img
                    src={partnerUser?.profileImage || "/logo192.png"}
                    alt={partnerUser?.name}
                    className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-brand-orange shadow-2xl"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-white">{partnerUser?.name}</h3>
                <p className="text-xs text-gray-400 font-medium">Audio Call Active</p>
              </div>
            )}
          </div>

          {/* Bottom Control Actions Bar */}
          <div className="flex items-center justify-center gap-6 z-20 py-2">
            {/* Mic Toggle Button */}
            <button
              onClick={() => toggleMicrophone()}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl transition shadow-lg ${
                isMuted
                  ? "bg-red-600 text-white"
                  : "bg-white/15 hover:bg-white/25 text-white backdrop-blur-md"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>

            {/* Camera Toggle Button (Video Call Only) */}
            {activeCall.type === "video" && (
              <button
                onClick={() => toggleCamera()}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl transition shadow-lg ${
                  isVideoOff
                    ? "bg-red-600 text-white"
                    : "bg-white/15 hover:bg-white/25 text-white backdrop-blur-md"
                }`}
                title={isVideoOff ? "Turn Camera ON" : "Turn Camera OFF"}
              >
                {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
              </button>
            )}

            {/* Switch Camera Button (Video Call Only) */}
            {activeCall.type === "video" && (
              <button
                onClick={() => switchCamera()}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md flex items-center justify-center text-xl transition shadow-lg"
                title="Switch Camera (Front/Back)"
              >
                <FaSync />
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={() => leaveAndEndCall()}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-2xl shadow-2xl transition hover:scale-105"
              title="End Call"
            >
              <FaPhoneSlash />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CALL HISTORY MODAL                                     */}
      {/* ========================================================= */}
      {showCallHistoryModal && (
        <CallHistoryModal
          onClose={() => setShowCallHistoryModal(false)}
          onCallBack={(targetUser, type) => {
            setShowCallHistoryModal(false);
            initiateCall(targetUser, type);
          }}
        />
      )}
    </>
  );
};

// Sub-component: Call History Log Modal
const CallHistoryModal = ({ onClose, onCallBack }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await getCallHistory();
        if (res && res.calls) {
          setHistory(res.calls);
        }
      } catch (err) {
        console.error("Failed to load call history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatCallTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-2">
            <FaHistory className="text-brand-orange" /> Call History
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length > 0 ? (
            history.map((call) => {
              const isOutgoing = call.caller?._id?.toString() === currentUserId.toString();
              const otherUser = isOutgoing ? call.receiver : call.caller;

              return (
                <div
                  key={call._id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <img
                      src={otherUser?.profileImage || "/logo192.png"}
                      alt={otherUser?.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-gray-800 dark:text-white truncate">
                          {otherUser?.name || "User"}
                        </h4>
                        {isOutgoing ? (
                          <FaArrowUp className="text-[10px] text-blue-500 rotate-45" title="Outgoing" />
                        ) : (
                          <FaArrowDown className="text-[10px] text-emerald-500 rotate-45" title="Incoming" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                        <span className="capitalize">{call.type} Call</span>
                        <span>•</span>
                        <span
                          className={`font-bold ${
                            call.status === "accepted" || call.status === "ended"
                              ? "text-emerald-500"
                              : call.status === "missed"
                              ? "text-red-500"
                              : "text-orange-500"
                          }`}
                        >
                          {call.status === "ended" || call.status === "accepted"
                            ? formatDuration(call.duration)
                            : call.status}
                        </span>
                        <span>•</span>
                        <span>{formatCallTime(call.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Call Back Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onCallBack(otherUser, "audio")}
                      className="p-2 bg-orange-50 dark:bg-orange-950/40 text-brand-orange hover:bg-orange-100 rounded-xl text-xs font-bold transition"
                      title="Voice Call"
                    >
                      <BiPhoneCall />
                    </button>
                    <button
                      onClick={() => onCallBack(otherUser, "video")}
                      className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition"
                      title="Video Call"
                    >
                      <BiVideo />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-xs text-gray-400 font-medium">
              No call history found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
