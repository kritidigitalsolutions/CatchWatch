import { useState, useEffect, useRef } from "react";
import {
  FaSearch,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaMicrophone,
  FaTimes,
  FaCheck,
  FaCheckDouble,
  FaThumbtack,
  FaBan,
  FaTrash,
  FaReply,
  FaShare,
  FaPencilAlt,
  FaUndo,
  FaUserPlus,
  FaEllipsisV,
  FaStop,
  FaArrowLeft,
  FaPlus
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useSocket } from "../context/SocketContext";
import ForwardModal from "../components/ForwardModal";
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  uploadChatMedia,
  editMessage,
  unsendMessage,
  deleteMessageForMe,
  toggleReaction,
  markAsRead,
  pinConversation,
  clearConversation,
  blockUser,
  searchChatUsers,
} from "../api/chatApi";
import { BiMessageRoundedDots } from "react-icons/bi";
import { toast } from "react-toastify";
import "./ChatPage.css";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const ChatPage = () => {
  const { socket, fetchUnreadChatCount } = useSocket();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  // Conversations & Search States
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [convSearch, setConvSearch] = useState("");

  // Messages & Pagination
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New Chat Modal Search
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);


  // Feature Action States
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [typingPartner, setTypingPartner] = useState(false);

  // Pickers & Modals
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMobileDropup, setShowMobileDropup] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [fullViewImage, setFullViewImage] = useState(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Initial Load of Conversations
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      if (res && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  // 2. Load Messages when Active Conversation Changes
  useEffect(() => {
    if (!activeConv) return;

    const fetchConvMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await getMessages(activeConv._id);
        if (res && res.data) {
          setMessages(res.data);
        }
        // Mark as read
        await markAsRead(activeConv._id);
        fetchUnreadChatCount();
        loadConversations();
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchConvMessages();

    // Socket join room
    if (socket) {
      socket.emit("join_conversation", activeConv._id);
    }

    return () => {
      if (socket) {
        socket.emit("leave_conversation", activeConv._id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?._id]);

  // 3. Auto Scroll to Bottom on New Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingPartner]);

  const addUniqueMessage = (prevMsgs, newMsg) => {
    if (!newMsg) return prevMsgs;
    const newId = (newMsg._id || newMsg.id)?.toString();
    if (!newId) return prevMsgs;
    if (prevMsgs.some((m) => (m._id || m.id)?.toString() === newId)) {
      return prevMsgs;
    }
    return [...prevMsgs, newMsg];
  };

  // 4. Socket Listeners for Real-time Events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (activeConv && newMsg.conversationId.toString() === activeConv._id.toString()) {
        setMessages((prev) => addUniqueMessage(prev, newMsg));
        markAsRead(activeConv._id);
      }
      loadConversations();
    };

    const handleMessageSent = (sentMsg) => {
      if (activeConv && sentMsg.conversationId.toString() === activeConv._id.toString()) {
        setMessages((prev) => addUniqueMessage(prev, sentMsg));
      }
      loadConversations();
    };

    const handleMessageEdited = (editedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === editedMsg._id ? editedMsg : m))
      );
      loadConversations();
    };

    const handleMessageUnsent = (unsentMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === unsentMsg._id ? unsentMsg : m))
      );
      loadConversations();
    };

    const handleMessageReaction = (reactedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === reactedMsg._id ? reactedMsg : m))
      );
    };

    const handleMessagesRead = ({ conversationId }) => {
      if (activeConv && conversationId.toString() === activeConv._id.toString()) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, status: "READ", readAt: new Date() }))
        );
      }
    };

    const handleUserTypingStart = ({ conversationId, userId }) => {
      if (activeConv && conversationId.toString() === activeConv._id.toString() && userId.toString() !== currentUserId.toString()) {
        setTypingPartner(true);
      }
    };

    const handleUserTypingStop = ({ conversationId, userId }) => {
      if (activeConv && conversationId.toString() === activeConv._id.toString() && userId.toString() !== currentUserId.toString()) {
        setTypingPartner(false);
      }
    };

    const handleUserOnline = ({ userId }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.partner?._id === userId ? { ...c, partner: { ...c.partner, isOnline: true } } : c
        )
      );
      if (activeConv?.partner?._id === userId) {
        setActiveConv((prev) => ({
          ...prev,
          partner: { ...prev.partner, isOnline: true },
        }));
      }
    };

    const handleUserOffline = ({ userId, lastSeen }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.partner?._id === userId
            ? { ...c, partner: { ...c.partner, isOnline: false, lastSeen } }
            : c
        )
      );
      if (activeConv?.partner?._id === userId) {
        setActiveConv((prev) => ({
          ...prev,
          partner: { ...prev.partner, isOnline: false, lastSeen },
        }));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_unsent", handleMessageUnsent);
    socket.on("message_reaction", handleMessageReaction);
    socket.on("messages_read", handleMessagesRead);
    socket.on("user_typing_start", handleUserTypingStart);
    socket.on("user_typing_stop", handleUserTypingStop);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_unsent", handleMessageUnsent);
      socket.off("message_reaction", handleMessageReaction);
      socket.off("messages_read", handleMessagesRead);
      socket.off("user_typing_start", handleUserTypingStart);
      socket.off("user_typing_stop", handleUserTypingStop);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeConv?._id]);

  // Handle Typing Event Trigger
  const handleTextInputChange = (e) => {
    setMessageText(e.target.value);
    if (!socket || !activeConv || !activeConv.partner) return;

    socket.emit("typing_start", {
      conversationId: activeConv._id,
      recipientId: activeConv.partner._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        conversationId: activeConv._id,
        recipientId: activeConv.partner._id,
      });
    }, 2000);
  };

  // 5. Send Message Handler
  const handleSendMessage = async () => {
    if (editingMsg) {
      // Edit existing message
      try {
        await editMessage(editingMsg._id, messageText);
        setMessageText("");
        setEditingMsg(null);
        toast.success("Message edited");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to edit message");
      }
      return;
    }

    if (!messageText.trim() && !selectedMediaPreview) return;

    let mediaUrl = "";
    let messageType = "text";
    let mediaMeta = {};

    if (selectedMediaPreview) {
      setUploadingMedia(true);
      try {
        const formData = new FormData();
        formData.append("attachment", selectedMediaPreview.file);
        const uploadRes = await uploadChatMedia(formData);

        if (uploadRes && uploadRes.data) {
          mediaUrl = uploadRes.data.mediaUrl;
          messageType = uploadRes.data.messageType;
          mediaMeta = uploadRes.data.mediaMeta;
        }
      } catch (err) {
        toast.error("Failed to upload file attachment");
        setUploadingMedia(false);
        return;
      } finally {
        setUploadingMedia(false);
      }
    }

    try {
      const payload = {
        conversationId: activeConv._id,
        recipientId: activeConv.partner._id,
        text: messageText,
        messageType: selectedMediaPreview ? messageType : "text",
        mediaUrl,
        mediaMeta,
        replyTo: replyingTo ? replyingTo._id : null,
      };

      const res = await sendMessage(payload);
      if (res && res.data) {
        setMessages((prev) => addUniqueMessage(prev, res.data));
        setMessageText("");
        setSelectedMediaPreview(null);
        setReplyingTo(null);
        setShowEmojiPicker(false);
        loadConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    }
  };

  // 6. Handle GIF Selection
  const handleSendGif = async (gifUrl) => {
    setShowGifPicker(false);
    try {
      const res = await sendMessage({
        conversationId: activeConv._id,
        recipientId: activeConv.partner._id,
        messageType: "gif",
        mediaUrl: gifUrl,
      });
      if (res && res.data) {
        setMessages((prev) => addUniqueMessage(prev, res.data));
        loadConversations();
      }
    } catch (err) {
      toast.error("Failed to send GIF");
    }
  };

  // 7. File Attachment Selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    let type = "image";
    if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    setSelectedMediaPreview({ file, previewUrl, type, name: file.name });
  };

  // 8. Voice Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        const previewUrl = URL.createObjectURL(audioBlob);
        setSelectedMediaPreview({ file: audioFile, previewUrl, type: "audio", name: "Voice Note" });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied or unsupported");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // 9. Actions: Reaction, Unsend, Delete, Pin, Block, Clear
  const handleReaction = async (msgId, emoji) => {
    setActiveActionMenuId(null);
    try {
      const res = await toggleReaction(msgId, emoji);
      if (res && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msgId ? res.data : m))
        );
      }
    } catch (err) {
      toast.error("Failed to add reaction");
    }
  };

  const handleUnsend = async (msgId) => {
    setActiveActionMenuId(null);
    try {
      const res = await unsendMessage(msgId);
      if (res && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msgId ? res.data : m))
        );
        toast.info("Message unsent");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unsend message");
    }
  };

  const handleDeleteForMe = async (msgId) => {
    setActiveActionMenuId(null);
    try {
      await deleteMessageForMe(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.info("Message deleted for you");
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const handlePin = async () => {
    if (!activeConv) return;
    try {
      const res = await pinConversation(activeConv._id);
      toast.success(res.message);
      loadConversations();
    } catch (err) {
      toast.error("Failed to pin conversation");
    }
  };

  const handleClearChat = async () => {
    if (!activeConv || !window.confirm("Are you sure you want to clear this conversation history?")) return;
    try {
      await clearConversation(activeConv._id);
      setMessages([]);
      toast.info("Conversation history cleared");
      loadConversations();
    } catch (err) {
      toast.error("Failed to clear conversation");
    }
  };

  const handleBlock = async () => {
    if (!activeConv?.partner || !window.confirm(`Block ${activeConv.partner.name}?`)) return;
    try {
      await blockUser(activeConv.partner._id);
      toast.warn(`Blocked ${activeConv.partner.name}`);
      setActiveConv(null);
      loadConversations();
    } catch (err) {
      toast.error("Failed to block user");
    }
  };

  // 10. Start Chat with User Search Result
  const handleSelectUserToChat = async (user) => {
    setShowNewChatModal(false);
    try {
      const res = await startConversation(user._id);
      if (res && res.data) {
        setActiveConv(res.data);
        loadConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start chat");
    }
  };

  const handleSearchUsers = async (q) => {
    setUserQuery(q);
    if (!q.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await searchChatUsers(q);
      if (res && res.data) {
        setUserSearchResults(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Sample GIFs list for demonstration
  const sampleGifs = [
    "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif",
    "https://media.giphy.com/media/3o7TKsjRrfIPjeiVyM/giphy.gif",
    "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  ];

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Offline";
    const d = new Date(dateStr);
    return `Last seen at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const filteredConvs = conversations.filter((c) =>
    c.partner?.name?.toLowerCase().includes(convSearch.toLowerCase()) ||
    c.partner?.username?.toLowerCase().includes(convSearch.toLowerCase())
  );

  const pinnedConvs = filteredConvs.filter((c) => c.isPinned);
  const unpinnedConvs = filteredConvs.filter((c) => !c.isPinned);

  return (
    <div className="chat-container flex bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* SIDEBAR: CONVERSATIONS LIST                                 */}
      {/* ========================================================= */}
      <div
        className={`chat-sidebar w-full md:w-80 lg:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 ${
          activeConv ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-lg text-gray-800 dark:text-white">Chats</h2>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
            title="Start New Chat"
          >
            <FaUserPlus /> New Chat
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search chats..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto chat-scroll divide-y divide-gray-50 dark:divide-gray-800/50">
          {pinnedConvs.length > 0 && (
            <div className="py-2">
              <span className="px-4 text-[10px] font-extrabold tracking-wider text-brand-orange uppercase flex items-center gap-1 mb-1">
                <FaThumbtack className="rotate-45 text-[9px]" /> Pinned Chats
              </span>
              {pinnedConvs.map((conv, index) => (
                <ConversationItem
                  key={conv._id ? `pinned-${conv._id}-${index}` : `pinned-${index}`}
                  conv={conv}
                  isActive={activeConv?._id === conv._id}
                  onClick={() => setActiveConv(conv)}
                />
              ))}
            </div>
          )}

          <div className="py-2">
            {pinnedConvs.length > 0 && unpinnedConvs.length > 0 && (
              <span className="px-4 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase block mb-1">
                All Messages
              </span>
            )}
            {unpinnedConvs.length > 0 ? (
              unpinnedConvs.map((conv, index) => (
                <ConversationItem
                  key={conv._id ? `all-${conv._id}-${index}` : `all-${index}`}
                  conv={conv}
                  isActive={activeConv?._id === conv._id}
                  onClick={() => setActiveConv(conv)}
                />
              ))
            ) : pinnedConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-gray-400 font-medium">No conversations yet</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3 text-xs text-brand-orange font-bold hover:underline"
                >
                  Start a new conversation
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHAT MAIN WINDOW                                           */}
      {/* ========================================================= */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-950 ${
          !activeConv ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConv ? (
          <>
            {/* Active Header */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shadow-sm flex-shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="md:hidden text-gray-600 dark:text-gray-300 pr-1 text-lg"
                >
                  <FaArrowLeft />
                </button>

                <div className="relative">
                  <img
                    src={activeConv.partner?.profileImage || "/logo192.png"}
                    alt={activeConv.partner?.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                  {activeConv.partner?.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-gray-800 dark:text-white leading-tight">
                    {activeConv.partner?.name || "User"}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {typingPartner ? (
                      <span className="text-brand-orange font-bold animate-pulse">
                        typing...
                      </span>
                    ) : activeConv.partner?.isOnline ? (
                      <span className="text-green-500 font-bold">Online</span>
                    ) : (
                      formatLastSeen(activeConv.partner?.lastSeen)
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePin}
                  className={`p-2 rounded-xl text-xs transition ${
                    activeConv.isPinned
                      ? "text-brand-orange bg-orange-50 dark:bg-orange-950/40"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                  title={activeConv.isPinned ? "Unpin Chat" : "Pin Chat"}
                >
                  <FaThumbtack className={activeConv.isPinned ? "rotate-45" : ""} />
                </button>

                <button
                  onClick={handleClearChat}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-xl text-xs transition"
                  title="Clear Chat History"
                >
                  <FaTrash />
                </button>

                <button
                  onClick={handleBlock}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-xl text-xs transition"
                  title="Block User"
                >
                  <FaBan />
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 chat-scroll space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length > 0 ? (
                Array.from(
                  new Map(messages.map((m) => [(m._id || m.id)?.toString() || Math.random(), m])).values()
                ).map((msg, index) => {
                  const isMe = msg.sender?._id?.toString() === currentUserId.toString();
                  return (
                    <MessageBubble
                      key={msg._id ? `${msg._id}-${index}` : index}
                      msg={msg}
                      isMe={isMe}
                      onReply={(m) => setReplyingTo(m)}
                      onForward={(m) => setForwardingMsg(m)}
                      onReaction={(id, emoji) => handleReaction(id, emoji)}
                      onEdit={(m) => {
                        setEditingMsg(m);
                        setMessageText(m.text);
                      }}
                      onUnsend={(id) => handleUnsend(id)}
                      onDelete={(id) => handleDeleteForMe(id)}
                      onImageClick={(url) => setFullViewImage(url)}
                      activeMenuId={activeActionMenuId}
                      setActiveMenuId={setActiveActionMenuId}
                    />
                  );
                })
              ) : (
                <div className="text-center py-20 text-xs text-gray-400 font-medium">
                  No messages in this chat. Say hello 👋!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply / Media Preview Context Banner */}
            {(replyingTo || selectedMediaPreview || editingMsg) && (
              <div className="px-4 py-2 bg-orange-50 dark:bg-gray-800 border-t border-orange-100 dark:border-gray-700 flex justify-between items-center text-xs flex-shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  {replyingTo && (
                    <div>
                      <span className="font-bold text-brand-orange block">
                        Replying to {replyingTo.sender?.name}:
                      </span>
                      <p className="text-gray-600 dark:text-gray-300 truncate">
                        {replyingTo.text || "Media Attachment"}
                      </p>
                    </div>
                  )}
                  {editingMsg && (
                    <div>
                      <span className="font-bold text-brand-orange block">Editing Message</span>
                    </div>
                  )}
                  {selectedMediaPreview && (
                    <div className="flex items-center gap-2">
                      {selectedMediaPreview.type === "image" && (
                        <img
                          src={selectedMediaPreview.previewUrl}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      )}
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Attachment: {selectedMediaPreview.name}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMsg(null);
                    setSelectedMediaPreview(null);
                    setMessageText("");
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative z-20 flex-shrink-0">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50 shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setMessageText((prev) => prev + emojiData.emoji);
                    }}
                  />
                </div>
              )}

              {/* GIF Picker Popover */}
              {showGifPicker && (
                <div className="absolute bottom-16 left-12 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-2xl shadow-2xl w-72">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs text-gray-700 dark:text-gray-200">
                      Select GIF
                    </span>
                    <button
                      onClick={() => setShowGifPicker(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {sampleGifs.map((gif, i) => (
                      <img
                        key={i}
                        src={gif}
                        alt="gif"
                        onClick={() => handleSendGif(gif)}
                        className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                />

                {/* MOBILE ATTACHMENT PLUS BUTTON (< sm screens) */}
                <button
                  type="button"
                  onClick={() => setShowMobileDropup(!showMobileDropup)}
                  className="sm:hidden p-2 text-gray-500 hover:text-brand-orange text-base transition shrink-0"
                  title="Add Attachment"
                >
                  <FaPlus className={`transition-transform duration-200 ${showMobileDropup ? "rotate-45 text-brand-orange" : ""}`} />
                </button>

                {/* MOBILE DROP-UP POPOVER MENU (< sm screens) */}
                {showMobileDropup && (
                  <div className="sm:hidden absolute bottom-16 left-2 z-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-3 flex gap-4 items-center animate-pop-in">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDropup(false);
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-brand-orange text-[10px] font-bold"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 text-brand-orange flex items-center justify-center text-lg shadow-sm">
                        <FaSmile />
                      </div>
                      <span>Emoji</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDropup(false);
                        setShowGifPicker(!showGifPicker);
                      }}
                      className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-brand-orange text-[10px] font-bold"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center text-xs font-black shadow-sm">
                        GIF
                      </div>
                      <span>GIF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDropup(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-brand-orange text-[10px] font-bold"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-lg shadow-sm">
                        <FaPaperclip />
                      </div>
                      <span>Attach</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDropup(false);
                        if (isRecording) stopRecording();
                        else startRecording();
                      }}
                      className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-brand-orange text-[10px] font-bold"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center text-lg shadow-sm">
                        <FaMicrophone />
                      </div>
                      <span>Voice</span>
                    </button>
                  </div>
                )}

                {/* DESKTOP INLINE ACTION BUTTONS (>= sm screens) */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-brand-orange text-lg transition"
                  >
                    <FaSmile />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 text-gray-600 dark:text-gray-300 text-xs font-black rounded-lg transition"
                  >
                    GIF
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-brand-orange text-lg transition"
                    title="Attach file"
                  >
                    <FaPaperclip />
                  </button>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2 text-gray-500 hover:text-red-500 text-lg transition"
                      title="Record voice note"
                    >
                      <FaMicrophone />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse"
                    >
                      <FaStop /> {recordingTime}s
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={handleTextInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={uploadingMedia}
                  className="p-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 shrink-0"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center text-brand-orange text-3xl mb-4 shadow-sm">
              <BiMessageRoundedDots />
            </div>
            <h3 className="font-extrabold text-lg text-gray-800 dark:text-white mb-1">
              Select a conversation
            </h3>
            <p className="text-xs text-gray-400 max-w-sm">
              Choose an existing chat from the left sidebar or start a new conversation to begin messaging.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALS & OVERLAYS                                          */}
      {/* ========================================================= */}

      {/* 1. Forward Modal */}
      <ForwardModal
        isOpen={!!forwardingMsg}
        onClose={() => setForwardingMsg(null)}
        messageToForward={forwardingMsg}
      />

      {/* 2. New Chat User Search Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                Start New Chat
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search user by name, username or phone..."
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto px-4 pb-4">
              {searchingUsers ? (
                <p className="text-center text-xs text-gray-400 py-4">Searching...</p>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => handleSelectUserToChat(u)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition"
                  >
                    <img
                      src={u.profileImage || "/logo192.png"}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-gray-800 dark:text-white">
                        {u.name}
                      </h4>
                      <p className="text-[11px] text-gray-400">{u.username || u.phone}</p>
                    </div>
                  </div>
                ))
              ) : userQuery.trim() ? (
                <p className="text-center text-xs text-gray-400 py-4">No users found</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 3. Full Image Viewer Modal */}
      {fullViewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullViewImage(null)}
        >
          <img
            src={fullViewImage}
            alt="Full view"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
};

// Sub-component: Conversation List Item
const ConversationItem = ({ conv, isActive, onClick }) => {
  const partner = conv.partner;
  const lastMsg = conv.lastMessage;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 mx-2 rounded-2xl cursor-pointer transition ${
        isActive
          ? "bg-brand-orange/10 dark:bg-brand-orange/20 border border-brand-orange/20"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={partner?.profileImage || "/logo192.png"}
          alt={partner?.name}
          className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
        />
        {partner?.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="font-extrabold text-xs text-gray-800 dark:text-white truncate">
            {partner?.name || "User"}
          </h4>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-gray-400 font-semibold">
              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[170px]">
            {lastMsg ? (
              lastMsg.isUnsent ? (
                <span className="italic">Message unsent</span>
              ) : (
                lastMsg.text || `[${lastMsg.messageType}]`
              )
            ) : (
              "No messages yet"
            )}
          </p>

          {conv.unreadCount > 0 && (
            <span className="bg-brand-orange text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component: Message Bubble Component
const MessageBubble = ({
  msg,
  isMe,
  onReply,
  onForward,
  onReaction,
  onEdit,
  onUnsend,
  onDelete,
  onImageClick,
  activeMenuId,
  setActiveMenuId,
}) => {
  const isMenuOpen = activeMenuId === msg._id;

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative mb-2`}>
      {/* Quoted Parent Reply Snippet */}
      {msg.replyTo && (
        <div className="mb-1 text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl border-l-4 border-brand-orange max-w-xs truncate">
          <span className="font-bold text-brand-orange block">
            {msg.replyTo.sender?.name}:
          </span>
          {msg.replyTo.text || "Attachment"}
        </div>
      )}

      <div className="flex items-center gap-1.5 max-w-[88%] sm:max-w-[80%]">
        {/* Quick Action Button for Me/Other */}
        <div className="relative">
          <button
            onClick={() => setActiveMenuId(isMenuOpen ? null : msg._id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition"
          >
            <FaEllipsisV />
          </button>

          {/* Context Action Menu Dropdown */}
          {isMenuOpen && (
            <div
              className={`absolute bottom-full mb-1 z-30 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl py-2 px-1 min-w-[150px] ${
                isMe ? "right-0" : "left-0"
              }`}
            >
              {/* Quick Reactions Row */}
              <div className="flex justify-around border-b border-gray-100 dark:border-gray-800 pb-2 mb-1 px-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(msg._id, emoji)}
                    className="text-sm hover:scale-125 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setActiveMenuId(null);
                  onReply(msg);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FaReply /> Reply
              </button>

              <button
                onClick={() => {
                  setActiveMenuId(null);
                  onForward(msg);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FaShare /> Forward
              </button>

              {isMe && !msg.isUnsent && msg.messageType === "text" && (
                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onEdit(msg);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FaPencilAlt /> Edit
                </button>
              )}

              {isMe && !msg.isUnsent && (
                <button
                  onClick={() => onUnsend(msg._id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FaUndo /> Unsend for everyone
                </button>
              )}

              <button
                onClick={() => onDelete(msg._id)}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FaTrash /> Delete for me
              </button>
            </div>
          )}
        </div>

        {/* Bubble Content */}
        <div
          className={`p-3 text-xs shadow-sm relative ${
            msg.isUnsent
              ? "bg-gray-200 dark:bg-gray-800 text-gray-500 italic rounded-2xl"
              : isMe
              ? "chat-bubble-sent"
              : "chat-bubble-received"
          }`}
        >
          {/* Forwarded Header */}
          {msg.isForwarded && (
            <span className="text-[10px] opacity-75 font-semibold block mb-1 flex items-center gap-1">
              <FaShare className="text-[8px]" /> Forwarded
            </span>
          )}

          {/* Render Media / Text Content */}
          {msg.isUnsent ? (
            <p>This message was unsent</p>
          ) : (
            <>
              {msg.messageType === "text" && <p className="whitespace-pre-wrap">{msg.text}</p>}

              {msg.messageType === "image" && (
                <img
                  src={msg.mediaUrl}
                  alt="attachment"
                  onClick={() => onImageClick(msg.mediaUrl)}
                  className="rounded-xl w-full max-w-full sm:max-w-xs max-h-52 object-cover cursor-pointer hover:opacity-95 transition my-1"
                />
              )}

              {msg.messageType === "video" && (
                <video
                  src={msg.mediaUrl}
                  controls
                  className="rounded-xl w-full max-w-full sm:max-w-xs max-h-52 object-cover my-1"
                />
              )}

              {msg.messageType === "audio" && (
                <audio src={msg.mediaUrl} controls className="my-1 w-full max-w-full sm:max-w-xs" />
              )}

              {msg.messageType === "gif" && (
                <img
                  src={msg.mediaUrl}
                  alt="gif"
                  className="rounded-xl w-full max-w-full sm:max-w-xs max-h-48 object-cover my-1"
                />
              )}
            </>
          )}

          {/* Footer Metadata (Timestamp & Read Receipt Ticks) */}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? "text-white/80" : "text-gray-400"}`}>
            {msg.isEdited && <span className="mr-1">(edited)</span>}
            <span>
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isMe && !msg.isUnsent && (
              <span className="text-[10px]">
                {msg.status === "READ" ? (
                  <FaCheckDouble className="text-blue-300" title="Read" />
                ) : msg.status === "DELIVERED" ? (
                  <FaCheckDouble title="Delivered" />
                ) : (
                  <FaCheck title="Sent" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Emoji Reactions Display Pills */}
      {msg.reactions && msg.reactions.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {msg.reactions.map((r, i) => (
            <span
              key={i}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-full text-[10px] shadow-sm reaction-pill"
            >
              {r.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatPage;
