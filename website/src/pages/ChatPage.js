import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaTimes,
  FaCheck,
  FaCheckDouble,
  FaThumbtack,
  FaBan,
  FaUnlock,
  FaTrash,
  FaReply,
  FaShare,
  FaPencilAlt,
  FaUndo,
  FaEllipsisV,
  FaArrowLeft,
  FaPlus,
  FaUsers,
  FaHistory,
  FaLock,
  FaDownload,
  FaUser
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
import ForwardModal from "../components/ForwardModal";
import {
  initUserE2EE,
  deriveSharedKey,
  importPublicKey,
  encryptText,
  decryptText,
} from "../utils/e2ee";
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
  togglePinMessage,
  markAsRead,
  pinConversation,
  clearConversation,
  blockUser,
  unblockUser,
  savePublicKey,
  getUserPublicKey,
  searchChatUsers,
  getAgoraToken,
} from "../api/chatApi";
import { getUserFollowers, getUserFollowing } from "../api/userApi";
import {
  loginAgoraChat,
  sendAgoraPeerMessage,
  addAgoraEventHandler,
  removeAgoraEventHandler,
} from "../services/agoraChatService";
import { BiMessageRoundedDots, BiPhoneCall, BiVideo } from "react-icons/bi";
import { toast } from "react-toastify";
import "./ChatPage.css";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
const MORE_EMOJIS = [
  "❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "💯", "👏", "🙏",
  "🤩", "🥳", "🤣", "😍", "💩", "✨", "💡", "💔", "⚡", "🏆",
  "👌", "😎", "😭", "🙄", "😬", "🫡", "🫣", "🚀", "🍿", "🙌",
  "💖", "🥰", "🎯", "👑", "⭐", "💪"
];

const ChatPage = () => {
  const navigate = useNavigate();
  const { socket, fetchUnreadChatCount } = useSocket();
  const { initiateCall, setShowCallHistoryModal } = useCall();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  const handleOpenPartnerProfile = (partner) => {
    if (!partner) return;
    const identifier = partner._id || partner.id || partner.username;
    if (identifier) {
      navigate(`/user/${identifier}`);
    }
  };

  // Conversations & Search States
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [convSearch, setConvSearch] = useState("");

  // Messages & Pagination
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);


  // Followers & Following Modal States
  const [showFollowsModal, setShowFollowsModal] = useState(false);
  const [followsTab, setFollowsTab] = useState("followers"); // "followers" | "following"
  const [followsList, setFollowsList] = useState([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [followsQuery, setFollowsQuery] = useState("");


  // Feature Action States
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [typingConversations, setTypingConversations] = useState({});

  // Pickers & Modals
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMobileDropup, setShowMobileDropup] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showMoreEmojisMsgId, setShowMoreEmojisMsgId] = useState(null);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [fullViewImage, setFullViewImage] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // E2EE Key Management States & Refs
  const [e2eeKeys, setE2eeKeys] = useState(null);
  const partnerSharedKeysRef = useRef({});

  // Agora Chat Connection State
  const [agoraConnected, setAgoraConnected] = useState(false);

  // Initialize Agora Chat User Connection
  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    getAgoraToken()
      .then((res) => {
        if (!isMounted || !res || !res.data) return;
        const { token, appKey } = res.data;
        if (token && appKey) {
          loginAgoraChat(currentUserId, token, appKey).then((client) => {
            if (client && isMounted) {
              setAgoraConnected(true);
            }
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch Agora token for chat:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Initialize E2EE Keypair for current user
  useEffect(() => {
    if (!currentUserId) return;
    initUserE2EE(currentUserId, savePublicKey).then((keys) => {
      if (keys) setE2eeKeys(keys);
    });
  }, [currentUserId]);

  // Handle mobile system back button when conversation is open
  useEffect(() => {
    if (!activeConv) return;

    window.history.pushState({ chatActive: true }, "");

    const handlePopState = (event) => {
      setActiveConv(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeConv]);

  // Handle adding class to body to hide global layout navigation on mobile when chat is active
  useEffect(() => {
    if (activeConv) {
      document.body.classList.add("chat-active-mobile");
    } else {
      document.body.classList.remove("chat-active-mobile");
    }
    return () => {
      document.body.classList.remove("chat-active-mobile");
    };
  }, [activeConv]);

  // Derive and cache shared key for partner
  const getSharedKeyForPartner = async (partner) => {
    if (!e2eeKeys || !partner) return null;
    const partnerId = typeof partner === "string" ? partner : (partner._id || partner.id)?.toString();
    if (!partnerId) return null;

    let partnerPubKeyStr = typeof partner === "object" ? partner.publicKey : null;
    if (!partnerPubKeyStr) {
      try {
        const keyRes = await getUserPublicKey(partnerId);
        if (keyRes && keyRes.data && keyRes.data.publicKey) {
          partnerPubKeyStr = keyRes.data.publicKey;
        }
      } catch (err) {
        console.warn("Could not fetch partner public key:", err);
      }
    }

    if (!partnerPubKeyStr || typeof partnerPubKeyStr !== "string" || !partnerPubKeyStr.trim()) {
      return null;
    }

    const cacheKey = `${partnerId}_${partnerPubKeyStr.slice(0, 30)}`;
    if (partnerSharedKeysRef.current[cacheKey]) {
      return partnerSharedKeysRef.current[cacheKey];
    }

    try {
      const partnerPubKey = await importPublicKey(partnerPubKeyStr);
      if (!partnerPubKey) return null;

      const sharedKey = await deriveSharedKey(e2eeKeys.privateKey, partnerPubKey);
      if (sharedKey) {
        partnerSharedKeysRef.current[cacheKey] = sharedKey;
      }
      return sharedKey;
    } catch (err) {
      console.warn("Failed to derive shared key for partner:", err);
      return null;
    }
  };

  // Helper to decrypt message if encrypted
  const processDecryptMessage = async (msg, sharedKey = null) => {
    if (!msg || !msg.text) return msg;
    if (!msg.isEncrypted || !msg.iv) return { ...msg, isDecrypted: true };
    if (msg.isDecrypted) return msg;

    try {
      let keyToUse = sharedKey;
      if (!keyToUse) {
        const partner = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString() === currentUserId?.toString()
          ? (msg.recipient?._id || msg.recipient?.id || msg.recipient)
          : (msg.sender?._id || msg.sender?.id || msg.sender);
        keyToUse = await getSharedKeyForPartner(partner);
      }

      if (!keyToUse) {
        if (typeof msg.text === "string" && (msg.text.includes(" ") || !/^[A-Za-z0-9+/=]+$/.test(msg.text.trim()))) {
          return { ...msg, isDecrypted: true };
        }
        return { ...msg, isDecrypted: false };
      }

      const plainText = await decryptText(msg.text, msg.iv, keyToUse);
      if (plainText === null) {
        if (typeof msg.text === "string" && (msg.text.includes(" ") || !/^[A-Za-z0-9+/=]+$/.test(msg.text.trim()))) {
          return { ...msg, isDecrypted: true };
        }
        return { ...msg, isDecrypted: false };
      }
      return { ...msg, text: plainText, isDecrypted: true };
    } catch (err) {
      if (typeof msg.text === "string" && (msg.text.includes(" ") || !/^[A-Za-z0-9+/=]+$/.test(msg.text.trim()))) {
        return { ...msg, isDecrypted: true };
      }
      return { ...msg, isDecrypted: false };
    }
  };

  // Auto-retry decryption whenever e2eeKeys, activeConv, or messages array updates
  useEffect(() => {
    if (!e2eeKeys || !activeConv || messages.length === 0) return;

    const hasUndecrypted = messages.some((m) => m.isEncrypted && m.iv && !m.isDecrypted);
    if (!hasUndecrypted) return;

    let isMounted = true;
    (async () => {
      const partnerKey = await getSharedKeyForPartner(activeConv.partner);
      if (!isMounted) return;

      const updated = await Promise.all(
        messages.map(async (msg) => {
          if (msg.isEncrypted && msg.iv && !msg.isDecrypted) {
            return await processDecryptMessage(msg, partnerKey);
          }
          return msg;
        })
      );

      if (isMounted) {
        const hasChanges = updated.some(
          (m, idx) => m.isDecrypted !== messages[idx]?.isDecrypted || m.text !== messages[idx]?.text
        );
        if (hasChanges) {
          setMessages(updated);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e2eeKeys, activeConv?._id, messages]);

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

  // Close menu dropdowns on outside touch/click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeActionMenuId && !e.target.closest(".chat-dropdown-container")) {
        setActiveActionMenuId(null);
        setShowMoreEmojisMsgId(null);
      }
      if (showHeaderMenu && !e.target.closest(".header-menu-container")) {
        setShowHeaderMenu(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("touchstart", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [activeActionMenuId, showHeaderMenu]);

  // 2. Load Messages & Reset Drafts when Active Conversation Changes
  useEffect(() => {
    // Reset all edit/reply/input states when switching user chat
    setReplyingTo(null);
    setEditingMsg(null);
    setMessageText("");
    setSelectedMediaPreview(null);
    setActiveActionMenuId(null);
    setShowMoreEmojisMsgId(null);
    setCurrentPinnedIndex(0);
    setShowHeaderMenu(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    if (!activeConv) return;

    const fetchConvMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await getMessages(activeConv._id);
        if (res && res.data) {
          const partnerKey = await getSharedKeyForPartner(activeConv.partner);
          const decryptedMessages = await Promise.all(
            res.data.map((m) => processDecryptMessage(m, partnerKey))
          );
          setMessages(decryptedMessages);
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
  }, [messages, activeConv && typingConversations[activeConv._id]]);

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

    // const handleNewMessage = async (newMsg) => {
    //   if (activeConv && newMsg.conversationId.toString() === activeConv._id.toString()) {
    //     const partnerKey = await getSharedKeyForPartner(activeConv.partner);
    //     const decryptedMsg = await processDecryptMessage(newMsg, partnerKey);
    //     setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
    //     markAsRead(activeConv._id);
    //   }
    //   loadConversations();
    // };

    // const handleMessageSent = async (sentMsg) => {
    //   if (activeConv && sentMsg.conversationId.toString() === activeConv._id.toString()) {
    //     const partnerKey = await getSharedKeyForPartner(activeConv.partner);
    //     const decryptedMsg = await processDecryptMessage(sentMsg, partnerKey);
    //     setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
    //   }
    //   loadConversations();
    // };

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
      if (userId.toString() !== currentUserId.toString()) {
        setTypingConversations((prev) => ({ ...prev, [conversationId]: true }));
      }
    };

    const handleUserTypingStop = ({ conversationId, userId }) => {
      if (userId.toString() !== currentUserId.toString()) {
        setTypingConversations((prev) => ({ ...prev, [conversationId]: false }));
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

    const handleUserBlocked = ({ blockerId, blockedId }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.partner?._id === blockedId && blockerId === currentUserId) {
            return { ...c, isBlockedByMe: true, isBlocked: true };
          }
          if (c.partner?._id === blockerId && blockedId === currentUserId) {
            return { ...c, isBlockedByPartner: true, isBlocked: true };
          }
          return c;
        })
      );
      if (activeConv?.partner?._id === blockedId && blockerId === currentUserId) {
        setActiveConv((prev) => ({ ...prev, isBlockedByMe: true, isBlocked: true }));
      }
      if (activeConv?.partner?._id === blockerId && blockedId === currentUserId) {
        setActiveConv((prev) => ({ ...prev, isBlockedByPartner: true, isBlocked: true }));
      }
    };

    const handleUserUnblocked = ({ unblockerId, unblockedId }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.partner?._id === unblockedId && unblockerId === currentUserId) {
            const isBlockedByPartner = c.isBlockedByPartner || false;
            return { ...c, isBlockedByMe: false, isBlocked: isBlockedByPartner };
          }
          if (c.partner?._id === unblockerId && unblockedId === currentUserId) {
            const isBlockedByMe = c.isBlockedByMe || false;
            return { ...c, isBlockedByPartner: false, isBlocked: isBlockedByMe };
          }
          return c;
        })
      );
      if (activeConv?.partner?._id === unblockedId && unblockerId === currentUserId) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByMe: false,
          isBlocked: prev?.isBlockedByPartner || false,
        }));
      }
      if (activeConv?.partner?._id === unblockerId && unblockedId === currentUserId) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByPartner: false,
          isBlocked: prev?.isBlockedByMe || false,
        }));
      }
    };

    const handleMessagePinned = (pinnedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === pinnedMsg._id ? pinnedMsg : m))
      );
    };

    // socket.on("new_message", handleNewMessage);
    // socket.on("message_sent", handleMessageSent);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_unsent", handleMessageUnsent);
    socket.on("message_reaction", handleMessageReaction);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("messages_read", handleMessagesRead);
    socket.on("user_typing_start", handleUserTypingStart);
    socket.on("user_typing_stop", handleUserTypingStop);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("user_blocked", handleUserBlocked);
    socket.on("user_unblocked", handleUserUnblocked);

    return () => {
      // socket.off("new_message", handleNewMessage);
      // socket.off("message_sent", handleMessageSent);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_unsent", handleMessageUnsent);
      socket.off("message_reaction", handleMessageReaction);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("messages_read", handleMessagesRead);
      socket.off("user_typing_start", handleUserTypingStart);
      socket.off("user_typing_stop", handleUserTypingStop);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("user_blocked", handleUserBlocked);
      socket.off("user_unblocked", handleUserUnblocked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeConv?._id]);

  // Agora Chat Event Listener for Real-time Text Messages
  useEffect(() => {
    if (!agoraConnected) return;

    const agoraHandlerId = "CATCHWATCH_CHAT_HANDLER";
    addAgoraEventHandler(agoraHandlerId, {
      onTextMessage: async (message) => {
        const ext = message.ext || {};
        
        // Determine sender and recipient user objects for proper UI normalization
        const partner = activeConv?.partner;
        const isFromMe = message.from === currentUserId?.toString();
        
        const senderObj = isFromMe 
          ? { _id: currentUserId, name: currentUser.name, username: currentUser.username, profileImage: currentUser.profileImage }
          : { _id: message.from, name: partner?.name, username: partner?.username, profileImage: partner?.profileImage };

        const recipientObj = isFromMe
          ? { _id: partner?._id || partner?.id, name: partner?.name, username: partner?.username, profileImage: partner?.profileImage }
          : { _id: currentUserId, name: currentUser.name, username: currentUser.username, profileImage: currentUser.profileImage };

        const isEncrypted = ext.isEncrypted === true || ext.isEncrypted === "true";
        const iv = isEncrypted && typeof ext.iv === "string" ? ext.iv.trim() : "";

        const incomingMsg = {
          _id: message.id || `agora_${Date.now()}`,
          conversationId: ext.conversationId,
          sender: senderObj,
          recipient: recipientObj,
          text: message.msg,
          isEncrypted: isEncrypted && iv !== "",
          iv: iv,
          messageType: ext.messageType || "text",
          mediaUrl: ext.mediaUrl || "",
          mediaMeta: ext.mediaMeta || {},
          replyTo: ext.replyTo || null,
          createdAt: message.time ? new Date(message.time) : new Date(),
        };

        const isMsgFromActivePartner = partner && (message.from === partner._id?.toString() || message.from === partner.id?.toString());
        const isMsgForActiveConv = ext.conversationId && activeConv && ext.conversationId.toString() === activeConv._id.toString();

        if (activeConv && (isMsgForActiveConv || isMsgFromActivePartner)) {
          const partnerKey = await getSharedKeyForPartner(activeConv.partner);
          const decryptedMsg = await processDecryptMessage(incomingMsg, partnerKey);
          setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
          markAsRead(activeConv._id);
        }
        loadConversations();
      },
    });

    return () => {
      removeAgoraEventHandler(agoraHandlerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agoraConnected, activeConv?._id, currentUserId]);

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
      let textToSend = messageText.trim();
      let isEncrypted = false;
      let iv = "";

      if (activeConv?.partner && textToSend) {
        const sharedKey = await getSharedKeyForPartner(activeConv.partner);
        if (sharedKey) {
          const encrypted = await encryptText(textToSend, sharedKey);
          textToSend = encrypted.ciphertext;
          iv = encrypted.iv;
          isEncrypted = true;
        }
      }

      const payload = {
        conversationId: activeConv._id,
        recipientId: activeConv.partner._id,
        text: textToSend,
        isEncrypted,
        iv,
        messageType: selectedMediaPreview ? messageType : "text",
        mediaUrl,
        mediaMeta,
        replyTo: replyingTo ? replyingTo._id : null,
      };

      const res = await sendMessage(payload);
      if (res && res.data) {
        // Dispatch via Agora Chat SDK for ultra-reliable real-time delivery
        sendAgoraPeerMessage(activeConv.partner._id, textToSend, {
          conversationId: activeConv._id,
          iv: iv,
          isEncrypted: isEncrypted,
          messageType: selectedMediaPreview ? messageType : "text",
          mediaUrl: mediaUrl,
          mediaMeta: mediaMeta,
          replyTo: replyingTo ? {
            _id: replyingTo._id,
            text: replyingTo.text,
            sender: replyingTo.sender ? {
              _id: replyingTo.sender._id || replyingTo.sender.id,
              name: replyingTo.sender.name,
              username: replyingTo.sender.username
            } : null
          } : null,
        }).catch((err) => console.warn("Agora Peer Dispatch Error:", err));

        const decryptedMsg = {
          ...res.data,
          text: messageText.trim(),
          isDecrypted: true,
        };
        setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
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
        // Dispatch via Agora Chat SDK for ultra-reliable real-time delivery
        sendAgoraPeerMessage(activeConv.partner._id, "", {
          conversationId: activeConv._id,
          isEncrypted: false,
          messageType: "gif",
          mediaUrl: gifUrl,
        }).catch((err) => console.warn("Agora GIF Dispatch Error:", err));

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



  // const stopRecording = () => {
  //   if (mediaRecorderRef.current && isRecording) {
  //     mediaRecorderRef.current.stop();
  //     mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
  //     setIsRecording(false);
  //     clearInterval(timerRef.current);
  //   }
  // };

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

  const pinnedMessagesList = messages.filter((m) => m.isPinned && !m.isUnsent);

  const handleTogglePin = async (messageId) => {
    try {
      const res = await togglePinMessage(messageId);
      if (res && res.success && res.data) {
        const updatedMsg = res.data;
        setMessages((prev) =>
          prev.map((m) =>
            m._id === updatedMsg._id
              ? {
                  ...m,
                  isPinned: updatedMsg.isPinned,
                  pinnedBy: updatedMsg.pinnedBy,
                  pinnedAt: updatedMsg.pinnedAt,
                }
              : m
          )
        );
        toast.success(
          res.message || (updatedMsg.isPinned ? "Message pinned" : "Message unpinned")
        );
      }
    } catch (err) {
      console.error("Pin message error:", err);
      toast.error(err.response?.data?.message || "Failed to pin message");
    }
  };

  const handleDownloadMedia = async (mediaUrl, defaultFileName = "chat_media") => {
    if (!mediaUrl) return;
    try {
      const toastId = toast.loading("Downloading media...");
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;

      let ext = "";
      if (mediaUrl.includes(".")) {
        const parts = mediaUrl.split("?")[0].split(".");
        ext = parts[parts.length - 1];
        if (ext.length > 5) ext = "";
      }
      const fileName = ext ? `${defaultFileName}.${ext}` : defaultFileName;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.update(toastId, {
        render: "Media downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Download media error:", error);
      const a = document.createElement("a");
      a.href = mediaUrl;
      a.target = "_blank";
      a.download = defaultFileName;
      a.click();
    }
  };

  const scrollToMessage = (msgId) => {
    const elem = document.getElementById(`msg-${msgId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
      elem.classList.add("ring-2", "ring-brand-orange", "rounded-2xl", "transition-all");
      setTimeout(() => {
        elem.classList.remove("ring-2", "ring-brand-orange", "rounded-2xl");
      }, 2000);
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

  const handleToggleBlock = async () => {
    if (!activeConv?.partner) return;
    const isCurrentlyBlocked = !!activeConv.isBlockedByMe;
    const partnerName = activeConv.partner.name || "User";
    const actionText = isCurrentlyBlocked ? "unblock" : "block";

    if (!window.confirm(`Are you sure you want to ${actionText} ${partnerName}?`)) return;

    try {
      if (isCurrentlyBlocked) {
        await unblockUser(activeConv.partner._id);
        toast.success(`Unblocked ${partnerName}`);
        setActiveConv((prev) =>
          prev
            ? {
              ...prev,
              isBlockedByMe: false,
              isBlocked: prev.isBlockedByPartner || false,
            }
            : null
        );
      } else {
        await blockUser(activeConv.partner._id);
        toast.warn(`Blocked ${partnerName}`);
        setActiveConv((prev) =>
          prev
            ? {
              ...prev,
              isBlockedByMe: true,
              isBlocked: true,
            }
            : null
        );
      }
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionText} user`);
    }
  };

  // 10. Start Chat with User Search Result
  const handleSelectUserToChat = async (user) => {
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

  // 11. Followers, Following & New User Search Network Handlers
  const handleOpenFollowsModal = (tab = "followers") => {
    setFollowsTab(tab);
    setShowFollowsModal(true);
    setFollowsQuery("");
    fetchFollowsData(tab, "");
  };

  const fetchFollowsData = async (tab, query = "") => {
    setLoadingFollows(true);
    try {
      if (tab === "followers") {
        const res = await getUserFollowers("me");
        if (res && res.followers) {
          setFollowsList(res.followers);
        } else if (res && res.data) {
          setFollowsList(res.data);
        } else {
          setFollowsList([]);
        }
      } else if (tab === "following") {
        const res = await getUserFollowing("me");
        if (res && res.following) {
          setFollowsList(res.following);
        } else if (res && res.data) {
          setFollowsList(res.data);
        } else {
          setFollowsList([]);
        }
      } else if (tab === "all") {
        const res = await searchChatUsers(query);
        if (res && res.data) {
          setFollowsList(res.data);
        } else {
          setFollowsList([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user list:", err);
      toast.error("Failed to load list");
      setFollowsList([]);
    } finally {
      setLoadingFollows(false);
    }
  };

  const handleSwitchFollowsTab = (tab) => {
    setFollowsTab(tab);
    setFollowsQuery("");
    fetchFollowsData(tab, "");
  };

  // Debounce user search when typing in "all" tab
  useEffect(() => {
    if (!showFollowsModal) return;

    if (followsTab === "all") {
      const timer = setTimeout(async () => {
        setLoadingFollows(true);
        try {
          const res = await searchChatUsers(followsQuery.trim());
          if (res && res.data) {
            setFollowsList(res.data);
          } else {
            setFollowsList([]);
          }
        } catch (err) {
          console.error("Failed to search all users:", err);
        } finally {
          setLoadingFollows(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [followsQuery, followsTab, showFollowsModal]);

  const filteredFollowsList = followsTab === "all"
    ? followsList
    : followsList.filter((u) => {
        if (!u) return false;
        const q = followsQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q))
        );
      });

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
        className={`chat-sidebar w-full md:w-80 lg:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 ${activeConv ? "hidden md:flex" : "flex"
          }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-lg text-gray-800 dark:text-white">Chats</h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleOpenFollowsModal("followers")}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition shadow-sm"
              title="Followers & Following List"
            >
              <FaUsers className="text-brand-orange text-lg" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search existing chats..."
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
                  isTyping={!!typingConversations[conv._id]}
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
                  isTyping={!!typingConversations[conv._id]}
                  onClick={() => setActiveConv(conv)}
                />
              ))
            ) : pinnedConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-gray-400 font-medium">No conversations yet</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHAT MAIN WINDOW                                           */}
      {/* ========================================================= */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-950 ${!activeConv ? "hidden md:flex" : "flex"
          }`}
      >
        {activeConv ? (
          <>
            {/* Active Header */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shadow-sm flex-shrink-0 relative z-30">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (window.history.state?.chatActive) {
                      window.history.back();
                    } else {
                      setActiveConv(null);
                    }
                  }}
                  className="md:hidden text-gray-600 dark:text-gray-300 pr-1 text-lg"
                >
                  <FaArrowLeft />
                </button>

                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => handleOpenPartnerProfile(activeConv.partner)}
                  title="View User Profile"
                >
                  <div className="relative">
                    <img
                      src={activeConv.partner?.profileImage || "/logo192.png"}
                      alt={activeConv.partner?.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 group-hover:border-brand-orange transition"
                    />
                    {activeConv.partner?.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-gray-800 dark:text-white leading-tight group-hover:text-brand-orange transition flex items-center gap-1">
                      {activeConv.partner?.name || "User"}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      {activeConv && typingConversations[activeConv._id] ? (
                        <span className="text-brand-orange font-bold animate-pulse">
                          typing...
                        </span>
                      ) : activeConv.partner?.isOnline ? (
                        <span className="text-green-500 font-bold">Online</span>
                      ) : (
                        formatLastSeen(activeConv.partner?.lastSeen)
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
                        | <FaLock className="text-[8px]" /> Encrypted
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Voice Call Button */}
                <button
                  onClick={() => initiateCall(activeConv.partner, "audio")}
                  className="p-2.5 bg-orange-50 dark:bg-orange-950/40 text-brand-orange hover:bg-orange-100 rounded-xl text-sm transition shadow-sm"
                  title="Voice Call"
                >
                  <BiPhoneCall className="text-base" />
                </button>

                {/* Video Call Button */}
                <button
                  onClick={() => initiateCall(activeConv.partner, "video")}
                  className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 rounded-xl text-sm transition shadow-sm"
                  title="Video Call"
                >
                  <BiVideo className="text-base" />
                </button>

                {/* Three Dot Options Dropdown Menu */}
                <div className="relative header-menu-container">
                  <button
                    onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                    className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm transition shadow-sm"
                    title="More Options"
                  >
                    <FaEllipsisV />
                  </button>

                  {showHeaderMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 z-50 animate-pop-in">
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleOpenPartnerProfile(activeConv.partner);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-brand-orange rounded-xl transition"
                      >
                        <FaUser className="text-gray-400 text-sm" />
                        <span>View Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          setShowCallHistoryModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-brand-orange rounded-xl transition"
                      >
                        <FaHistory className="text-gray-400 text-sm" />
                        <span>Call History</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handlePin();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-brand-orange rounded-xl transition"
                      >
                        <FaThumbtack className={`text-gray-400 text-sm ${activeConv.isPinned ? "rotate-45 text-brand-orange" : ""}`} />
                        <span>{activeConv.isPinned ? "Unpin Chat" : "Pin Chat"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleClearChat();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 rounded-xl transition"
                      >
                        <FaTrash className="text-red-400 text-sm" />
                        <span>Clear Chat</span>
                      </button>

                      <div className="my-1 border-t border-gray-100 dark:border-gray-800"></div>

                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleToggleBlock();
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition ${
                          activeConv.isBlockedByMe
                            ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        }`}
                      >
                        {activeConv.isBlockedByMe ? (
                          <>
                            <FaUnlock className="text-emerald-500 text-sm" />
                            <span>Unblock User</span>
                          </>
                        ) : (
                          <>
                            <FaBan className="text-red-500 text-sm" />
                            <span>Block User</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Messages Banner Bar */}
            {pinnedMessagesList.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 flex items-center justify-between text-xs shadow-xs flex-shrink-0 relative z-10 transition-all">
                <div
                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  onClick={() => scrollToMessage(pinnedMessagesList[currentPinnedIndex]._id)}
                >
                  <div className="p-1.5 bg-brand-orange/15 text-brand-orange rounded-xl shadow-xs">
                    <FaThumbtack className="text-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[11px] text-amber-900 dark:text-amber-300 leading-tight">
                        Pinned Message
                      </span>
                      {pinnedMessagesList.length > 1 && (
                        <span className="text-[10px] bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                          {currentPinnedIndex + 1}/{pinnedMessagesList.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                      {pinnedMessagesList[currentPinnedIndex]?.messageType === "image"
                        ? "Image attachment"
                        : pinnedMessagesList[currentPinnedIndex]?.messageType === "video"
                        ? "Video attachment"
                        : pinnedMessagesList[currentPinnedIndex]?.messageType === "audio"
                        ? "Voice message"
                        : pinnedMessagesList[currentPinnedIndex]?.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {pinnedMessagesList.length > 1 && (
                    <button
                      onClick={() => setCurrentPinnedIndex((prev) => (prev + 1) % pinnedMessagesList.length)}
                      className="px-2 py-1 bg-amber-200/80 dark:bg-amber-900/80 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-lg text-[10px] font-extrabold transition"
                    >
                      Next
                    </button>
                  )}
                  <button
                    onClick={() => handleTogglePin(pinnedMessagesList[currentPinnedIndex]._id)}
                    className="p-1.5 text-amber-700 dark:text-amber-400 hover:text-red-600 rounded-lg transition"
                    title="Unpin message"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              </div>
            )}

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
                      index={index}
                      onReply={(m) => setReplyingTo(m)}
                      onForward={(m) => setForwardingMsg(m)}
                      onReaction={(id, emoji) => handleReaction(id, emoji)}
                      onPin={(id) => handleTogglePin(id)}
                      onDownloadMedia={(url, filename) => handleDownloadMedia(url, filename)}
                      onEdit={(m) => {
                        setEditingMsg(m);
                        setMessageText(m.text);
                      }}
                      onUnsend={(id) => handleUnsend(id)}
                      onDelete={(id) => handleDeleteForMe(id)}
                      onImageClick={(url) => setFullViewImage(url)}
                      activeMenuId={activeActionMenuId}
                      setActiveMenuId={setActiveActionMenuId}
                      showMoreEmojisMsgId={showMoreEmojisMsgId}
                      setShowMoreEmojisMsgId={setShowMoreEmojisMsgId}
                    />
                  );
                })
              ) : (
                <div className="text-center py-20 text-xs text-gray-400 font-medium">
                  No messages in this chat. Say hello 👋!
                </div>
              )}
              {activeConv && typingConversations[activeConv._id] && (
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 italic p-3 bg-white dark:bg-gray-900 rounded-2xl w-fit shadow-xs animate-pulse mb-2 ml-2">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce [animation-delay:0s]"></span>
                    <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>{activeConv.partner?.name || "User"} is typing...</span>
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

            {/* Input Bar or Blocked Notification Banner */}
            {activeConv.isBlockedByMe ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left flex-shrink-0 z-20">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
                  <FaBan className="text-base shrink-0" />
                  <span>You have blocked this user. Unblock to send messages.</span>
                </div>
                <button
                  onClick={handleToggleBlock}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow transition flex items-center gap-1.5 shrink-0"
                >
                  <FaUnlock /> Unblock User
                </button>
              </div>
            ) : activeConv.isBlockedByPartner ? (
              <div className="p-4 bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold text-center flex-shrink-0 z-20">
                <FaBan className="text-base shrink-0 text-gray-400" />
                <span>You cannot send messages to this conversation because you have been blocked.</span>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative z-20 flex-shrink-0">
                {/* Emoji Picker Popover */}
                {/* Emoji Picker Popover (Only on Desktop) */}
                {showEmojiPicker && window.innerWidth >= 640 && (
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
                    <div className="sm:hidden absolute bottom-16 left-2 z-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-3 flex gap-4 items-center animate-pop-in">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileDropup(false);
                          // setShowShiftPicker ? setShowShiftPicker(false) : void(0); // compatibility placeholder check
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
            )}
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

      {/* 4. Followers, Following & New User Search Network Modal */}
      {showFollowsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <FaUsers className="text-brand-orange" />
                Start New Chat & Network
              </h3>
              <button
                onClick={() => setShowFollowsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            {/* Tab switch buttons */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                onClick={() => handleSwitchFollowsTab("followers")}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${followsTab === "followers"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Followers
              </button>
              <button
                onClick={() => handleSwitchFollowsTab("following")}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${followsTab === "following"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Following
              </button>
              <button
                onClick={() => handleSwitchFollowsTab("all")}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${followsTab === "all"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                All Users
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <input
                type="text"
                placeholder={
                  followsTab === "all"
                    ? "Search new users by name, username or phone..."
                    : `Search ${followsTab}...`
                }
                value={followsQuery}
                onChange={(e) => setFollowsQuery(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
              />
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingFollows ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredFollowsList.length > 0 ? (
                filteredFollowsList.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition border border-gray-50 dark:border-gray-800/40"
                  >
                    <div
                      onClick={() => {
                        setShowFollowsModal(false);
                        handleOpenPartnerProfile(u);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 pr-2 cursor-pointer group"
                      title="View User Profile"
                    >
                      <img
                        src={u.profileImage || "/logo192.png"}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0 group-hover:border-brand-orange transition"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-gray-800 dark:text-white truncate group-hover:text-brand-orange transition">
                          {u.name}
                        </h4>
                        <p className="text-[11px] text-gray-400 truncate">
                          @{u.username || u.phone || "user"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowFollowsModal(false);
                        handleSelectUserToChat(u);
                      }}
                      className="px-3 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <BiMessageRoundedDots className="text-sm" /> Message
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-gray-400 font-medium">
                  {followsQuery
                    ? `No users matching "${followsQuery}"`
                    : followsTab === "all"
                    ? "Type name, username or phone to search platform users"
                    : `No ${followsTab} found`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Conversation List Item
const ConversationItem = ({ conv, isActive, isTyping, onClick }) => {
  const partner = conv.partner;
  const lastMsg = conv.lastMessage;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 mx-2 rounded-2xl cursor-pointer transition ${isActive
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
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-white truncate">
              {partner?.name || "User"}
            </h4>
            {conv.isBlockedByMe && (
              <span className="bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 border border-red-200 dark:border-red-800">
                <FaBan className="text-[8px]" /> Blocked
              </span>
            )}
          </div>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-gray-400 font-semibold shrink-0">
              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[170px]">
            {isTyping ? (
              <span className="text-brand-orange font-bold animate-pulse">typing...</span>
            ) : lastMsg ? (
              lastMsg.isUnsent ? (
                <span className="italic">Message unsent</span>
              ) : lastMsg.isEncrypted ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <FaLock className="text-[9px]" /> Encrypted Message
                </span>
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
  index,
  onReply,
  onForward,
  onReaction,
  onPin,
  onDownloadMedia,
  onEdit,
  onUnsend,
  onDelete,
  onImageClick,
  activeMenuId,
  setActiveMenuId,
  showMoreEmojisMsgId,
  setShowMoreEmojisMsgId,
}) => {
  const isMenuOpen = activeMenuId === msg._id;
  const openDownwards = index < 2;

  return (
    <div
      id={`msg-${msg._id}`}
      className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative mb-2 transition-all duration-300`}
    >
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
        <div className="relative chat-dropdown-container">
          <button
            onClick={() => {
              setActiveMenuId(isMenuOpen ? null : msg._id);
              if (setShowMoreEmojisMsgId) setShowMoreEmojisMsgId(null);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition"
          >
            <FaEllipsisV />
          </button>

          {/* Context Action Menu Dropdown */}
          {isMenuOpen && (
            <div
              className={`absolute z-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl py-2 px-1 min-w-[170px] ${
                openDownwards ? "top-full mt-1" : "bottom-full mb-1"
              } ${isMe ? "right-0" : "left-0"}`}
            >
              {/* Quick Reactions Row with '+' Plus icon */}
              <div className="flex items-center justify-between gap-1 border-b border-gray-100 dark:border-gray-800 pb-2 mb-1 px-1">
                <div className="flex items-center justify-around flex-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(msg._id, emoji);
                        setActiveMenuId(null);
                      }}
                      className="text-sm hover:scale-125 transition p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setShowMoreEmojisMsgId) {
                      setShowMoreEmojisMsgId(showMoreEmojisMsgId === msg._id ? null : msg._id);
                    }
                  }}
                  className={`p-1 rounded-full text-[11px] transition flex items-center justify-center ${
                    showMoreEmojisMsgId === msg._id
                      ? "bg-brand-orange text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  title="More Reactions (+)"
                >
                  <FaPlus className="text-[10px]" />
                </button>
              </div>

              {/* Expanded Emojis Palette Section if '+' clicked */}
              {showMoreEmojisMsgId === msg._id && (
                <div className="grid grid-cols-6 gap-1 p-2 mb-2 bg-gray-50 dark:bg-gray-800/80 rounded-xl max-h-44 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700">
                  {MORE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(msg._id, emoji);
                        if (setShowMoreEmojisMsgId) setShowMoreEmojisMsgId(null);
                        setActiveMenuId(null);
                      }}
                      className="text-base hover:scale-125 hover:bg-white dark:hover:bg-gray-700 rounded p-1 transition flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Reply */}
              <button
                onClick={() => {
                  setActiveMenuId(null);
                  onReply(msg);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FaReply /> Reply
              </button>

              {/* Forward */}
              <button
                onClick={() => {
                  setActiveMenuId(null);
                  onForward(msg);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FaShare /> Forward
              </button>

              {/* Pin / Unpin Message */}
              {!msg.isUnsent && (
                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onPin(msg._id);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${
                    msg.isPinned
                      ? "text-brand-orange font-bold hover:bg-orange-50 dark:hover:bg-gray-800"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <FaThumbtack className={msg.isPinned ? "text-brand-orange rotate-45" : ""} />
                  {msg.isPinned ? "Unpin Message" : "Pin Message"}
                </button>
              )}

              {/* Download Image / Video / Attachment */}
              {msg.mediaUrl && !msg.isUnsent && (
                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onDownloadMedia(
                      msg.mediaUrl,
                      `${msg.messageType || "media"}_${msg._id}`
                    );
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FaDownload className="text-gray-500" />
                  {msg.messageType === "image"
                    ? "Download Image"
                    : msg.messageType === "video"
                    ? "Download Video"
                    : "Download File"}
                </button>
              )}

              {/* Edit */}
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

              {/* Unsend for everyone */}
              {isMe && !msg.isUnsent && (
                <button
                  onClick={() => onUnsend(msg._id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FaUndo /> Unsend for everyone
                </button>
              )}

              {/* Delete for me */}
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
          {/* Pinned Badge on Top Right of Bubble */}
          {msg.isPinned && !msg.isUnsent && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-2 py-0.5 rounded-full mb-1.5 w-fit border border-amber-200/50">
              <FaThumbtack className="text-[9px] text-brand-orange" /> Pinned Message
            </div>
          )}

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
              {msg.messageType === "text" && (
                <p className="whitespace-pre-wrap">
                  {msg.isEncrypted && !msg.isDecrypted ? (
                    <span className="flex items-center gap-1.5 opacity-80 italic font-medium">
                      <FaLock className="text-[10px]" /> Waiting for decryption...
                    </span>
                  ) : (
                    msg.text
                  )}
                </p>
              )}

              {msg.messageType === "call" && (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-black/5 dark:bg-white/5 font-extrabold text-[11px] leading-tight select-none">
                  {msg.text.toLowerCase().includes("video") ? (
                    <BiVideo className="text-sm text-brand-orange" />
                  ) : (
                    <BiPhoneCall className="text-sm text-brand-orange" />
                  )}
                  <span>{msg.text}</span>
                </div>
              )}

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
