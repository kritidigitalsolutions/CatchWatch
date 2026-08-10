import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_URL = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

// Helper: get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

// 1. Start a new call (audio/video)
export const startCall = async (receiverId, type = "audio") => {
  const res = await axios.post(
    `${API_URL}/calls`,
    { receiverId, type },
    getAuthHeaders()
  );
  return res.data;
};

// 2. Accept an incoming call
export const acceptCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/accept`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 3. Reject an incoming call
export const rejectCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/reject`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 4. Mark call as busy
export const busyCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/busy`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 5. Cancel outgoing call
export const cancelCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/cancel`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 6. Mark call as missed
export const missedCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/missed`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 7. End an active call
export const endCall = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/end`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 8. Get Agora RTC token for a call
export const getCallToken = async (callId) => {
  const res = await axios.post(
    `${API_URL}/calls/${callId}/token`,
    {},
    getAuthHeaders()
  );
  return res.data;
};

// 9. Get call history (paginated)
export const getCallHistory = async (page = 1, limit = 20) => {
  const res = await axios.get(
    `${API_URL}/calls/history?page=${page}&limit=${limit}`,
    getAuthHeaders()
  );
  return res.data;
};

// 10. Get single call details by ID
export const getCallById = async (callId) => {
  const res = await axios.get(
    `${API_URL}/calls/${callId}`,
    getAuthHeaders()
  );
  return res.data;
};
