import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FaUser,
  FaChevronDown,
  FaPlay,
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
  safeKeyDiagnostic,
  E2EE_DIAGNOSTIC,
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
  getUserPublicKey,
  saveE2EEIdentity,
  getE2EEBackup,
  blockUser,
  unblockUser,
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
  "❤️",
  "👍",
  "😂",
  "😮",
  "😢",
  "🔥",
  "🎉",
  "💯",
  "👏",
  "🙏",
  "🤩",
  "🥳",
  "🤣",
  "😍",
  "💩",
  "✨",
  "💡",
  "💔",
  "⚡",
  "🏆",
  "👌",
  "😎",
  "😭",
  "🙄",
  "😬",
  "🫡",
  "🫣",
  "🚀",
  "🍿",
  "🙌",
  "💖",
  "🥰",
  "🎯",
  "👑",
  "⭐",
  "💪",
];

// Curated GIF Categories & Rich Collection
export const GIF_CATEGORIES = [
  "All",
  "Trending",
  "Laugh",
  "Love",
  "Dance",
  "Party",
  "Sad",
  "Shocked",
  "Hi & Bye",
  "Clap",
  "Thumbs Up",
  "Fire",
  "Cute",
  "Anime",
];

export const CHAT_GIFS = [
  { id: "g1", title: "Minions Cheering Yay", category: "Trending", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  { id: "g2", title: "Excited Happy Dance", category: "Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
  { id: "g3", title: "Leonardo DiCaprio Cheers Toast", category: "Party", url: "https://media.giphy.com/media/GCLlQnV7d42BRBRpdK/giphy.gif" },
  { id: "g4", title: "Popcorn Watching Drama", category: "Trending", url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" },
  { id: "g5", title: "Cat Vibing / Grooving", category: "Dance", url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif" },
  { id: "g6", title: "Laughing Out Loud LOL", category: "Laugh", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
  { id: "g7", title: "Tom and Jerry Laughing Hard", category: "Laugh", url: "https://media.giphy.com/media/ltIFdjNAasOwVvKhvx/giphy.gif" },
  { id: "g8", title: "Heart Love Flying Kiss", category: "Love", url: "https://media.giphy.com/media/26FLdm964upIOCZYQ/giphy.gif" },
  { id: "g9", title: "Cute Bear Hug Love", category: "Love", url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif" },
  { id: "g10", title: "Thumbs Up Awesome Job", category: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "g11", title: "Borat Great Success Thumbs Up", category: "Thumbs Up", url: "https://media.giphy.com/media/a0h7sAqON67nO/giphy.gif" },
  { id: "g12", title: "Clapping Standing Ovation", category: "Clap", url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif" },
  { id: "g13", title: "Baby Happy Dance", category: "Dance", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif" },
  { id: "g14", title: "Party Confetti Celebration", category: "Party", url: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif" },
  { id: "g15", title: "Crying Sad Tears", category: "Sad", url: "https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif" },
  { id: "g16", title: "Shocked Mind Blown", category: "Shocked", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "g17", title: "OMG Shocked Cat", category: "Shocked", url: "https://media.giphy.com/media/C9x8gX02SnMIoAClXA/giphy.gif" },
  { id: "g18", title: "Hello Wave Hi", category: "Hi & Bye", url: "https://media.giphy.com/media/Nx0rz3jtxt969jIvNT/giphy.gif" },
  { id: "g19", title: "Homer Simpson Disappearing Bye", category: "Hi & Bye", url: "https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif" },
  { id: "g20", title: "Fire Lit Hot Flame", category: "Fire", url: "https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif" },
  { id: "g21", title: "Dancing Carlton Fresh Prince", category: "Dance", url: "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif" },
  { id: "g22", title: "Cute Panda Rolling", category: "Cute", url: "https://media.giphy.com/media/EatwJZRUIv41G/giphy.gif" },
  { id: "g23", title: "Anime Wow Star Eyes", category: "Anime", url: "https://media.giphy.com/media/po3NDGWuAE33qqqmg3/giphy.gif" },
  { id: "g24", title: "Anime Happy Smile", category: "Anime", url: "https://media.giphy.com/media/ErZ8hv5eO92JW/giphy.gif" },
  { id: "g25", title: "Cool Sunglasses Deal With It", category: "Trending", url: "https://media.giphy.com/media/xT0BKk9aPtLzKJiUi4/giphy.gif" },
  { id: "g26", title: "Facepalm Oh No", category: "Shocked", url: "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif" },
  { id: "g27", title: "Winking Flirt Eye", category: "Love", url: "https://media.giphy.com/media/6ra84UsoIZ9AIA3KZ3/giphy.gif" },
  { id: "g28", title: "Dog Nodding Yes Agree", category: "Trending", url: "https://media.giphy.com/media/krewXUB6LBja/giphy.gif" },
  { id: "g29", title: "Shaq Shimmy Laugh", category: "Laugh", url: "https://media.giphy.com/media/UO5elnTqo4vSg/giphy.gif" },
  { id: "g30", title: "Money Cash Rain Party", category: "Party", url: "https://media.giphy.com/media/LdOyjZ7io5Msw/giphy.gif" },
  { id: "g31", title: "Applause DiCaprio Wolf", category: "Clap", url: "https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif" },
  { id: "g32", title: "Pikachu Shocked Face", category: "Anime", url: "https://media.giphy.com/media/6nWhy3NdSTmBQEDzdT/giphy.gif" },
];

// WhatsApp-style timestamp formatter for chat conversation list
export const formatWhatsAppTimestamp = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffTime = today.getTime() - targetDay.getTime();
  const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  } else {
    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
};

// WhatsApp-style date divider label for message feed (Today, Yesterday, Day Name, or Full Date)
export const getChatDateDivider = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffTime = today.getTime() - targetDay.getTime();
  const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  } else {
    return d.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
};

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Auto-open conversation when navigating from UserProfilePage or with userId parameter
  useEffect(() => {
    const targetUserId =
      location.state?.userId ||
      new URLSearchParams(location.search).get("userId");

    if (
      targetUserId &&
      currentUserId &&
      targetUserId.toString() !== currentUserId.toString()
    ) {
      startConversation(targetUserId)
        .then((res) => {
          if (res && res.data) {
            setActiveConv(res.data);
            loadConversations();
          }
        })
        .catch((err) => {
          console.error("Failed to auto-open conversation:", err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.userId, location.search, currentUserId]);

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
  const recentPlaintextCache = useRef(new Map());

  // Pickers & Modals
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifCategory, setGifCategory] = useState("All");
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [showMobileDropup, setShowMobileDropup] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showMoreEmojisMsgId, setShowMoreEmojisMsgId] = useState(null);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [fullViewImage, setFullViewImage] = useState(null);
  const [fullViewVideo, setFullViewVideo] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // E2EE Key Management States & Refs
  const [e2eeKeys, setE2eeKeys] = useState(null);
  const [decryptedLastMessages, setDecryptedLastMessages] = useState({});
  const partnerSharedKeysRef = useRef({});

  const isSameId = (a, b) => a?.toString() === b?.toString();

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

  const e2eeInitPromiseRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialize E2EE Keypair for current user with singleton promise lock
  const ensureUserE2EE = async () => {
    if (e2eeKeys && !e2eeKeys.error && e2eeKeys.privateKey) {
      return e2eeKeys;
    }
    if (!currentUserId) return null;
    if (e2eeInitPromiseRef.current) {
      return e2eeInitPromiseRef.current;
    }
    e2eeInitPromiseRef.current = (async () => {
      try {
        const keys = await initUserE2EE(
          currentUserId,
          saveE2EEIdentity,
          getE2EEBackup,
          getUserPublicKey,
        );
        if (keys && !keys.error && keys.privateKey) {
          setE2eeKeys(keys);
          return keys;
        }
        return keys;
      } catch (err) {
        console.error("Error ensuring user E2EE keys:", err);
        return null;
      } finally {
        e2eeInitPromiseRef.current = null;
      }
    })();
    return e2eeInitPromiseRef.current;
  };

  useEffect(() => {
    if (!currentUserId) return;
    ensureUserE2EE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!activeConv) return;
    document.body.classList.add("chat-active-mobile");
    return () => {
      document.body.classList.remove("chat-active-mobile");
    };
  }, [activeConv]);

  // Derive shared key for partner with always-fresh public identity lookup
  const getSharedKeyForPartner = async (partner, forceFresh = false) => {
    const activeKeys = await ensureUserE2EE();
    if (!activeKeys || !activeKeys.privateKey || !partner) return null;
    const partnerId =
      typeof partner === "string"
        ? partner
        : (partner._id || partner.id)?.toString();
    if (!partnerId) return null;

    let partnerPubKeyStr = null;
    let partnerKeyId = "";

    try {
      const keyRes = await getUserPublicKey(partnerId);
      if (keyRes && keyRes.data && keyRes.data.publicKey) {
        partnerPubKeyStr = keyRes.data.publicKey;
        partnerKeyId = keyRes.data.keyId || "";
      }
    } catch (err) {
      console.warn("Could not fetch fresh partner public key:", err);
    }

    if (!partnerPubKeyStr && typeof partner === "object" && partner.publicKey) {
      partnerPubKeyStr = partner.publicKey;
    }

    if (
      !partnerPubKeyStr ||
      typeof partnerPubKeyStr !== "string" ||
      !partnerPubKeyStr.trim()
    ) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_NOT_FOUND, {
        recipientId: partnerId,
      });
      return null;
    }

    const cacheKey = `${partnerId}_${partnerKeyId}_${partnerPubKeyStr.slice(0, 30)}`;
    if (!forceFresh && partnerSharedKeysRef.current[cacheKey]) {
      return partnerSharedKeysRef.current[cacheKey];
    }

    try {
      const partnerPubKey = await importPublicKey(partnerPubKeyStr);
      if (!partnerPubKey) return null;

      const sharedKey = await deriveSharedKey(
        activeKeys.privateKey,
        partnerPubKey,
      );
      if (sharedKey) {
        partnerSharedKeysRef.current[cacheKey] = sharedKey;
      }
      return sharedKey;
    } catch (err) {
      console.warn("Failed to derive shared key for partner:", err);
      return null;
    }
  };

  const buildEncryptedMessagePayload = async (plainText, recipient) => {
    if (!plainText) return null;
    const activeKeys = await ensureUserE2EE();
    if (!activeKeys || activeKeys.error || !activeKeys.privateKey) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_PRIVATE_KEY_MISSING, {
        senderId: currentUserId,
        currentDeviceId: activeKeys?.deviceId,
        currentKeyId: activeKeys?.keyId,
        storedPrivateKeyExists: activeKeys?.storedPrivateKeyExists,
      });
      throw new Error(
        "Device encryption key is missing or not initialized. Please refresh the page.",
      );
    }

    const recipientId = (
      recipient?._id ||
      recipient?.id ||
      recipient
    )?.toString();
    if (!recipientId) {
      throw new Error("Recipient ID is required for message encryption.");
    }

    // Always fetch fresh recipient public identity
    let recipientPubKeyStr = null;
    let recipientKeyId = "";
    try {
      const keyRes = await getUserPublicKey(recipientId);
      if (keyRes?.data?.publicKey) {
        recipientPubKeyStr = keyRes.data.publicKey;
        recipientKeyId = keyRes.data.keyId || "key_account";
      }
    } catch (err) {
      console.warn("Could not fetch recipient public key:", err);
    }

    if (!recipientPubKeyStr && typeof recipient === "object" && recipient?.publicKey) {
      recipientPubKeyStr = recipient.publicKey;
    }

    if (!recipientPubKeyStr) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_NOT_FOUND, {
        recipientId,
        senderDeviceId: activeKeys.deviceId,
        senderKeyId: activeKeys.keyId,
      });
      throw new Error(
        "Recipient does not have an active encryption key registered. Secure delivery cannot be completed.",
      );
    }

    const recipientPubKey = await importPublicKey(recipientPubKeyStr);
    const sharedKey = recipientPubKey
      ? await deriveSharedKey(activeKeys.privateKey, recipientPubKey)
      : null;

    if (!sharedKey) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_NOT_FOUND, {
        recipientId,
      });
      throw new Error("Failed to derive encryption key for recipient.");
    }

    const encrypted = await encryptText(plainText, sharedKey);
    if (!encrypted?.ciphertext || !encrypted?.iv) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.ENCRYPT_FAILED, {
        recipientId,
        senderDeviceId: activeKeys.deviceId,
        senderKeyId: activeKeys.keyId,
      });
      throw new Error("Failed to encrypt message.");
    }

    safeKeyDiagnostic("ENCRYPT_MESSAGE_SUCCESS", {
      senderId: currentUserId,
      recipientId,
      currentDeviceId: activeKeys.deviceId,
      currentKeyId: activeKeys.keyId,
      senderDeviceId: activeKeys.deviceId,
      recipientDeviceId: recipient?.sessions?.web?.deviceId || "active_device",
      senderKeyId: activeKeys.keyId,
      recipientKeyId: recipientKeyId || "key_account",
    });

    return {
      text: encrypted.ciphertext,
      iv: encrypted.iv,
      isEncrypted: true,
      encryption: {
        version: 2,
        senderDeviceId: activeKeys.deviceId,
        senderKeyId: activeKeys.keyId,
        senderPublicKey: activeKeys.publicKeyString,
        recipientDeviceId: recipient?.sessions?.web?.deviceId || "active_device",
        recipientKeyId: recipientKeyId || "key_account",
        recipientPublicKey: recipientPubKeyStr,
        envelopes: [],
      },
    };
  };

  // Helper to decrypt a single payload's text if encrypted
  const decryptMessageText = async (msg, sharedKey = null) => {
    if (!msg || !msg.text) return msg;
    if (!msg.isEncrypted || !msg.iv) return { ...msg, isDecrypted: true };
    if (msg.isDecrypted) return msg;

    // Check recent fast plaintext cache first for immediately sent messages
    if (recentPlaintextCache.current.has(msg.text)) {
      return {
        ...msg,
        text: recentPlaintextCache.current.get(msg.text),
        isDecrypted: true,
      };
    }
    const msgKey = (msg._id || msg.id)?.toString();
    if (msgKey && recentPlaintextCache.current.has(msgKey)) {
      return {
        ...msg,
        text: recentPlaintextCache.current.get(msgKey),
        isDecrypted: true,
      };
    }

    const activeKeys = await ensureUserE2EE();
    if (!activeKeys || activeKeys.error || !activeKeys.privateKey) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_PRIVATE_KEY_MISSING, {
        messageId: msg._id || msg.id,
        senderId: msg.sender?._id || msg.sender?.id || msg.sender,
        recipientId: msg.recipient?._id || msg.recipient?.id || msg.recipient,
        currentDeviceId: activeKeys?.deviceId,
        currentKeyId: activeKeys?.keyId,
      });
      return { ...msg, isDecrypted: false };
    }

    try {
      let encryptionObj = msg.encryption;
      if (typeof encryptionObj === "string") {
        try {
          encryptionObj = JSON.parse(encryptionObj);
        } catch (e) {
          encryptionObj = {};
        }
      }
      if (!encryptionObj || typeof encryptionObj !== "object") {
        encryptionObj = {};
      }

      const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
      const recipientId = (msg.recipient?._id || msg.recipient?.id || msg.recipient)?.toString();
      const isSender = isSameId(senderId, currentUserId);
      const partnerObj = isSender ? msg.recipient : msg.sender;

      // Candidate partner public keys to try for ECDH decryption
      const candidatePublicKeys = [];

      const addCandidateKey = (key) => {
        if (key && typeof key === "string" && key.trim() && !candidatePublicKeys.includes(key.trim())) {
          candidatePublicKeys.push(key.trim());
        }
      };

      if (!isSender) {
        // Case 1: Message received from partner.
        addCandidateKey(encryptionObj.senderPublicKey);
        addCandidateKey(partnerObj?.publicKey);
        addCandidateKey(partnerObj?.e2eeIdentity?.publicKey);
        addCandidateKey(partnerObj?.activeSession?.publicKey);
        if (Array.isArray(partnerObj?.deviceKeys)) {
          partnerObj.deviceKeys.forEach((dk) => addCandidateKey(dk?.publicKey));
        }
      } else {
        // Case 2: Message sent by current user.
        addCandidateKey(encryptionObj.recipientPublicKey);
        addCandidateKey(partnerObj?.publicKey);
        addCandidateKey(partnerObj?.e2eeIdentity?.publicKey);
        addCandidateKey(partnerObj?.activeSession?.publicKey);
        if (Array.isArray(partnerObj?.deviceKeys)) {
          partnerObj.deviceKeys.forEach((dk) => addCandidateKey(dk?.publicKey));
        }
        addCandidateKey(encryptionObj.senderPublicKey);
      }

      // Gather candidate keys from loaded messages in this conversation (historical partner keys)
      const currentMsgs = messagesRef.current || messages;
      if (Array.isArray(currentMsgs)) {
        for (const item of currentMsgs) {
          const itemSenderId = (item.sender?._id || item.sender?.id || item.sender)?.toString();
          if (itemSenderId && !isSameId(itemSenderId, currentUserId)) {
            let enc = item.encryption;
            if (typeof enc === "string") {
              try { enc = JSON.parse(enc); } catch (e) { enc = null; }
            }
            if (enc?.senderPublicKey) {
              addCandidateKey(enc.senderPublicKey);
            }
          }
        }
      }

      // If active conversation partner key is available, add as fallback
      if (activeConv?.partner) {
        addCandidateKey(activeConv.partner.publicKey);
        addCandidateKey(activeConv.partner.e2eeIdentity?.publicKey);
        addCandidateKey(activeConv.partner.activeSession?.publicKey);
        if (Array.isArray(activeConv.partner.deviceKeys)) {
          activeConv.partner.deviceKeys.forEach((dk) => addCandidateKey(dk?.publicKey));
        }
      }

      // Multi-device envelopes check
      if (Array.isArray(encryptionObj?.envelopes)) {
        encryptionObj.envelopes.forEach((env) => {
          addCandidateKey(env?.senderPublicKey);
        });
      }

      // If a pre-derived shared key was passed, try it first
      if (sharedKey) {
        const plainText = await decryptText(msg.text, msg.iv, sharedKey);
        if (plainText !== null) {
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.HISTORICAL_DECRYPT_SUCCESS, {
            messageId: msg._id || msg.id,
            senderId,
            recipientId,
          });
          return { ...msg, text: plainText, isDecrypted: true };
        }
      }

      // Try each candidate public key
      for (const pubKeyStr of candidatePublicKeys) {
        if (!pubKeyStr || typeof pubKeyStr !== "string") continue;
        try {
          const importedPub = await importPublicKey(pubKeyStr);
          if (!importedPub) continue;
          const derivedSecret = await deriveSharedKey(activeKeys.privateKey, importedPub);
          if (!derivedSecret) continue;

          const plainText = await decryptText(msg.text, msg.iv, derivedSecret);
          if (plainText !== null) {
            safeKeyDiagnostic(E2EE_DIAGNOSTIC.HISTORICAL_DECRYPT_SUCCESS, {
              messageId: msg._id || msg.id,
              senderId,
              recipientId,
            });
            return { ...msg, text: plainText, isDecrypted: true };
          }
        } catch (e) {
          // continue trying next key
        }
      }

      // Method 3: Legacy multi-device envelope matching
      const envelopes = Array.isArray(encryptionObj?.envelopes)
        ? encryptionObj.envelopes
        : [];
      if (envelopes.length > 0) {
        const envelope = envelopes.find(
          (item) => isSameId(item.userId, currentUserId)
        );

        if (envelope) {
          const envSenderPub = envelope.senderPublicKey || encryptionObj.senderPublicKey;
          if (envSenderPub) {
            const envSenderCryptoKey = await importPublicKey(envSenderPub);
            if (envSenderCryptoKey) {
              const envSharedKey = await deriveSharedKey(
                activeKeys.privateKey,
                envSenderCryptoKey,
              );
              if (envSharedKey) {
                const plainText = await decryptText(
                  envelope.ciphertext,
                  envelope.iv,
                  envSharedKey,
                );
                if (plainText !== null) {
                  safeKeyDiagnostic(E2EE_DIAGNOSTIC.HISTORICAL_DECRYPT_SUCCESS, {
                    messageId: msg._id || msg.id,
                  });
                  return { ...msg, text: plainText, isDecrypted: true };
                }
              }
            }
          }
        }
      }

      safeKeyDiagnostic(E2EE_DIAGNOSTIC.HISTORICAL_DECRYPT_FAILED, {
        messageId: msg._id || msg.id,
        senderId,
        recipientId,
        currentKeyId: activeKeys.keyId,
        senderKeyId: encryptionObj?.senderKeyId,
        recipientKeyId: encryptionObj?.recipientKeyId,
      });

      return {
        ...msg,
        text: "🔒 Message unavailable on this device",
        isDecrypted: true,
        isDecryptionFailed: true,
        isLegacyUnavailable: true,
      };
    } catch (err) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.HISTORICAL_DECRYPT_FAILED, {
        messageId: msg._id || msg.id,
        senderId: msg.sender?._id || msg.sender?.id || msg.sender,
        recipientId: msg.recipient?._id || msg.recipient?.id || msg.recipient,
      });
      return {
        ...msg,
        text: "🔒 Message unavailable on this device",
        isDecrypted: true,
        isDecryptionFailed: true,
        isLegacyUnavailable: true,
      };
    }
  };

  // Helper to decrypt message AND its replyTo snippet if encrypted
  const processDecryptMessage = async (msg, sharedKey = null) => {
    if (!msg) return msg;

    let decryptedMsg = await decryptMessageText(msg, sharedKey);

    // If replyTo exists and is an object, decrypt it too
    if (
      decryptedMsg &&
      decryptedMsg.replyTo &&
      typeof decryptedMsg.replyTo === "object"
    ) {
      let replyObj = { ...decryptedMsg.replyTo };
      if (replyObj.isEncrypted && replyObj.iv && !replyObj.isDecrypted) {
        // First check if already in messages state
        const cached = messages.find(
          (m) =>
            (m._id || m.id)?.toString() ===
            (replyObj._id || replyObj.id)?.toString(),
        );
        if (cached && cached.isDecrypted && cached.text) {
          replyObj.text = cached.text;
          replyObj.isDecrypted = true;
        } else {
          const decryptedReply = await decryptMessageText(replyObj, sharedKey);
          if (decryptedReply && decryptedReply.isDecrypted) {
            replyObj = decryptedReply;
          }
        }
      }
      decryptedMsg = { ...decryptedMsg, replyTo: replyObj };
    }

    return decryptedMsg;
  };

  const lastDecryptedWithKeyRef = useRef(null);

  // Auto-retry decryption whenever e2eeKeys, activeConv, or messages array updates
  useEffect(() => {
    if (!e2eeKeys || !activeConv || messages.length === 0) return;

    const keyChanged = Boolean(e2eeKeys.keyId && e2eeKeys.keyId !== lastDecryptedWithKeyRef.current);
    if (keyChanged) {
      lastDecryptedWithKeyRef.current = e2eeKeys.keyId;
    }

    const hasUndecrypted = messages.some(
      (m) =>
        (m.isEncrypted && m.iv && (!m.isDecrypted || (keyChanged && m.isDecryptionFailed))) ||
        (m.replyTo &&
          typeof m.replyTo === "object" &&
          m.replyTo.isEncrypted &&
          m.replyTo.iv &&
          (!m.replyTo.isDecrypted || (keyChanged && m.replyTo.isDecryptionFailed))),
    );
    if (!hasUndecrypted) return;

    let isMounted = true;
    (async () => {
      const partnerKey = await getSharedKeyForPartner(activeConv.partner);
      if (!isMounted) return;

      const updated = await Promise.all(
        messages.map(async (msg) => {
          const needsMsgDecryption =
            msg.isEncrypted && msg.iv && (!msg.isDecrypted || (keyChanged && msg.isDecryptionFailed));
          const needsReplyDecryption =
            msg.replyTo &&
            typeof msg.replyTo === "object" &&
            msg.replyTo.isEncrypted &&
            msg.replyTo.iv &&
            (!msg.replyTo.isDecrypted || (keyChanged && msg.replyTo.isDecryptionFailed));

          if (needsMsgDecryption || needsReplyDecryption) {
            return await processDecryptMessage(msg, partnerKey);
          }
          return msg;
        }),
      );

      if (isMounted) {
        const hasChanges = updated.some(
          (m, idx) =>
            m.isDecrypted !== messages[idx]?.isDecrypted ||
            m.isDecryptionFailed !== messages[idx]?.isDecryptionFailed ||
            m.text !== messages[idx]?.text ||
            m.replyTo?.text !== messages[idx]?.replyTo?.text ||
            m.replyTo?.isDecrypted !== messages[idx]?.replyTo?.isDecrypted,
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

  const decryptConversationsLastMessages = async (convList) => {
    if (!convList || !Array.isArray(convList) || convList.length === 0) return;
    const activeKeys = await ensureUserE2EE();
    if (!activeKeys || !activeKeys.privateKey) return;

    const updates = {};
    for (const conv of convList) {
      const lastMsg = conv.lastMessage;
      if (!lastMsg || !lastMsg.isEncrypted || !lastMsg.iv) continue;
      if (decryptedLastMessages[conv._id]) continue;

      try {
        const partner =
          conv.partner ||
          (Array.isArray(conv.participants)
            ? conv.participants.find(
                (p) => !isSameId(p?._id || p?.id || p, currentUserId),
              )
            : null);
        const partnerKey = partner
          ? await getSharedKeyForPartner(partner)
          : null;
        const decrypted = await decryptMessageText(lastMsg, partnerKey);
        if (
          decrypted &&
          decrypted.isDecrypted &&
          !decrypted.isDecryptionFailed &&
          decrypted.text &&
          !decrypted.text.startsWith("🔒")
        ) {
          updates[conv._id] = decrypted.text;
        }
      } catch (e) {
        // ignore
      }
    }
    if (Object.keys(updates).length > 0) {
      setDecryptedLastMessages((prev) => ({ ...prev, ...updates }));
    }
  };

  // 1. Initial Load of Conversations
  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (e2eeKeys?.privateKey && conversations.length > 0) {
      decryptConversationsLastMessages(conversations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e2eeKeys]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      if (res && res.data) {
        setConversations(res.data);
        if (e2eeKeys?.privateKey) {
          decryptConversationsLastMessages(res.data);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  // Close menu dropdowns and pickers on outside touch/click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeActionMenuId && !e.target.closest(".chat-dropdown-container")) {
        setActiveActionMenuId(null);
        setShowMoreEmojisMsgId(null);
      }
      if (showHeaderMenu && !e.target.closest(".header-menu-container")) {
        setShowHeaderMenu(false);
      }
      if (
        showMobileDropup &&
        !e.target.closest(".mobile-dropup-container")
      ) {
        setShowMobileDropup(false);
      }
      if (
        showEmojiPicker &&
        !e.target.closest(".emoji-picker-container")
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showGifPicker &&
        !e.target.closest(".gif-picker-container")
      ) {
        setShowGifPicker(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("touchstart", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [
    activeActionMenuId,
    showHeaderMenu,
    showMobileDropup,
    showEmojiPicker,
    showGifPicker,
  ]);

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
    setShowScrollBottom(false);

    if (!activeConv) return;

    const fetchConvMessages = async () => {
      setLoadingMessages(true);
      try {
        // Ensure user E2EE identity is active before decrypting messages
        await ensureUserE2EE();
        const res = await getMessages(activeConv._id);
        if (res && res.data) {
          const partnerKey = await getSharedKeyForPartner(activeConv.partner);
          const decryptedMessages = await Promise.all(
            res.data.map((m) => processDecryptMessage(m, partnerKey)),
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
  const activeTyping = activeConv ? typingConversations[activeConv._id] : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTyping]);

  const addUniqueMessage = (prevMsgs, newMsg) => {
    if (!newMsg) return prevMsgs;
    const newId = (newMsg._id || newMsg.id)?.toString();
    if (!newId) return prevMsgs;
    const existingIndex = prevMsgs.findIndex(
      (m) => (m._id || m.id)?.toString() === newId,
    );
    if (existingIndex !== -1) {
      const existing = prevMsgs[existingIndex];
      // Never overwrite an already decrypted message with undecrypted/ciphertext
      if (existing.isDecrypted && !newMsg.isDecrypted) {
        return prevMsgs;
      }
      // If incoming message is decrypted and existing was not, update to decrypted
      if (newMsg.isDecrypted && !existing.isDecrypted) {
        const copy = [...prevMsgs];
        copy[existingIndex] = { ...existing, ...newMsg };
        return copy;
      }
      return prevMsgs;
    }
    return [...prevMsgs, newMsg];
  };

  // 4. Socket Listeners for Real-time Events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (newMsg) => {
      if (
        activeConv &&
        newMsg?.conversationId &&
        newMsg.conversationId.toString() === activeConv._id.toString()
      ) {
        const partnerKey = await getSharedKeyForPartner(activeConv.partner);
        const decryptedMsg = await processDecryptMessage(newMsg, partnerKey);
        setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
        markAsRead(activeConv._id);
      }
      loadConversations();
      fetchUnreadChatCount();
    };

    const handleMessageSent = async (sentMsg) => {
      if (
        activeConv &&
        sentMsg?.conversationId &&
        sentMsg.conversationId.toString() === activeConv._id.toString()
      ) {
        const msgKey = (sentMsg._id || sentMsg.id)?.toString();
        const existing = messages.find(
          (m) => (m._id || m.id)?.toString() === msgKey,
        );
        if (existing && existing.isDecrypted) {
          loadConversations();
          fetchUnreadChatCount();
          return;
        }

        const partnerKey = await getSharedKeyForPartner(activeConv.partner);
        const decryptedMsg = await processDecryptMessage(sentMsg, partnerKey);
        setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
      }
      loadConversations();
      fetchUnreadChatCount();
    };

    const handleMessageEdited = async (editedMsg) => {
      if (
        activeConv &&
        editedMsg?.conversationId &&
        editedMsg.conversationId.toString() === activeConv._id.toString()
      ) {
        const partnerKey = await getSharedKeyForPartner(activeConv.partner);
        const decryptedMsg = await processDecryptMessage(editedMsg, partnerKey);
        setMessages((prev) =>
          prev.map((m) => (m._id === decryptedMsg._id ? decryptedMsg : m)),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._id === editedMsg._id ? editedMsg : m)),
        );
      }
      loadConversations();
    };

    const handleMessageUnsent = (unsentMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === unsentMsg._id ? unsentMsg : m)),
      );
      loadConversations();
    };

    const handleMessageReaction = (reactedMsg) => {
      if (!reactedMsg || !reactedMsg._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === reactedMsg._id
            ? { ...m, reactions: reactedMsg.reactions || [] }
            : m,
        ),
      );
    };

    const handleMessagesRead = ({ conversationId }) => {
      if (
        activeConv &&
        conversationId.toString() === activeConv._id.toString()
      ) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, status: "READ", readAt: new Date() })),
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
        setTypingConversations((prev) => ({
          ...prev,
          [conversationId]: false,
        }));
      }
    };

    const handleUserOnline = ({ userId }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.partner?._id === userId
            ? { ...c, partner: { ...c.partner, isOnline: true } }
            : c,
        ),
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
            : c,
        ),
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
        }),
      );
      if (
        activeConv?.partner?._id === blockedId &&
        blockerId === currentUserId
      ) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByMe: true,
          isBlocked: true,
        }));
      }
      if (
        activeConv?.partner?._id === blockerId &&
        blockedId === currentUserId
      ) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByPartner: true,
          isBlocked: true,
        }));
      }
    };

    const handleUserUnblocked = ({ unblockerId, unblockedId }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.partner?._id === unblockedId && unblockerId === currentUserId) {
            const isBlockedByPartner = c.isBlockedByPartner || false;
            return {
              ...c,
              isBlockedByMe: false,
              isBlocked: isBlockedByPartner,
            };
          }
          if (c.partner?._id === unblockerId && unblockedId === currentUserId) {
            const isBlockedByMe = c.isBlockedByMe || false;
            return {
              ...c,
              isBlockedByPartner: false,
              isBlocked: isBlockedByMe,
            };
          }
          return c;
        }),
      );
      if (
        activeConv?.partner?._id === unblockedId &&
        unblockerId === currentUserId
      ) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByMe: false,
          isBlocked: prev?.isBlockedByPartner || false,
        }));
      }
      if (
        activeConv?.partner?._id === unblockerId &&
        unblockedId === currentUserId
      ) {
        setActiveConv((prev) => ({
          ...prev,
          isBlockedByPartner: false,
          isBlocked: prev?.isBlockedByMe || false,
        }));
      }
    };

    const handleMessagePinned = (pinnedMsg) => {
      if (!pinnedMsg || !pinnedMsg._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === pinnedMsg._id
            ? {
                ...m,
                isPinned:
                  typeof pinnedMsg.isPinned === "boolean"
                    ? pinnedMsg.isPinned
                    : m.isPinned,
                pinnedBy:
                  pinnedMsg.pinnedBy !== undefined
                    ? pinnedMsg.pinnedBy
                    : m.pinnedBy,
                pinnedAt: pinnedMsg.pinnedAt || m.pinnedAt,
              }
            : m,
        ),
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
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
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
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
        if (!message) return;
        // Never process outgoing messages sent by current user to avoid echo/ciphertext flashing
        if (
          message.from === currentUserId?.toString() ||
          isSameId(message.from, currentUserId)
        ) {
          return;
        }

        const ext = message.ext || {};

        // Determine sender and recipient user objects for proper UI normalization
        const partner = activeConv?.partner;
        const isFromMe = message.from === currentUserId?.toString();

        const senderObj = isFromMe
          ? {
              _id: currentUserId,
              name: currentUser.name,
              username: currentUser.username,
              profileImage: currentUser.profileImage,
            }
          : {
              _id: message.from,
              name: partner?.name,
              username: partner?.username,
              profileImage: partner?.profileImage,
            };

        const recipientObj = isFromMe
          ? {
              _id: partner?._id || partner?.id,
              name: partner?.name,
              username: partner?.username,
              profileImage: partner?.profileImage,
            }
          : {
              _id: currentUserId,
              name: currentUser.name,
              username: currentUser.username,
              profileImage: currentUser.profileImage,
            };

        let parsedEncryption = ext.encryption;
        if (typeof parsedEncryption === "string") {
          try {
            parsedEncryption = JSON.parse(parsedEncryption);
          } catch (e) {
            parsedEncryption = {};
          }
        }
        if (!parsedEncryption || typeof parsedEncryption !== "object") {
          parsedEncryption = {};
        }

        const isEncrypted =
          ext.isEncrypted === true || ext.isEncrypted === "true";
        const iv =
          isEncrypted && typeof ext.iv === "string" ? ext.iv.trim() : "";

        const incomingMsg = {
          _id: ext._id || ext.messageId || message.id || `agora_${Date.now()}`,
          conversationId: ext.conversationId,
          sender: senderObj,
          recipient: recipientObj,
          text: message.msg,
          isEncrypted: isEncrypted && iv !== "",
          iv: iv,
          encryption: parsedEncryption,
          messageType: ext.messageType || "text",
          mediaUrl: ext.mediaUrl || "",
          mediaMeta: ext.mediaMeta || {},
          replyTo: ext.replyTo || null,
          createdAt: message.time ? new Date(message.time) : new Date(),
        };

        const isMsgFromActivePartner =
          partner &&
          (message.from === partner._id?.toString() ||
            message.from === partner.id?.toString());
        const isMsgForActiveConv =
          ext.conversationId &&
          activeConv &&
          ext.conversationId.toString() === activeConv._id.toString();

        if (activeConv && (isMsgForActiveConv || isMsgFromActivePartner)) {
          const partnerKey = await getSharedKeyForPartner(activeConv.partner);
          const decryptedMsg = await processDecryptMessage(
            incomingMsg,
            partnerKey,
          );
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
      if (
        editingMsg.createdAt &&
        Date.now() - new Date(editingMsg.createdAt).getTime() > 60 * 60 * 1000
      ) {
        toast.error("Messages older than 1 hour cannot be edited");
        setEditingMsg(null);
        setMessageText("");
        return;
      }
      // Edit existing message with E2EE Encryption
      try {
        let textToSend = messageText.trim();
        let isEncrypted = false;
        let iv = "";
        let encryption = null;

        if (activeConv?.partner && textToSend) {
          const encryptedPayload = await buildEncryptedMessagePayload(
            textToSend,
            activeConv.partner,
          );
          if (encryptedPayload?.isEncrypted && encryptedPayload?.encryption) {
            textToSend = encryptedPayload.text;
            iv = encryptedPayload.iv;
            isEncrypted = true;
            encryption = encryptedPayload.encryption;
          }
        }

        const editPayload = {
          text: textToSend,
          isEncrypted,
          iv,
          encryption,
        };

        const res = await editMessage(editingMsg._id, editPayload);
        if (res && res.data) {
          const partnerKey = await getSharedKeyForPartner(activeConv?.partner);
          const decryptedMsg = await processDecryptMessage(res.data, partnerKey);
          setMessages((prev) =>
            prev.map((m) => (m._id === decryptedMsg._id ? decryptedMsg : m)),
          );
        }
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
      const rawPlainText = messageText.trim();
      let textToSend = rawPlainText;
      let isEncrypted = false;
      let iv = "";
      let encryption = null;

      if (activeConv?.partner && textToSend) {
        const encryptedPayload = await buildEncryptedMessagePayload(
          textToSend,
          activeConv.partner,
        );
        if (
          !encryptedPayload ||
          !encryptedPayload.isEncrypted ||
          !encryptedPayload.encryption
        ) {
          throw new Error(
            "Failed to construct complete E2EE encryption payload.",
          );
        }
        textToSend = encryptedPayload.text;
        iv = encryptedPayload.iv;
        isEncrypted = true;
        encryption = encryptedPayload.encryption;

        // Immediately cache plaintext by ciphertext to prevent any microsecond flash
        recentPlaintextCache.current.set(textToSend, rawPlainText);
      }

      const payload = {
        conversationId: activeConv._id,
        recipientId: activeConv.partner._id,
        text: textToSend,
        isEncrypted,
        iv,
        encryption,
        messageType: selectedMediaPreview ? messageType : "text",
        mediaUrl,
        mediaMeta,
        replyTo: replyingTo ? replyingTo._id : null,
      };

      const res = await sendMessage(payload);
      if (res && res.data) {
        const resMsgId = (res.data._id || res.data.id)?.toString();
        if (resMsgId) {
          recentPlaintextCache.current.set(resMsgId, rawPlainText);
        }

        // Immediately set the sidebar preview with plaintext so it never flashes encrypted
        setDecryptedLastMessages((prev) => ({
          ...prev,
          [activeConv._id]: rawPlainText,
        }));

        // Dispatch via Agora Chat SDK for ultra-reliable real-time delivery
        sendAgoraPeerMessage(activeConv.partner._id, textToSend, {
          _id: res.data._id || res.data.id,
          conversationId: activeConv._id,
          iv: iv,
          isEncrypted: isEncrypted,
          encryption: encryption,
          messageType: selectedMediaPreview ? messageType : "text",
          mediaUrl: mediaUrl,
          mediaMeta: mediaMeta,
          replyTo: replyingTo
            ? {
                _id: replyingTo._id,
                text: replyingTo.text,
                sender: replyingTo.sender
                  ? {
                      _id: replyingTo.sender._id || replyingTo.sender.id,
                      name: replyingTo.sender.name,
                      username: replyingTo.sender.username,
                    }
                  : null,
              }
            : null,
        }).catch((err) => console.warn("Agora Peer Dispatch Error:", err));

        const decryptedMsg = {
          ...res.data,
          text: rawPlainText,
          isDecrypted: true,
          replyTo: replyingTo
            ? {
                _id: replyingTo._id,
                text: replyingTo.text,
                sender: replyingTo.sender,
                isDecrypted: true,
                messageType: replyingTo.messageType || "text",
              }
            : res.data.replyTo,
        };
        setMessages((prev) => addUniqueMessage(prev, decryptedMsg));
        setMessageText("");
        setSelectedMediaPreview(null);
        setReplyingTo(null);
        setShowEmojiPicker(false);
        loadConversations();
      }
    } catch (err) {
      console.error("Send message error:", err);
      toast.error(
        err.message || err.response?.data?.message || "Failed to send message",
      );
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
          prev.map((m) =>
            m._id === msgId
              ? {
                  ...m,
                  reactions: res.data.reactions || [],
                }
              : m,
          ),
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
          prev.map((m) => (m._id === msgId ? res.data : m)),
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

  const isPinnedForMe = (msg) => {
    if (!msg || msg.isUnsent) return false;
    if (Array.isArray(msg.pinnedBy)) {
      return msg.pinnedBy.some((p) => {
        const pId = p?._id || p?.id || p;
        return pId && currentUserId && pId.toString() === currentUserId.toString();
      });
    }
    if (msg.pinnedBy) {
      const pId = msg.pinnedBy?._id || msg.pinnedBy?.id || msg.pinnedBy;
      return Boolean(pId && currentUserId && pId.toString() === currentUserId.toString());
    }
    return Boolean(msg.isPinned);
  };

  const pinnedMessagesList = messages.filter((m) => isPinnedForMe(m));

  const handleTogglePin = async (messageId) => {
    try {
      const res = await togglePinMessage(messageId);
      if (res && res.success && res.data) {
        const updatedMsg = res.data;
        const pinnedForMe =
          typeof res.isPinnedForMe === "boolean"
            ? res.isPinnedForMe
            : Boolean(updatedMsg.isPinned);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === updatedMsg._id
              ? {
                  ...m,
                  isPinned: pinnedForMe,
                  pinnedBy: updatedMsg.pinnedBy,
                  pinnedAt: updatedMsg.pinnedAt,
                }
              : m,
          ),
        );
        toast.success(
          res.message ||
            (pinnedForMe ? "Message pinned" : "Message unpinned"),
        );
      }
    } catch (err) {
      console.error("Pin message error:", err);
      toast.error(err.response?.data?.message || "Failed to pin message");
    }
  };

  const handleDownloadMedia = async (
    mediaUrl,
    defaultFileName = "chat_media",
  ) => {
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
      elem.classList.add(
        "ring-2",
        "ring-brand-orange",
        "rounded-2xl",
        "transition-all",
      );
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
    if (
      !activeConv ||
      !window.confirm(
        "Are you sure you want to clear this conversation history?",
      )
    )
      return;
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

    if (
      !window.confirm(`Are you sure you want to ${actionText} ${partnerName}?`)
    )
      return;

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
            : null,
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
            : null,
        );
      }
      loadConversations();
    } catch (err) {
      toast.error(
        err.response?.data?.message || `Failed to ${actionText} user`,
      );
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

  const filteredFollowsList =
    followsTab === "all"
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

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Offline";
    const d = new Date(dateStr);
    return `Last seen at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const filteredConvs = conversations.filter(
    (c) =>
      c.partner?.name?.toLowerCase().includes(convSearch.toLowerCase()) ||
      c.partner?.username?.toLowerCase().includes(convSearch.toLowerCase()),
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
            <h2 className="font-extrabold text-lg text-gray-800 dark:text-white">
              Chats
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleOpenFollowsModal("followers")}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition shadow-sm"
              title="Followers & Following List"
            >
              <FaUsers className="text-brand-orange text-lg" />
            </button>
            <button
              onClick={() => setShowCallHistoryModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition shadow-sm"
              title="View Call History"
            >
              <FaHistory className="text-brand-orange text-lg" />
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
              {pinnedConvs.map((conv, index) => {
                const activeDecryptedLast =
                  isSameId(activeConv?._id, conv._id) &&
                  messages.length > 0 &&
                  messages[messages.length - 1].isDecrypted &&
                  !messages[messages.length - 1].isDecryptionFailed
                    ? messages[messages.length - 1].text
                    : null;
                const preview = activeDecryptedLast || decryptedLastMessages[conv._id];
                return (
                  <ConversationItem
                    key={
                      conv._id ? `pinned-${conv._id}-${index}` : `pinned-${index}`
                    }
                    conv={conv}
                    decryptedPreview={preview}
                    isActive={activeConv?._id === conv._id}
                    isTyping={!!typingConversations[conv._id]}
                    onClick={() => setActiveConv(conv)}
                  />
                );
              })}
            </div>
          )}

          <div className="py-2">
            {pinnedConvs.length > 0 && unpinnedConvs.length > 0 && (
              <span className="px-4 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase block mb-1">
                All Messages
              </span>
            )}
            {unpinnedConvs.length > 0 ? (
              unpinnedConvs.map((conv, index) => {
                const activeDecryptedLast =
                  isSameId(activeConv?._id, conv._id) &&
                  messages.length > 0 &&
                  messages[messages.length - 1].isDecrypted &&
                  !messages[messages.length - 1].isDecryptionFailed
                    ? messages[messages.length - 1].text
                    : null;
                const preview = activeDecryptedLast || decryptedLastMessages[conv._id];
                return (
                  <ConversationItem
                    key={conv._id ? `all-${conv._id}-${index}` : `all-${index}`}
                    conv={conv}
                    decryptedPreview={preview}
                    isActive={activeConv?._id === conv._id}
                    isTyping={!!typingConversations[conv._id]}
                    onClick={() => setActiveConv(conv)}
                  />
                );
              })
            ) : pinnedConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-gray-400 font-medium">
                  No conversations yet
                </p>
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
                          handlePin();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-brand-orange rounded-xl transition"
                      >
                        <FaThumbtack
                          className={`text-gray-400 text-sm ${activeConv.isPinned ? "rotate-45 text-brand-orange" : ""}`}
                        />
                        <span>
                          {activeConv.isPinned ? "Unpin Chat" : "Pin Chat"}
                        </span>
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
                  onClick={() =>
                    scrollToMessage(pinnedMessagesList[currentPinnedIndex]._id)
                  }
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
                      {pinnedMessagesList[currentPinnedIndex]?.messageType ===
                      "image"
                        ? "Image attachment"
                        : pinnedMessagesList[currentPinnedIndex]
                              ?.messageType === "video"
                          ? "Video attachment"
                          : pinnedMessagesList[currentPinnedIndex]
                                ?.messageType === "audio"
                            ? "Voice message"
                            : pinnedMessagesList[currentPinnedIndex]?.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {pinnedMessagesList.length > 1 && (
                    <button
                      onClick={() =>
                        setCurrentPinnedIndex(
                          (prev) => (prev + 1) % pinnedMessagesList.length,
                        )
                      }
                      className="px-2 py-1 bg-amber-200/80 dark:bg-amber-900/80 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-lg text-[10px] font-extrabold transition"
                    >
                      Next
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleTogglePin(
                        pinnedMessagesList[currentPinnedIndex]._id,
                      )
                    }
                    className="p-1.5 text-amber-700 dark:text-amber-400 hover:text-red-600 rounded-lg transition"
                    title="Unpin message"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div
              ref={messagesContainerRef}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                const distanceToBottom = scrollHeight - scrollTop - clientHeight;
                setShowScrollBottom(distanceToBottom > 150);
              }}
              className="flex-1 overflow-y-auto p-4 chat-scroll space-y-4 relative"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length > 0 ? (
                (() => {
                  const uniqueMsgs = Array.from(
                    new Map(
                      messages.map((m) => [
                        (m._id || m.id)?.toString() || Math.random(),
                        m,
                      ]),
                    ).values(),
                  );

                  return uniqueMsgs.map((msg, index) => {
                    const isMe =
                      msg.sender?._id?.toString() === currentUserId.toString();
                    const msgDateStr = msg.createdAt
                      ? new Date(msg.createdAt).toDateString()
                      : "";
                    const prevMsg = index > 0 ? uniqueMsgs[index - 1] : null;
                    const prevMsgDateStr = prevMsg?.createdAt
                      ? new Date(prevMsg.createdAt).toDateString()
                      : "";
                    const showDateDivider =
                      index === 0 ||
                      (msgDateStr && msgDateStr !== prevMsgDateStr);

                    return (
                      <div key={msg._id ? `${msg._id}-${index}` : index}>
                        {showDateDivider && msg.createdAt && (
                          <div className="flex justify-center my-3 sticky top-1 z-10 pointer-events-none">
                            <span className="bg-gray-200/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-xs border border-gray-200/50 dark:border-gray-700/50 uppercase tracking-wider backdrop-blur-xs">
                              {getChatDateDivider(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <MessageBubble
                          msg={msg}
                          isMe={isMe}
                          isPinned={isPinnedForMe(msg)}
                          index={index}
                          onReply={(m) => setReplyingTo(m)}
                          onForward={(m) => setForwardingMsg(m)}
                          onReaction={(id, emoji) => handleReaction(id, emoji)}
                          onPin={(id) => handleTogglePin(id)}
                          onDownloadMedia={(url, filename) =>
                            handleDownloadMedia(url, filename)
                          }
                          onEdit={(m) => {
                            if (
                              m.createdAt &&
                              Date.now() - new Date(m.createdAt).getTime() >
                                60 * 60 * 1000
                            ) {
                              toast.error(
                                "Messages older than 1 hour cannot be edited",
                              );
                              return;
                            }
                            setEditingMsg(m);
                            setMessageText(m.text);
                          }}
                          onUnsend={(id) => handleUnsend(id)}
                          onDelete={(id) => handleDeleteForMe(id)}
                          onImageClick={(url) => setFullViewImage(url)}
                          onVideoClick={(url) => setFullViewVideo(url)}
                          activeMenuId={activeActionMenuId}
                          setActiveMenuId={setActiveActionMenuId}
                          showMoreEmojisMsgId={showMoreEmojisMsgId}
                          setShowMoreEmojisMsgId={setShowMoreEmojisMsgId}
                        />
                      </div>
                    );
                  });
                })()
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

            {/* Floating Scroll to Bottom Button */}
            {showScrollBottom && (
              <button
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                  setShowScrollBottom(false);
                }}
                className="absolute right-4 sm:right-6 bottom-20 sm:bottom-24 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 shadow-xl flex items-center justify-center hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-brand-orange hover:scale-110 active:scale-95 transition-all duration-200 animate-fade-in group cursor-pointer"
                title="Scroll to bottom"
                aria-label="Scroll to bottom"
              >
                <FaChevronDown className="text-xs sm:text-sm text-brand-orange group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}

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
                      <span className="font-bold text-brand-orange block">
                        Editing Message
                      </span>
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
                  <span>
                    You have blocked this user. Unblock to send messages.
                  </span>
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
                <span>
                  You cannot send messages to this conversation because you have
                  been blocked.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative z-20 flex-shrink-0">
                {/* Backdrop to dismiss dropups when touching background */}
                {(showMobileDropup || showEmojiPicker || showGifPicker) && (
                  <div
                    className="fixed inset-0 z-30 bg-transparent"
                    onClick={() => {
                      setShowMobileDropup(false);
                      setShowEmojiPicker(false);
                      setShowGifPicker(false);
                    }}
                    onTouchStart={() => {
                      setShowMobileDropup(false);
                      setShowEmojiPicker(false);
                      setShowGifPicker(false);
                    }}
                  />
                )}

                {/* Emoji Picker Popover (Desktop) */}
                {showEmojiPicker && window.innerWidth >= 640 && (
                  <div className="absolute bottom-16 left-4 z-50 shadow-2xl emoji-picker-container">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setMessageText((prev) => prev + emojiData.emoji);
                      }}
                    />
                  </div>
                )}

                {/* Enhanced GIF Picker Popover */}
                {showGifPicker && (
                  <div className="absolute bottom-16 left-2 sm:left-12 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 sm:p-4 rounded-3xl shadow-2xl w-[92vw] sm:w-96 gif-picker-container animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-brand-orange text-white text-[10px] font-black px-2 py-0.5 rounded-md">GIF</span>
                        <span className="font-extrabold text-xs text-gray-800 dark:text-white">
                          Select a GIF
                        </span>
                      </div>
                      <button
                        onClick={() => setShowGifPicker(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>

                    {/* Search GIFs Bar */}
                    <div className="relative mb-2.5">
                      <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-[11px]" />
                      <input
                        type="text"
                        placeholder="Search GIFs (e.g. happy, laugh, dance)..."
                        value={gifSearchQuery}
                        onChange={(e) => setGifSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 custom-scrollbar no-scrollbar">
                      {GIF_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setGifCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition ${
                            gifCategory === cat
                              ? "bg-brand-orange text-white shadow-xs"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* GIFs Grid List */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-0.5">
                      {(() => {
                        const filtered = CHAT_GIFS.filter((g) => {
                          const matchCat = gifCategory === "All" || g.category.toLowerCase() === gifCategory.toLowerCase();
                          const matchSearch =
                            !gifSearchQuery ||
                            g.title.toLowerCase().includes(gifSearchQuery.toLowerCase()) ||
                            g.category.toLowerCase().includes(gifSearchQuery.toLowerCase());
                          return matchCat && matchSearch;
                        });

                        return filtered.length > 0 ? (
                          filtered.map((gif) => (
                            <div
                              key={gif.id}
                              onClick={() => handleSendGif(gif.url)}
                              className="group relative h-24 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer border border-transparent hover:border-brand-orange hover:shadow-md transition-all duration-200"
                              title={gif.title}
                            >
                              <img
                                src={gif.url}
                                alt={gif.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[9px] text-white font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {gif.title}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-8 text-center text-xs text-gray-400 font-medium">
                            No GIFs found for "{gifSearchQuery || gifCategory}"
                          </div>
                        );
                      })()}
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
                  <div className="sm:hidden relative mobile-dropup-container">
                    <button
                      type="button"
                      onClick={() => setShowMobileDropup(!showMobileDropup)}
                      className="p-2 text-gray-500 hover:text-brand-orange text-base transition shrink-0"
                      title="Add Attachment"
                    >
                      <FaPlus
                        className={`transition-transform duration-200 ${showMobileDropup ? "rotate-45 text-brand-orange" : ""}`}
                      />
                    </button>

                    {/* MOBILE DROP-UP POPOVER MENU (< sm screens) */}
                    {showMobileDropup && (
                      <div className="absolute bottom-12 left-0 z-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-3 flex gap-4 items-center animate-pop-in">
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
                      </div>
                    )}
                  </div>

                  {/* DESKTOP INLINE ACTION BUTTONS (>= sm screens) */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <div className="relative emoji-picker-container">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-500 hover:text-brand-orange text-lg transition"
                      >
                        <FaSmile />
                      </button>
                    </div>

                    <div className="relative gif-picker-container">
                      <button
                        type="button"
                        onClick={() => setShowGifPicker(!showGifPicker)}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 text-gray-600 dark:text-gray-300 text-xs font-black rounded-lg transition"
                      >
                        GIF
                      </button>
                    </div>

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
              Choose an existing chat from the left sidebar or start a new
              conversation to begin messaging.
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

      {/* Full Video Viewer Modal */}
      {fullViewVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setFullViewVideo(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullViewVideo(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-2xl p-2 transition bg-white/10 hover:bg-white/20 rounded-full cursor-pointer"
              title="Close"
            >
              <FaTimes />
            </button>
            <video
              src={fullViewVideo}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl bg-black border border-white/10"
            />
            <div className="mt-4 flex items-center gap-3">
              {/* <button
                onClick={() => handleDownloadMedia(fullViewVideo, "chat_video.mp4")}
                className="px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <FaDownload /> Download Video
              </button> */}
            </div>
          </div>
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
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
                  followsTab === "followers"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => handleSwitchFollowsTab("following")}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
                  followsTab === "following"
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Following
              </button>
              <button
                onClick={() => handleSwitchFollowsTab("all")}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
                  followsTab === "all"
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

// Helper to get initials for avatar
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "bg-[#fedacb] text-[#c54924]",
    "bg-[#fde2e4] text-[#d63384]",
    "bg-[#e2ece9] text-[#198754]",
    "bg-[#dbeafe] text-[#1d4ed8]",
    "bg-[#ede9fe] text-[#6d28d9]",
    "bg-[#fef3c7] text-[#b45309]",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Sub-component: Conversation List Item
const ConversationItem = ({ conv, decryptedPreview, isActive, isTyping, onClick }) => {
  const partner = conv.partner;
  const lastMsg = conv.lastMessage;
  const unreadCount = Number(conv.unreadCount || 0);
  const hasCustomImage = partner?.profileImage && 
    partner.profileImage !== "/logo192.png" && 
    !partner.profileImage.includes("default") &&
    !partner.profileImage.includes("placeholder");

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 mx-2 rounded-2xl cursor-pointer transition relative ${
        isActive
          ? "bg-brand-orange/10 dark:bg-brand-orange/20 border border-brand-orange/20"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
      }`}
    >
      <div className="relative flex-shrink-0">
        {hasCustomImage ? (
          <img
            src={partner.profileImage}
            alt={partner?.name}
            className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm select-none border border-black/5 dark:border-white/5 ${getAvatarColor(
              partner?.name
            )}`}
          >
            {getInitials(partner?.name)}
          </div>
        )}
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
            {conv.isPinned && (
              <FaThumbtack className="text-[10px] text-brand-orange shrink-0 rotate-45" title="Pinned" />
            )}
            {conv.isBlockedByMe && (
              <span className="bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 border border-red-200 dark:border-red-800">
                <FaBan className="text-[8px]" /> Blocked
              </span>
            )}
          </div>
          {conv.lastMessageAt && (
            <span
              className={`text-[10px] shrink-0 ${
                unreadCount > 0
                  ? "text-[#25D366] font-bold"
                  : "text-gray-400 font-semibold"
              }`}
            >
              {formatWhatsAppTimestamp(conv.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center gap-2">
          <p
            className={`text-[11px] truncate flex-1 min-w-0 ${
              unreadCount > 0
                ? "font-bold text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isTyping ? (
              <span className="text-brand-orange font-bold animate-pulse">
                typing...
              </span>
            ) : lastMsg ? (
              lastMsg.isUnsent ? (
                <span className="italic">Message unsent</span>
              ) : lastMsg.isEncrypted ? (
                decryptedPreview && !decryptedPreview.startsWith("🔒") ? (
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300 truncate">
                    <FaLock className="text-[9px] text-emerald-500 shrink-0" />
                    <span className="truncate">{decryptedPreview}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <FaLock className="text-[9px]" /> Encrypted Message
                  </span>
                )
              ) : lastMsg.messageType === "reel" || lastMsg.mediaMeta?.isReelShare || (typeof lastMsg.text === "string" && lastMsg.text.includes("/reels/")) ? (
                <span>🎬 Reel: {lastMsg.mediaMeta?.title || lastMsg.mediaMeta?.caption || (lastMsg.text ? lastMsg.text.replace(/https?:\/\/[^\s]+/g, "").replace(/^🎬\s*/, "").trim() : "") || "Watch Reel"}</span>
              ) : (
                lastMsg.text || `[${lastMsg.messageType}]`
              )
            ) : (
              "No messages yet"
            )}
          </p>

          {/* WhatsApp-Style Green Notification Count Badge */}
          {unreadCount > 0 && (
            <span className="bg-[#25D366] text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center text-center shadow-xs shrink-0">
              {unreadCount > 99 ? "99+" : unreadCount}
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
  isPinned = false,
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
  onVideoClick,
  activeMenuId,
  setActiveMenuId,
  showMoreEmojisMsgId,
  setShowMoreEmojisMsgId,
}) => {
  const isMenuOpen = activeMenuId === msg._id;
  const pinned = typeof isPinned === "boolean" ? isPinned : Boolean(msg.isPinned);
  const openDownwards = index < 2;
  const isWithin1Hour =
    !msg.createdAt ||
    Date.now() - new Date(msg.createdAt).getTime() <= 60 * 60 * 1000;

  const navigate = useNavigate();

  const isReel =
    msg.messageType === "reel" ||
    Boolean(msg.mediaMeta?.isReelShare) ||
    (typeof msg.text === "string" && msg.text.includes("/reels/"));

  let reelId = msg.mediaMeta?.reelId;
  let reelTitle = msg.mediaMeta?.title || msg.mediaMeta?.caption;
  let reelThumb = msg.mediaUrl || msg.mediaMeta?.thumbnailUrl;
  let reelCreator = msg.mediaMeta?.creatorName;
  let reelCreatorAvatar = msg.mediaMeta?.creatorImage;

  if (!reelId && typeof msg.text === "string") {
    const match = msg.text.match(/\/reels\/([a-zA-Z0-9_-]+)/);
    if (match) {
      reelId = match[1];
    }
    if (!reelTitle) {
      reelTitle = msg.text
        .replace(/https?:\/\/[^\s]+/g, "")
        .replace(/^🎬\s*/, "")
        .trim();
    }
  }

  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isLongPressTriggeredRef = useRef(false);

  const startLongPress = (clientX, clientY) => {
    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: clientX, y: clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setActiveMenuId(msg._id);
      if (setShowMoreEmojisMsgId) setShowMoreEmojisMsgId(null);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      startLongPress(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0] && longPressTimerRef.current) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    }
  };

  const handleMouseDown = (e) => {
    // Only left-click triggers long-press timer
    if (e.button === 0) {
      startLongPress(e.clientX, e.clientY);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setActiveMenuId(msg._id);
    if (setShowMoreEmojisMsgId) setShowMoreEmojisMsgId(null);
  };

  return (
    <div
      id={`msg-${msg._id}`}
      className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative mb-2 transition-all duration-300`}
    >
      {/* Quoted Parent Reply Snippet */}
      {msg.replyTo && (
        <div className="mb-1 text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl border-l-4 border-brand-orange max-w-xs truncate shadow-xs">
          <span className="font-bold text-brand-orange block">
            {msg.replyTo.sender?.name || "User"}:
          </span>
          {msg.replyTo.text ||
            (msg.replyTo.messageType === "image"
              ? "📷 Image Attachment"
              : msg.replyTo.messageType === "video"
                ? "🎥 Video Attachment"
                : msg.replyTo.messageType === "audio"
                  ? "🎵 Voice Message"
                  : msg.replyTo.messageType === "gif"
                    ? "🖼️ GIF"
                    : "Media Attachment")}
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
                      setShowMoreEmojisMsgId(
                        showMoreEmojisMsgId === msg._id ? null : msg._id,
                      );
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
                        if (setShowMoreEmojisMsgId)
                          setShowMoreEmojisMsgId(null);
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
                    pinned
                      ? "text-brand-orange font-bold hover:bg-orange-50 dark:hover:bg-gray-800"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <FaThumbtack
                    className={
                      pinned ? "text-brand-orange rotate-45" : ""
                    }
                  />
                  {pinned ? "Unpin Message" : "Pin Message"}
                </button>
              )}

              {/* Download Image / Video / Attachment (Hidden for Reels) */}
              {msg.mediaUrl && !msg.isUnsent && !isReel && msg.messageType !== "reel" && (
                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onDownloadMedia(
                      msg.mediaUrl,
                      `${msg.messageType || "media"}_${msg._id}`,
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
              {isMe && !msg.isUnsent && msg.messageType === "text" && isWithin1Hour && (
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onMouseDown={handleMouseDown}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onContextMenu={handleContextMenu}
          className={`p-3 text-xs shadow-sm relative transition-all duration-200 select-none cursor-pointer ${
            isMenuOpen ? "ring-2 ring-brand-orange/60 scale-[1.01]" : ""
          } ${
            msg.isUnsent
              ? "bg-gray-200 dark:bg-gray-800 text-gray-500 italic rounded-2xl"
              : isMe
                ? "chat-bubble-sent"
                : "chat-bubble-received"
          }`}
        >
          {/* Pinned Badge on Top Right of Bubble */}
          {pinned && !msg.isUnsent && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-2 py-0.5 rounded-full mb-1.5 w-fit border border-amber-200/50">
              <FaThumbtack className="text-[9px] text-brand-orange" /> Pinned
              Message
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
          ) : isReel ? (
            /* Reel Card Preview */
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (reelId) {
                  navigate(`/reels/${reelId}`);
                }
              }}
              className="w-56 sm:w-64 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl cursor-pointer group/reel transition-all hover:scale-[1.02] active:scale-[0.98] my-1"
            >
              {/* Reel Thumbnail Card */}
              <div className="relative w-full h-72 sm:h-80 bg-zinc-950 flex items-center justify-center overflow-hidden">
                {reelThumb ? (
                  <img
                    src={reelThumb}
                    alt="Reel preview"
                    className="w-full h-full object-cover group-hover/reel:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-600">
                    <FaPlay className="text-3xl text-zinc-700" />
                  </div>
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/20" />

                {/* Top Left Badge: "▶ Reel" */}
                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-white border border-white/15 shadow-sm">
                  <FaPlay className="text-[8px] text-brand-orange" />
                  <span>Reel</span>
                </div>

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-12 h-12 rounded-full bg-brand-orange/95 text-white flex items-center justify-center text-sm shadow-2xl group-hover/reel:scale-110 active:scale-95 transition-transform">
                    <FaPlay className="ml-0.5 text-white" />
                  </div>
                </div>

                {/* Bottom Info: Creator, Caption & Watch Button */}
                <div className="absolute bottom-0 inset-x-0 p-3 z-10 text-white flex flex-col gap-1 text-left">
                  {reelCreator && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {reelCreatorAvatar ? (
                        <img
                          src={reelCreatorAvatar}
                          alt={reelCreator}
                          className="w-5 h-5 rounded-full object-cover border border-white/40"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-brand-orange text-white text-[9px] font-bold flex items-center justify-center">
                          {reelCreator[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] font-extrabold text-white truncate shadow-xs">
                        {reelCreator}
                      </span>
                    </div>
                  )}

                  {reelTitle && (
                    <p className="text-xs font-semibold text-white/95 line-clamp-2 leading-snug drop-shadow-md">
                      {reelTitle}
                    </p>
                  )}

                  <div className="mt-1 flex items-center justify-between pt-1.5 border-t border-white/15 text-[10px] text-brand-orange font-black">
                    <span>Watch Reel</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {msg.messageType === "text" && (
                <p className="whitespace-pre-wrap">
                  {(msg.isEncrypted && !msg.isDecrypted) ||
                  msg.isLegacyUnavailable ||
                  msg.isDecryptionFailed ? (
                    <span className="flex items-center gap-1.5 opacity-80 italic font-medium text-xs">
                      <FaLock className="text-[10px] shrink-0" />{" "}
                      <span>Message unavailable on this device</span>
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
                <div
                  onClick={() => onVideoClick && onVideoClick(msg.mediaUrl)}
                  className="relative group/video cursor-pointer my-1 rounded-xl overflow-hidden max-w-full sm:max-w-xs max-h-52 bg-black flex items-center justify-center shadow-xs"
                >
                  <video
                    src={msg.mediaUrl}
                    className="rounded-xl w-full max-w-full sm:max-w-xs max-h-52 object-cover pointer-events-none"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 bg-black/35 hover:bg-black/15 flex items-center justify-center transition backdrop-blur-[1px]">
                    <div className="w-11 h-11 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm shadow-xl hover:scale-110 active:scale-95 transition">
                      <FaPlay className="ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {msg.messageType === "audio" && (
                <audio
                  src={msg.mediaUrl}
                  controls
                  className="my-1 w-full max-w-full sm:max-w-xs"
                />
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
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? "text-white/80" : "text-gray-400"}`}
          >
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
