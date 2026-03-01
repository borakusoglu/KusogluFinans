import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export default function useMessages(user, activeFolder) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
    loadUsers();
    firestore.deleteOldTrashMessages();
  }, [activeFolder]);

  const loadMessages = async () => {
    setLoading(true);
    setMessages([]);
    if (activeFolder === 'trash') {
      const trashMsgs = await firestore.getTrashMessages(user.uid);
      setMessages(trashMsgs);
    } else {
      const allMessages = await firestore.getMessages(user.uid);
      setMessages(allMessages);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const allUsers = await firestore.getUsers();
    const filteredUsers = allUsers.filter(u => u.uid !== user.uid && u.role !== 'superadmin');
    setUsers(filteredUsers);
  };

  const handleSendMessage = async (newMessage) => {
    if (newMessage.to.length === 0 || !newMessage.subject || !newMessage.body) {
      return false;
    }

    try {
      const timestamp = new Date().toISOString();
      const recipients = newMessage.to.map(uid => {
        const u = users.find(user => user.uid === uid);
        return { uid, username: u?.username || 'Bilinmeyen' };
      });
      
      const promises = newMessage.to.map(recipientId => {
        const messageData = {
          from: user.uid,
          fromUsername: user.username,
          to: recipientId,
          recipients,
          subject: newMessage.subject,
          body: newMessage.body,
          timestamp,
          read: false,
          quotes: newMessage.quotes || []
        };
        return firestore.sendMessage(messageData);
      });
      
      await Promise.all(promises);
      await loadMessages();
      return true;
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      return false;
    }
  };

  const handleReply = async (selectedMessage, replyBody) => {
    if (!replyBody.trim()) return false;

    try {
      const reply = {
        from: user.uid,
        fromUsername: user.username,
        body: replyBody,
        timestamp: new Date().toISOString()
      };

      const replies = selectedMessage.replies || [];
      replies.push(reply);

      await firestore.updateDocument('messages', selectedMessage.id, { replies });
      await loadMessages();
      return true;
    } catch (error) {
      console.error('Cevap gönderme hatası:', error);
      return false;
    }
  };

  const handleDeleteSelected = async (selectedMessageIds) => {
    for (const messageId of selectedMessageIds) {
      await firestore.moveToTrash(messageId);
    }
    await loadMessages();
  };

  const handleDeleteMessage = async (messageId) => {
    await firestore.moveToTrash(messageId);
    await loadMessages();
  };

  const handleStarMessage = async (messageId, currentStarred) => {
    await firestore.updateDocument('messages', messageId, { [`starredBy.${user.uid}`]: !currentStarred });
    await loadMessages();
  };

  const handleMarkAsRead = async (messageId) => {
    await firestore.markMessageAsRead(messageId);
    await loadMessages();
  };

  const getFilteredMessages = (searchTerm) => {
    let filtered = messages;
    
    if (activeFolder === 'inbox') {
      filtered = messages.filter(m => m.to === user.uid);
    } else if (activeFolder === 'sent') {
      filtered = messages.filter(m => m.from === user.uid);
    } else if (activeFolder === 'starred') {
      filtered = messages.filter(m => m.starred === true);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.fromUsername && m.fromUsername.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const unreadCount = messages.filter(m => m.to === user.uid && !m.read && m.deleted !== true).length;

  return {
    messages,
    users,
    loading,
    unreadCount,
    loadMessages,
    handleSendMessage,
    handleReply,
    handleDeleteSelected,
    handleDeleteMessage,
    handleStarMessage,
    handleMarkAsRead,
    getFilteredMessages
  };
}
