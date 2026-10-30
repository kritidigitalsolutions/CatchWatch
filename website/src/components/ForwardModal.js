import React, { useState, useEffect } from "react";
import { FaPaperPlane, FaTimes, FaSearch } from "react-icons/fa";
import { getConversations, sendMessage, saveE2EEIdentity, getE2EEBackup, getUserPublicKey } from "../api/chatApi";
import {
  initUserE2EE,
  importPublicKey,
  deriveSharedKey,
  encryptText,
  safeKeyDiagnostic,
  E2EE_DIAGNOSTIC,
} from "../utils/e2ee";
import { toast } from "react-toastify";

const ForwardModal = ({ isOpen, onClose, messageToForward }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [e2eeKeys, setE2eeKeys] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  useEffect(() => {
    if (isOpen) {
      fetchConvs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    initUserE2EE(currentUserId, saveE2EEIdentity, getE2EEBackup, getUserPublicKey).then((keys) => {
      if (keys) setE2eeKeys(keys);
    });
  }, [isOpen, currentUserId]);

  const fetchConvs = async () => {
    try {
      const res = await getConversations();
      if (res && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations for forwarding:", err);
    }
  };

  if (!isOpen || !messageToForward) return null;

  const ensureUserE2EE = async () => {
    if (e2eeKeys && !e2eeKeys.error && e2eeKeys.privateKey) {
      return e2eeKeys;
    }
    if (!currentUserId) return null;
    try {
      const keys = await initUserE2EE(currentUserId, saveE2EEIdentity, getE2EEBackup, getUserPublicKey);
      if (keys && !keys.error && keys.privateKey) {
        setE2eeKeys(keys);
        return keys;
      }
      return keys;
    } catch (err) {
      console.error("Error ensuring user E2EE keys in forward modal:", err);
      return null;
    }
  };

  const handleForward = async () => {
    if (!selectedRecipientId) {
      toast.warning("Please select a user to forward message");
      return;
    }
    setLoading(true);
    try {
      let text = messageToForward.text || "";
      let isEncrypted = false;
      let iv = "";
      let encryption = null;

      if (messageToForward.messageType === "text" && text) {
        const activeKeys = await ensureUserE2EE();
        if (!activeKeys || activeKeys.error || !activeKeys.privateKey) {
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_PRIVATE_KEY_MISSING, {
            senderId: currentUserId,
            currentDeviceId: activeKeys?.deviceId,
            currentKeyId: activeKeys?.keyId,
          });
          throw new Error("Device encryption key is missing or not initialized.");
        }

        const recipientKeyRes = await getUserPublicKey(selectedRecipientId);
        const recipientPubKeyStr =
          recipientKeyRes?.data?.publicKey ||
          recipientKeyRes?.data?.deviceKeys?.[0]?.publicKey;

        if (!recipientPubKeyStr) {
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_NOT_FOUND, {
            recipientId: selectedRecipientId,
            senderDeviceId: activeKeys.deviceId,
            senderKeyId: activeKeys.keyId,
          });
          throw new Error("Recipient does not have an active encryption key registered.");
        }

        const recipientPubKey = await importPublicKey(recipientPubKeyStr);
        const sharedKey = recipientPubKey
          ? await deriveSharedKey(activeKeys.privateKey, recipientPubKey)
          : null;

        if (!sharedKey) {
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_NOT_FOUND, {
            recipientId: selectedRecipientId,
          });
          throw new Error("Failed to derive encryption key for recipient.");
        }

        const encrypted = await encryptText(text, sharedKey);
        if (!encrypted?.ciphertext || !encrypted?.iv) {
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.ENCRYPT_FAILED, {
            recipientId: selectedRecipientId,
          });
          throw new Error("Failed to encrypt forwarded message.");
        }

        text = encrypted.ciphertext;
        iv = encrypted.iv;
        isEncrypted = true;
        encryption = {
          version: 2,
          senderDeviceId: activeKeys.deviceId,
          senderKeyId: activeKeys.keyId,
          senderPublicKey: activeKeys.publicKeyString,
          recipientDeviceId: recipientKeyRes?.data?.deviceId || "active_device",
          recipientKeyId: recipientKeyRes?.data?.keyId || "active_key",
          recipientPublicKey: recipientPubKeyStr,
          envelopes: [],
        };
      }

      await sendMessage({
        recipientId: selectedRecipientId,
        messageType: messageToForward.messageType,
        text,
        mediaUrl: messageToForward.mediaUrl,
        mediaMeta: messageToForward.mediaMeta,
        isEncrypted,
        iv,
        encryption,
        isForwarded: true,
      });
      toast.success("Message forwarded successfully!");
      onClose();
    } catch (err) {
      console.error("Forward message error:", err);
      toast.error(err.message || err.response?.data?.message || "Failed to forward message");
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter((c) =>
    c.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.partner?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-2">
            <FaPaperPlane className="text-brand-orange" /> Forward Message
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-bold text-brand-orange block mb-1">Preview:</span>
          {messageToForward.messageType === "text" && messageToForward.text}
          {messageToForward.messageType === "image" && "📷 Image attachment"}
          {messageToForward.messageType === "video" && "🎥 Video attachment"}
          {messageToForward.messageType === "audio" && "🎵 Voice message"}
          {messageToForward.messageType === "gif" && "🖼️ GIF attachment"}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search chat partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        </div>

        {/* List of Contacts */}
        <div className="max-h-60 overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((conv) => {
              const isSelected = selectedRecipientId === conv.partner?._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedRecipientId(conv.partner?._id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? "bg-brand-orange/10 border border-brand-orange/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <img
                    src={conv.partner?.profileImage || "/logo192.png"}
                    alt={conv.partner?.name}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-gray-800 dark:text-white truncate">
                      {conv.partner?.name || "User"}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {conv.partner?.username || ""}
                    </p>
                  </div>
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => setSelectedRecipientId(conv.partner?._id)}
                    className="accent-brand-orange"
                  />
                </div>
              );
            })
          ) : (
            <p className="text-center text-xs text-gray-400 py-6">No chats found</p>
          )}
        </div>

        {/* Action Button */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedRecipientId || loading}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-orange hover:bg-orange-600 rounded-xl disabled:opacity-50 transition shadow-md"
          >
            {loading ? "Sending..." : "Forward"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
