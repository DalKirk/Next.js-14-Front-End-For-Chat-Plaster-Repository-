'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Paperclip, Smile, Phone, Video, MoreVertical, 
  ArrowLeft, Plus, MessageCircle, Check, CheckCheck 
} from 'lucide-react';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { User } from '@/lib/types';
import UserSearchModal from './UserSearchModal';
import { dmSocketManager } from '@/lib/dmSocket';

export interface DMContact {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_urls?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
  unread: number;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username?: string;
  sender_avatar?: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  read: boolean;
  from: 'me' | 'them';
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: DMMessage;
  unreadCount: number;
}

interface InitialRecipient {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_urls?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}

interface DMSectionProps {
  currentUser: User;
  onUnreadCountChange?: (count: number) => void;
  initialRecipient?: InitialRecipient;
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-500',
};

// Storage key helper - consistent conversation ID
const getConversationKey = (userId1: string, userId2: string) => {
  return [userId1, userId2].sort().join('-');
};

// LocalStorage helper for DM messages
const StorageManager = {
  getMessages: (userId: string, otherUserId: string): DMMessage[] => {
    try {
      const key = `dm-messages-${getConversationKey(userId, otherUserId)}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveMessage: (userId: string, message: DMMessage) => {
    try {
      const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
      const key = `dm-messages-${getConversationKey(userId, otherUserId)}`;
      const messages = StorageManager.getMessages(userId, otherUserId);
      
      // Avoid duplicates
      if (!messages.find(m => m.id === message.id)) {
        messages.push(message);
        // Keep only last 200 messages per conversation
        const trimmed = messages.slice(-200);
        localStorage.setItem(key, JSON.stringify(trimmed));
      }
    } catch (e) {
      console.warn('Failed to save message to localStorage:', e);
    }
  },
  
  getContacts: (userId: string): DMContact[] => {
    try {
      const key = `dm-contacts-${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  saveContact: (userId: string, contact: DMContact) => {
    try {
      const key = `dm-contacts-${userId}`;
      const contacts = StorageManager.getContacts(userId);
      const idx = contacts.findIndex(c => c.id === contact.id);
      if (idx >= 0) {
        contacts[idx] = { ...contacts[idx], ...contact };
      } else {
        contacts.unshift(contact);
      }
      localStorage.setItem(key, JSON.stringify(contacts.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save contact to localStorage:', e);
    }
  },
};

export default function DMSection({ currentUser, onUnreadCountChange, initialRecipient }: DMSectionProps) {
  const [contacts, setContacts] = useState<DMContact[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, DMMessage[]>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialRecipientHandled = useRef(false);

  // Connect to DM WebSocket and load from localStorage
  useEffect(() => {
    // Load contacts and messages from localStorage
    const savedContacts = StorageManager.getContacts(currentUser.id);
    setContacts(savedContacts);
    
    // Load messages for each contact
    const messagesMap: Record<string, DMMessage[]> = {};
    savedContacts.forEach(contact => {
      const msgs = StorageManager.getMessages(currentUser.id, contact.id);
      messagesMap[contact.id] = msgs.map(m => ({
        ...m,
        // Ensure timestamp exists (fallback for old messages)
        timestamp: m.timestamp || new Date().toISOString(),
        from: m.sender_id === currentUser.id ? 'me' : 'them',
      }));
    });
    setMessages(messagesMap);
    setIsLoading(false);

    // Try to connect to WebSocket for real-time updates (gracefully fails if endpoint doesn't exist)
    try {
      dmSocketManager.connect(
        currentUser.id, 
        currentUser.username, 
        currentUser.avatar_url || currentUser.avatar_urls?.medium
      );

      dmSocketManager.onConnect((connected) => {
        console.log('[DM] WebSocket connected:', connected);
        setWsConnected(connected);
      });

      dmSocketManager.onMessage((incomingMessage: any) => {
        console.log('[DM] Received message via WebSocket:', incomingMessage);
        
        // Validate message has required fields
        if (!incomingMessage.sender_id || !incomingMessage.receiver_id || !incomingMessage.content) {
          console.log('[DM] Ignoring invalid message - missing required fields');
          return;
        }
        
        // Determine the other user in this conversation
        const isMyMessage = incomingMessage.sender_id === currentUser.id;
        const otherUserId = isMyMessage ? incomingMessage.receiver_id : incomingMessage.sender_id;
        
        const dmMessage: DMMessage = {
          id: incomingMessage.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: getConversationKey(currentUser.id, otherUserId),
          sender_id: incomingMessage.sender_id,
          sender_username: incomingMessage.sender_username,
          sender_avatar: incomingMessage.sender_avatar,
          receiver_id: incomingMessage.receiver_id,
          content: incomingMessage.content,
          timestamp: incomingMessage.timestamp || new Date().toISOString(),
          read: false,
          from: isMyMessage ? 'me' : 'them',
        };

        // Save to localStorage
        StorageManager.saveMessage(currentUser.id, dmMessage);

        // Update UI
        setMessages(prev => {
          const convMessages = prev[otherUserId] || [];
          // Avoid duplicates
          if (convMessages.find(m => m.id === dmMessage.id)) {
            return prev;
          }
          return {
            ...prev,
            [otherUserId]: [...convMessages, dmMessage],
          };
        });

        // If it's from someone else, update/create contact
        if (!isMyMessage) {
          setContacts(prev => {
            const existing = prev.find(c => c.id === otherUserId);
            if (existing) {
              // Update existing contact with latest info from message
              const updatedContact = {
                ...existing,
                username: incomingMessage.sender_username || existing.username,
                avatar_url: incomingMessage.sender_avatar || existing.avatar_url,
                unread: existing.unread + 1,
                status: 'online' as const,
              };
              StorageManager.saveContact(currentUser.id, updatedContact);
              return prev.map(c => c.id === otherUserId ? updatedContact : c);
            } else {
              // Create new contact from message
              const newContact: DMContact = {
                id: otherUserId,
                username: incomingMessage.sender_username || 'User',
                avatar_url: incomingMessage.sender_avatar,
                status: 'online',
                unread: 1,
              };
              StorageManager.saveContact(currentUser.id, newContact);
              return [newContact, ...prev];
            }
          });
        }
      });

      dmSocketManager.onError((error) => {
        console.warn('[DM] WebSocket not available (this is okay - using localStorage):', error.message);
      });
    } catch (e) {
      console.log('[DM] WebSocket not supported - using localStorage only');
    }

    return () => {
      try {
        dmSocketManager.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    };
  }, [currentUser.id, currentUser.username, currentUser.avatar_url, currentUser.avatar_urls]);

  // Handle initial recipient (when coming from profile page)
  useEffect(() => {
    if (initialRecipient && !isLoading && !initialRecipientHandled.current) {
      initialRecipientHandled.current = true;
      startNewConversation(
        initialRecipient.id,
        initialRecipient.username,
        initialRecipient.avatar_url,
        initialRecipient.avatar_urls
      );
    }
  }, [initialRecipient, isLoading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversation]);

  // Notify parent of unread count changes
  useEffect(() => {
    const totalUnread = contacts.reduce((sum, c) => sum + c.unread, 0);
    onUnreadCountChange?.(totalUnread);
  }, [contacts, onUnreadCountChange]);

  // Send message - using WebSocket with localStorage as storage
  const handleSend = () => {
    const messageText = inputText.trim();
    console.log('[DM] handleSend called:', { messageText, activeConversation, inputText });
    
    if (!messageText || !activeConversation) {
      console.log('[DM] Send blocked - empty text or no conversation:', { messageText: !!messageText, activeConversation });
      return;
    }

    const activeContact = contacts.find(c => c.id === activeConversation);
    console.log('[DM] Active contact:', activeContact);
    
    if (!activeContact) {
      console.log('[DM] No active contact found for:', activeConversation);
      return;
    }

    const newMessage: DMMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: getConversationKey(currentUser.id, activeContact.id),
      sender_id: currentUser.id,
      sender_username: currentUser.username,
      sender_avatar: currentUser.avatar_url || currentUser.avatar_urls?.medium,
      receiver_id: activeContact.id,
      content: messageText,
      timestamp: new Date().toISOString(),
      read: false,
      from: 'me',
    };

    console.log('[DM] Creating message:', newMessage);

    // Clear input immediately
    setInputText('');

    // Optimistically add message to UI
    setMessages(prev => {
      const updated = {
        ...prev,
        [activeConversation]: [...(prev[activeConversation] || []), newMessage],
      };
      console.log('[DM] Updated messages state');
      return updated;
    });

    // Save contact and message to localStorage (ensures persistence)
    StorageManager.saveContact(currentUser.id, activeContact);
    StorageManager.saveMessage(currentUser.id, newMessage);
    console.log('[DM] Saved to localStorage');

    // Try to send via WebSocket (for real-time delivery to other user)
    if (wsConnected && dmSocketManager.isConnected()) {
      const sent = dmSocketManager.sendMessage(
        activeContact.id,
        messageText,
        currentUser.avatar_url || currentUser.avatar_urls?.medium
      );
      if (sent) {
        console.log('[DM] 📤 Message sent via WebSocket');
      }
    } else {
      console.log('[DM] ⚠️ WebSocket not connected, message saved to localStorage only');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectConversation = (contactId: string) => {
    setActiveConversation(contactId);
    setShowMobileList(false);
    
    // Mark messages as read
    setContacts(prev =>
      prev.map(c => (c.id === contactId ? { ...c, unread: 0 } : c))
    );
    
    // Notify sender that messages were read via WebSocket
    if (wsConnected) {
      dmSocketManager.markAsRead(contactId);
    }
  };

  const startNewConversation = (userId: string, username: string, avatarUrl?: string, avatarUrls?: { thumbnail?: string; small?: string; medium?: string; large?: string }) => {
    // Check if conversation already exists
    const existing = contacts.find(c => c.id === userId);
    if (existing) {
      selectConversation(userId);
      return;
    }

    // Create new contact/conversation
    const newContact: DMContact = {
      id: userId,
      username,
      avatar_url: avatarUrl,
      avatar_urls: avatarUrls,
      status: 'offline',
      unread: 0,
    };

    // Save to localStorage
    StorageManager.saveContact(currentUser.id, newContact);
    
    setContacts(prev => [newContact, ...prev]);
    setMessages(prev => ({ ...prev, [userId]: [] }));
    selectConversation(userId);
  };

  // Handle user selection from search modal
  const handleUserSelect = (user: { id: string; username: string; avatar_url?: string; avatar_urls?: { thumbnail?: string; small?: string; medium?: string; large?: string } }) => {
    startNewConversation(user.id, user.username, user.avatar_url, user.avatar_urls);
  };

  const activeContact = contacts.find(c => c.id === activeConversation);
  const filteredContacts = contacts.filter(c =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const chatMessages = activeConversation ? (messages[activeConversation] || []) : [];

  const formatTime = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    // Handle various timestamp formats
    let date = new Date(timestamp);
    // Try removing trailing Z if there's already a timezone offset
    if (isNaN(date.getTime()) && timestamp.includes('+') && timestamp.endsWith('Z')) {
      date = new Date(timestamp.slice(0, -1));
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (timestamp: string | undefined) => {
    if (!timestamp) return 'Today';
    let date = new Date(timestamp);
    // Handle malformed timestamps like "2026-02-22T05:12:27.425338+00:00Z"
    if (isNaN(date.getTime()) && timestamp.includes('+') && timestamp.endsWith('Z')) {
      date = new Date(timestamp.slice(0, -1));
    }
    if (isNaN(date.getTime())) return 'Today';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (contactId: string) => {
    const contactMessages = messages[contactId] || [];
    if (contactMessages.length === 0) return 'No messages yet';
    const lastMsg = contactMessages[contactMessages.length - 1];
    if (!lastMsg || !lastMsg.content) return 'No messages yet';
    const prefix = lastMsg.from === 'me' ? 'You: ' : '';
    const content = lastMsg.content || '';
    const text = content.length > 30 
      ? content.substring(0, 30) + '...' 
      : content;
    return prefix + text;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleUserSelect}
        currentUserId={currentUser.id}
      />

      <div className="flex h-[600px] bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Sidebar - Contact List */}
        <div className={`w-full md:w-80 md:min-w-[320px] bg-slate-900/60 border-r border-slate-700/50 flex flex-col transition-transform duration-300 ${!showMobileList ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Messages</h2>
              <button 
                onClick={() => setShowUserSearch(true)}
                className="w-9 h-9 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
                title="New message"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-sm"
              />
            </div>
          </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
              <MessageCircle size={48} className="mb-3 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs text-slate-600 mt-1">Start a new message!</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const contactMsgs = messages[contact.id] || [];
              const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all ${
                    activeConversation === contact.id
                      ? 'bg-cyan-400/10 border-l-2 border-cyan-400'
                      : 'hover:bg-slate-800/50'
                  }`}
                  onClick={() => selectConversation(contact.id)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-600/50">
                      <ResponsiveAvatar
                        avatarUrls={contact.avatar_urls || (contact.avatar_url ? { thumbnail: contact.avatar_url, small: contact.avatar_url, medium: contact.avatar_url, large: contact.avatar_url } : undefined)}
                        username={contact.username}
                        size="small"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${statusColors[contact.status]}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm truncate">{contact.username}</span>
                      {lastMsg && lastMsg.timestamp && (
                        <span className="text-xs text-slate-500">{formatTime(lastMsg.timestamp)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {getLastMessagePreview(contact.id)}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  {contact.unread > 0 && (
                    <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{contact.unread}</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-950/40 ${showMobileList ? 'hidden md:flex' : 'flex'}`}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-700/50 bg-slate-900/60">
              <button 
                className="md:hidden w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                onClick={() => setShowMobileList(true)}
              >
                <ArrowLeft size={18} />
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-600/50">
                  <ResponsiveAvatar
                    avatarUrls={activeContact.avatar_urls || (activeContact.avatar_url ? { thumbnail: activeContact.avatar_url, small: activeContact.avatar_url, medium: activeContact.avatar_url, large: activeContact.avatar_url } : undefined)}
                    username={activeContact.username}
                    size="small"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColors[activeContact.status]}`} />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-white">{activeContact.username}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[activeContact.status]}`} />
                  {activeContact.status === 'online' ? 'Online' : `Last seen ${activeContact.lastSeen || 'recently'}`}
                </p>
              </div>

              <div className="flex gap-1">
                <button className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="Voice call">
                  <Phone size={18} />
                </button>
                <button className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="Video call">
                  <Video size={18} />
                </button>
                <button className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="More options">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageCircle size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs text-slate-600 mt-1">Say hello to {activeContact.username}!</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, i) => {
                    const showDate = i === 0 || formatDate(chatMessages[i - 1].timestamp) !== formatDate(msg.timestamp);
                    const isMe = msg.from === 'me';

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-slate-800/50 rounded-full text-xs text-slate-500 font-medium">
                              {formatDate(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                              isMe
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md'
                                : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-slate-600">{formatTime(msg.timestamp)}</span>
                            {isMe && (
                              msg.read 
                                ? <CheckCheck size={12} className="text-cyan-400" />
                                : <Check size={12} className="text-slate-600" />
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-900/60">
              <div className="flex items-end gap-2 bg-slate-800/80 border border-slate-700 rounded-xl p-2 focus-within:border-cyan-400/60 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all">
                <button className="w-9 h-9 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0" title="Attach file">
                  <Paperclip size={18} />
                </button>
                <textarea
                  rows={1}
                  placeholder={`Message ${activeContact.username}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none max-h-24 py-2"
                  style={{ minHeight: '36px' }}
                />
                <button className="w-9 h-9 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0" title="Add emoji">
                  <Smile size={18} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="w-9 h-9 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all flex-shrink-0"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageCircle size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm text-slate-600 mt-1">Choose from your existing conversations or start a new one</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Export helper for starting conversations from other components
export { DMSection };
