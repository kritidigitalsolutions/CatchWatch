import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getConversations } from "../api/chatApi";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const fetchUnreadChatCount = async () => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await getConversations();
      if (res && res.data) {
        const totalUnread = res.data.reduce(
          (acc, conv) => acc + (conv.unreadCount || 0),
          0
        );
        setUnreadChatCount(totalUnread);
      }
    } catch (err) {
      console.error("Failed to fetch unread chat count:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const rawUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || "http://localhost:5000";
    const socketUrl = rawUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

    const newSocket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      console.log("🟢 Connected to Chat Socket server (ID: " + newSocket.id + ")");
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Chat Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (err) => {
      console.warn("⚠️ Socket Connection Error:", err.message);
    });

    newSocket.on("new_message", () => {
      fetchUnreadChatCount();
    });

    newSocket.on("messages_read", () => {
      fetchUnreadChatCount();
    });

    setSocket(newSocket);
    fetchUnreadChatCount();

    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("new_message");
      newSocket.off("messages_read");
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider value={{ socket, unreadChatCount, setUnreadChatCount, fetchUnreadChatCount }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
