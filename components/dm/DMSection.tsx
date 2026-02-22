'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Paperclip, Smile, MoreVertical, 
  ArrowLeft, MessageCircle, Check, CheckCheck, Trash2, X 
} from 'lucide-react';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { User } from '@/lib/types';
import UserSearchModal from './UserSearchModal';
import { dmSocketManager } from '@/lib/dmSocket';
import { apiClient } from '@/lib/api';

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
  conversation_id?: string; // Backend's actual conversation UUID
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
  
  markMessagesAsRead: (userId: string, otherUserId: string) => {
    try {
      const key = `dm-messages-${getConversationKey(userId, otherUserId)}`;
      const messages = StorageManager.getMessages(userId, otherUserId);
      // Mark all messages from other user as read
      const updated = messages.map(m => 
        m.sender_id === otherUserId ? { ...m, read: true } : m
      );
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to mark messages as read in localStorage:', e);
    }
  },
  
  deleteMessage: (userId: string, otherUserId: string, messageId: string) => {
    try {
      const key = `dm-messages-${getConversationKey(userId, otherUserId)}`;
      const messages = StorageManager.getMessages(userId, otherUserId);
      const filtered = messages.filter(m => m.id !== messageId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete message from localStorage:', e);
    }
  },
  
  deleteConversation: (userId: string, otherUserId: string) => {
    try {
      // Delete messages
      const messagesKey = `dm-messages-${getConversationKey(userId, otherUserId)}`;
      localStorage.removeItem(messagesKey);
      
      // Delete contact
      const contactsKey = `dm-contacts-${userId}`;
      const contacts = StorageManager.getContacts(userId);
      const filtered = contacts.filter(c => c.id !== otherUserId);
      localStorage.setItem(contactsKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete conversation from localStorage:', e);
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
  const [showDeleteConversationModal, setShowDeleteConversationModal] = useState(false);
  const [deleteConversationTarget, setDeleteConversationTarget] = useState<DMContact | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
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

    // Sync with API to get accurate unread counts from server
    const syncWithAPI = async () => {
      try {
        console.log('[DM] Syncing with API for user:', currentUser.id);
        const data = await apiClient.getConversations(currentUser.id);
        console.log('[DM] API response:', data);
        
        if (data?.contacts && data.contacts.length > 0) {
          // Update contacts with server-side data: unread counts, conversation IDs, AND profile info
          setContacts(prev => {
            const updated = prev.map(contact => {
              const serverContact = data.contacts.find((c: any) => c.id === contact.id);
              // Also try to find the conversation to get the real conversation_id
              const conversation = data.conversations?.find((conv: any) => 
                conv.participants?.includes(contact.id) && conv.participants?.includes(currentUser.id)
              );
              
              if (serverContact) {
                const localContact = StorageManager.getContacts(currentUser.id).find(c => c.id === contact.id);
                const serverUnread = serverContact.unread ?? 0;
                const localUnread = localContact?.unread ?? contact.unread;
                
                console.log(`[DM] Contact ${contact.username}: server=${serverUnread}, local=${localUnread}, conv_id=${conversation?.id || serverContact.conversation_id || 'none'}`);
                
                // Use the LOWER of the two values (since reading can only decrease unread count)
                const finalUnread = Math.min(serverUnread, localUnread);
                const updatedContact = { 
                  ...contact, 
                  unread: finalUnread,
                  // Store the real backend conversation_id if available
                  conversation_id: conversation?.id || serverContact.conversation_id || contact.conversation_id,
                  // ALWAYS update username and avatar from server (they may have changed)
                  username: serverContact.username || contact.username,
                  avatar_url: serverContact.avatar_url || contact.avatar_url,
                  avatar_urls: serverContact.avatar_urls || contact.avatar_urls,
                };
                
                // Persist to localStorage
                StorageManager.saveContact(currentUser.id, updatedContact);
                return updatedContact;
              }
              return contact;
            });
            return updated;
          });
        } else {
          console.log('[DM] No contacts from API, keeping localStorage data');
        }
      } catch (e) {
        console.warn('[DM] Failed to sync conversations from API:', e);
        // On API failure, keep localStorage data (which has the read status)
      }
    };
    syncWithAPI();

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

        console.log('[DM] Creating dmMessage with content:', {
          originalContent: incomingMessage.content,
          dmMessageContent: dmMessage.content,
          contentType: typeof dmMessage.content,
        });

        // Save to localStorage
        StorageManager.saveMessage(currentUser.id, dmMessage);

        // Update UI
        setMessages(prev => {
          const convMessages = prev[otherUserId] || [];
          // Avoid duplicates
          if (convMessages.find(m => m.id === dmMessage.id)) {
            return prev;
          }
          console.log('[DM] Adding message to state:', dmMessage.content);
          return {
            ...prev,
            [otherUserId]: [...convMessages, dmMessage],
          };
        });

        // If it's from someone else, update/create contact
        if (!isMyMessage) {
          // Helper to fetch user profile if we don't have their info
          const fetchAndUpdateContact = async (userId: string, existingContact?: DMContact) => {
            try {
              console.log('[DM] Fetching profile for user:', userId);
              const profile = await apiClient.getProfile(userId);
              if (profile) {
                const contactData: DMContact = {
                  id: userId,
                  username: profile.username || profile.display_name || existingContact?.username || 'User',
                  avatar_url: profile.avatar_url || existingContact?.avatar_url,
                  avatar_urls: profile.avatar_urls || existingContact?.avatar_urls,
                  status: 'online' as const,
                  unread: existingContact ? existingContact.unread + 1 : 1,
                  conversation_id: incomingMessage.conversation_id || existingContact?.conversation_id,
                };
                console.log('[DM] Fetched profile for', contactData.username, '- avatar:', contactData.avatar_url);
                StorageManager.saveContact(currentUser.id, contactData);
                setContacts(prev => {
                  const idx = prev.findIndex(c => c.id === userId);
                  if (idx >= 0) {
                    return prev.map(c => c.id === userId ? contactData : c);
                  } else {
                    return [contactData, ...prev];
                  }
                });
              }
            } catch (e) {
              console.warn('[DM] Failed to fetch profile for', userId, e);
            }
          };

          setContacts(prev => {
            const existing = prev.find(c => c.id === otherUserId);
            if (existing) {
              // Check if we need to fetch profile (username is 'User' or no avatar)
              const needsProfileFetch = existing.username === 'User' || !existing.avatar_url;
              
              // Update existing contact with latest info from message AND conversation_id
              const updatedContact = {
                ...existing,
                username: incomingMessage.sender_username || existing.username,
                avatar_url: incomingMessage.sender_avatar || existing.avatar_url,
                unread: existing.unread + 1,
                status: 'online' as const,
                // IMPORTANT: Store the real backend conversation_id from the message
                conversation_id: incomingMessage.conversation_id || existing.conversation_id,
              };
              console.log('[DM] Updated contact with conversation_id:', updatedContact.conversation_id);
              StorageManager.saveContact(currentUser.id, updatedContact);
              
              // If we still don't have proper username/avatar, fetch from API
              if (needsProfileFetch || updatedContact.username === 'User' || !updatedContact.avatar_url) {
                fetchAndUpdateContact(otherUserId, updatedContact);
              }
              
              return prev.map(c => c.id === otherUserId ? updatedContact : c);
            } else {
              // Create new contact from message
              const newContact: DMContact = {
                id: otherUserId,
                username: incomingMessage.sender_username || 'User',
                avatar_url: incomingMessage.sender_avatar,
                status: 'online',
                unread: 1,
                // IMPORTANT: Store the real backend conversation_id from the message
                conversation_id: incomingMessage.conversation_id,
              };
              console.log('[DM] Created new contact with conversation_id:', newContact.conversation_id);
              StorageManager.saveContact(currentUser.id, newContact);
              
              // Always fetch profile for new contacts to get proper username/avatar
              fetchAndUpdateContact(otherUserId, newContact);
              
              return [newContact, ...prev];
            }
          });
        }
      });

      // Handle user presence updates - update contact info when users join/leave
      dmSocketManager.onPresence((data) => {
        if (data.user_id) {
          console.log('[DM] Presence update received:', data.type, data.username, data.user_id);
          
          // Cast to include avatar_urls which the WebSocket sends but isn't in the base type
          const presenceData = data as typeof data & { avatar_urls?: { thumbnail?: string; small?: string; medium?: string; large?: string } };
          
          setContacts(prev => {
            const existing = prev.find(c => c.id === presenceData.user_id);
            if (existing) {
              // ALWAYS update username/avatar if provided (they may have changed their profile)
              const updatedContact = {
                ...existing,
                username: presenceData.username || existing.username,
                avatar_url: presenceData.avatar_url || existing.avatar_url,
                avatar_urls: presenceData.avatar_urls || existing.avatar_urls,
                status: presenceData.type === 'user_joined' ? 'online' as const : 'offline' as const,
              };
              
              // Only save to localStorage if something changed
              if (updatedContact.username !== existing.username || 
                  updatedContact.avatar_url !== existing.avatar_url ||
                  updatedContact.status !== existing.status) {
                console.log('[DM] Contact updated from presence:', updatedContact.username);
                StorageManager.saveContact(currentUser.id, updatedContact);
              }
              
              return prev.map(c => c.id === presenceData.user_id ? updatedContact : c);
            }
            return prev;
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

  const selectConversation = async (contactId: string) => {
    setActiveConversation(contactId);
    setShowMobileList(false);
    
    // Find the contact to update
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    console.log('[DM] Selecting conversation with:', contactId, 'Current unread:', contact.unread);
    
    // Mark messages as read in UI state
    setContacts(prev =>
      prev.map(c => (c.id === contactId ? { ...c, unread: 0 } : c))
    );
    
    // Update contact in localStorage with unread: 0
    StorageManager.saveContact(currentUser.id, { ...contact, unread: 0 });
    
    // Mark individual messages as read in localStorage
    StorageManager.markMessagesAsRead(currentUser.id, contactId);
    
    // Call API to persist read status in database
    // Use the REAL backend conversation_id if we have it, otherwise try the computed key
    const realConversationId = contact.conversation_id;
    const fallbackKey = getConversationKey(currentUser.id, contactId);
    const conversationIdToUse = realConversationId || fallbackKey;
    
    console.log('[DM] Marking read via API - realConvId:', realConversationId, 'fallback:', fallbackKey, 'using:', conversationIdToUse);
    
    try {
      await apiClient.markMessagesRead(conversationIdToUse, currentUser.id);
      console.log('[DM] ✅ API markMessagesRead succeeded with:', conversationIdToUse);
    } catch (e) {
      console.warn('[DM] Failed to mark messages as read via API with', conversationIdToUse, ':', e);
      // If real conversation ID failed, try fallback
      if (realConversationId && realConversationId !== fallbackKey) {
        try {
          await apiClient.markMessagesRead(fallbackKey, currentUser.id);
          console.log('[DM] ✅ API markMessagesRead succeeded with fallback:', fallbackKey);
        } catch (e2) {
          console.warn('[DM] Also failed with fallback:', e2);
        }
      }
    }
    
    // Notify sender that messages were read via WebSocket
    if (wsConnected) {
      dmSocketManager.markAsRead(contactId);
    }
    
    // Dispatch event to update notification badges
    window.dispatchEvent(new CustomEvent('dm-messages-read', {
      detail: { userId: currentUser.id, unreadCount: contacts.reduce((sum, c) => sum + (c.id === contactId ? 0 : c.unread), 0) }
    }));
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

  // Delete a single message
  const handleDeleteMessage = async (messageId: string, otherUserId: string) => {
    setDeletingMessage(messageId);
    setShowMessageMenu(null);
    
    try {
      // Delete from API/database
      const conversationKey = getConversationKey(currentUser.id, otherUserId);
      await apiClient.deleteDirectMessage(messageId, currentUser.id);
      
      // Delete from localStorage
      StorageManager.deleteMessage(currentUser.id, otherUserId, messageId);
      
      // Update UI state
      setMessages(prev => ({
        ...prev,
        [otherUserId]: (prev[otherUserId] || []).filter(m => m.id !== messageId)
      }));
    } catch (e) {
      console.warn('[DM] Failed to delete message:', e);
    } finally {
      setDeletingMessage(null);
    }
  };

  // Delete entire conversation (all messages with a user)
  const handleDeleteConversation = async (contact: DMContact) => {
    try {
      // Delete from API/database
      const conversationKey = getConversationKey(currentUser.id, contact.id);
      await apiClient.deleteConversation(conversationKey, currentUser.id);
      
      // Delete from localStorage
      StorageManager.deleteConversation(currentUser.id, contact.id);
      
      // Update UI state
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[contact.id];
        return updated;
      });
      
      // Clear active conversation if it was deleted
      if (activeConversation === contact.id) {
        setActiveConversation(null);
        setShowMobileList(true);
      }
      
      // Close modal
      setShowDeleteConversationModal(false);
      setDeleteConversationTarget(null);
    } catch (e) {
      console.warn('[DM] Failed to delete conversation:', e);
    }
  };

  // Open delete conversation confirmation
  const openDeleteConversationModal = (contact: DMContact, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConversationTarget(contact);
    setShowDeleteConversationModal(true);
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

      <div className="flex flex-col md:flex-row h-[100dvh] md:h-[600px] w-full bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 md:rounded-xl border-0 md:border border-slate-700/50 overflow-hidden fixed md:relative inset-0 md:inset-auto z-20 md:z-auto">
        {/* Sidebar - Contact List */}
        <div className={`w-full md:w-80 md:min-w-[280px] bg-slate-900/95 md:bg-slate-900/60 border-r-0 md:border-r border-slate-700/50 flex flex-col ${!showMobileList ? 'hidden md:flex' : 'flex h-full'}`}>
          {/* Header */}
          <div className="p-3 pt-[108px] md:p-4 md:pt-4 border-b border-slate-700/50 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-sm"
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
                  className={`group flex items-center gap-2 p-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-all ${
                    activeConversation === contact.id
                      ? 'bg-cyan-400/10 border-l-2 border-cyan-400'
                      : 'hover:bg-slate-800/50 active:bg-slate-800/70'
                  }`}
                  onClick={() => selectConversation(contact.id)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-600/50">
                      <ResponsiveAvatar
                        avatarUrls={contact.avatar_urls || (contact.avatar_url ? { thumbnail: contact.avatar_url, small: contact.avatar_url, medium: contact.avatar_url, large: contact.avatar_url } : undefined)}
                        username={contact.username}
                        size="small"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColors[contact.status]}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-white text-sm truncate max-w-[120px]">{contact.username}</span>
                      {lastMsg && lastMsg.timestamp && (
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{formatTime(lastMsg.timestamp)}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {getLastMessagePreview(contact.id)}
                    </p>
                  </div>

                  {/* Unread Badge & Delete Button */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {contact.unread > 0 && (
                      <div className="min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{contact.unread}</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => openDeleteConversationModal(contact, e)}
                      className="flex flex-shrink-0 w-7 h-7 md:w-6 md:h-6 rounded-lg hover:bg-red-500/20 active:bg-red-500/30 items-center justify-center text-slate-500 hover:text-red-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} className="md:hidden" />
                      <Trash2 size={12} className="hidden md:block" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-slate-950/40 min-h-0 ${showMobileList ? 'hidden md:flex' : 'flex h-full'}`}>
        {activeContact ? (
          <>
            {/* Chat Header - Fixed at top */}
            <div className="flex-shrink-0 flex items-center gap-2 p-2 border-b border-slate-700/50 bg-slate-900/95">
              <button 
                className="md:hidden w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white active:bg-slate-700 transition-colors flex-shrink-0"
                onClick={() => setShowMobileList(true)}
              >
                <ArrowLeft size={14} />
              </button>

              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-600/50">
                  <ResponsiveAvatar
                    avatarUrls={activeContact.avatar_urls || (activeContact.avatar_url ? { thumbnail: activeContact.avatar_url, small: activeContact.avatar_url, medium: activeContact.avatar_url, large: activeContact.avatar_url } : undefined)}
                    username={activeContact.username}
                    size="small"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${statusColors[activeContact.status]}`} />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate">{activeContact.username}</h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[activeContact.status]}`} />
                  {activeContact.status === 'online' ? 'Online' : 'Away'}
                </p>
              </div>

              <button className="w-7 h-7 rounded-lg hover:bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0" title="More options">
                <MoreVertical size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
                  <MessageCircle size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs text-slate-600 mt-1">Say hello to {activeContact.username}!</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, i) => {
                    const showDate = i === 0 || formatDate(chatMessages[i - 1].timestamp) !== formatDate(msg.timestamp);
                    const isMe = msg.from === 'me';
                    
                    // Debug render
                    console.log('[DM Render] Message:', {
                      id: msg.id,
                      content: msg.content,
                      contentType: typeof msg.content,
                      contentLength: msg.content?.length,
                      isArray: Array.isArray(msg.content),
                    });

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
                          className={`group/msg flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`flex items-center gap-1 md:gap-2 max-w-[85%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div
                              className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl ${
                                isMe
                                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md'
                                  : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-bl-md'
                              }`}
                            >
                              <p className="text-[13px] md:text-sm leading-relaxed break-words">{msg.content}</p>
                            </div>
                            {/* Delete message button - only show for own messages */}
                            {isMe && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id, activeConversation!)}
                                disabled={deletingMessage === msg.id}
                                className={`flex-shrink-0 w-6 h-6 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover/msg:opacity-100 ${deletingMessage === msg.id ? 'opacity-100 animate-pulse' : ''}`}
                                title="Delete message"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
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

            {/* Input Area - Fixed at bottom */}
            <div className="flex-shrink-0 p-2 md:p-3 border-t border-slate-700/50 bg-slate-900/95">
              <div className="flex items-end gap-1.5 md:gap-2 bg-slate-800/80 border border-slate-700 rounded-xl p-1.5 md:p-2 focus-within:border-cyan-400/60 transition-all">
                <button className="hidden md:flex w-9 h-9 rounded-lg hover:bg-slate-700 items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0" title="Attach file">
                  <Paperclip size={18} />
                </button>
                <textarea
                  rows={1}
                  placeholder={`Message...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none max-h-20 py-1.5 px-2"
                  style={{ minHeight: '32px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all flex-shrink-0"
                  title="Send message"
                >
                  <Send size={14} className="md:hidden" />
                  <Send size={16} className="hidden md:block" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-4">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p className="text-base font-medium text-center">Select a conversation</p>
            <p className="text-xs text-slate-600 mt-1 text-center">Choose from your existing conversations or start a new one</p>
          </div>
        )}
        </div>
      </div>

      {/* Delete Conversation Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConversationModal && deleteConversationTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteConversationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Conversation</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-600/50">
                  <ResponsiveAvatar
                    avatarUrls={deleteConversationTarget.avatar_urls || (deleteConversationTarget.avatar_url ? { thumbnail: deleteConversationTarget.avatar_url, small: deleteConversationTarget.avatar_url, medium: deleteConversationTarget.avatar_url, large: deleteConversationTarget.avatar_url } : undefined)}
                    username={deleteConversationTarget.username}
                    size="small"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-white">{deleteConversationTarget.username}</p>
                  <p className="text-xs text-slate-400">
                    {messages[deleteConversationTarget.id]?.length || 0} messages will be deleted
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-6">
                Are you sure you want to delete your entire conversation with <span className="font-semibold text-white">{deleteConversationTarget.username}</span>? 
                All messages will be permanently removed from both the app and the database.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConversationModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteConversation(deleteConversationTarget)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Export helper for starting conversations from other components
export { DMSection };
