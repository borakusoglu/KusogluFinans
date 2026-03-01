import { useState } from 'react';
import MessageSidebar from '../components/Messages/MessageSidebar';
import MessageDetail from '../components/Messages/MessageDetail';
import MessageList from '../components/Messages/MessageList';
import ComposeModal from '../components/Messages/ComposeModal';
import QuoteModal from '../components/Messages/QuoteModal';
import MessageHeader from '../components/Messages/MessageHeader';
import FloatingComposeButton from '../components/Messages/FloatingComposeButton';
import useMessages from '../hooks/useMessages';
import useQuoteData from '../hooks/useQuoteData';
import { getMessages } from '../firebase/firestore';

export default function Mesajlar({ user }) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({
    to: [],
    subject: '',
    body: '',
    quotes: []
  });
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const {
    users,
    loading,
    unreadCount,
    handleSendMessage,
    handleReply,
    handleDeleteSelected,
    handleDeleteMessage,
    handleStarMessage,
    handleMarkAsRead,
    getFilteredMessages
  } = useMessages(user, activeFolder);

  const { payments, creditCards, reminders, loadQuoteData } = useQuoteData();

  const filteredMessages = getFilteredMessages(searchTerm);

  const onSendMessage = async () => {
    const success = await handleSendMessage(newMessage);
    if (success) {
      setNewMessage({ to: [], subject: '', body: '', quotes: [] });
      setShowCompose(false);
    }
  };

  const onReply = async () => {
    const success = await handleReply(selectedMessage, replyBody);
    if (success) {
      setReplyBody('');
      setShowReply(false);
      const updatedMessages = await getMessages(user.uid);
      const updatedMessage = updatedMessages.find(m => m.id === selectedMessage.id);
      if (updatedMessage) {
        setSelectedMessage(updatedMessage);
      }
    }
  };

  const onDeleteSelected = async () => {
    await handleDeleteSelected(selectedMessages);
    setSelectedMessages([]);
    setSelectedMessage(null);
  };

  const onDeleteMessage = async (messageId) => {
    await handleDeleteMessage(messageId);
    setSelectedMessage(null);
  };

  const handleShowQuoteModal = () => {
    loadQuoteData();
    setShowQuoteModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const toggleSelectMessage = (messageId) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter(id => id !== messageId));
    } else {
      setSelectedMessages([...selectedMessages, messageId]);
    }
  };

  return (
    <div style={{height: '100%', display: 'flex', background: '#f5f5f5', maxWidth: '1200px', margin: '0 auto'}}>
      <MessageSidebar 
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        unreadCount={unreadCount}
        setShowCompose={setShowCompose}
        setSelectedMessage={setSelectedMessage}
        setSelectedMessages={setSelectedMessages}
      />

      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <MessageHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedMessage={selectedMessage}
          selectedMessages={selectedMessages}
          filteredMessages={filteredMessages}
          toggleSelectAll={toggleSelectAll}
          handleDeleteSelected={onDeleteSelected}
        />

        <div style={{flex: 1, overflowY: 'auto', background: 'white'}}>
          {selectedMessage ? (
            <MessageDetail
              selectedMessage={selectedMessage}
              setSelectedMessage={setSelectedMessage}
              handleStarMessage={handleStarMessage}
              handleDeleteMessage={onDeleteMessage}
              showReply={showReply}
              setShowReply={setShowReply}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              handleReply={onReply}
              user={user}
            />
          ) : (
            <MessageList
              filteredMessages={filteredMessages}
              loading={loading}
              selectedMessages={selectedMessages}
              toggleSelectMessage={toggleSelectMessage}
              handleStarMessage={handleStarMessage}
              setSelectedMessage={setSelectedMessage}
              handleMarkAsRead={handleMarkAsRead}
              user={user}
            />
          )}
        </div>

        <FloatingComposeButton
          onClick={() => setShowCompose(true)}
          showCompose={showCompose}
        />
      </div>

      <ComposeModal
        showCompose={showCompose}
        setShowCompose={(show) => {
          setShowCompose(show);
          if (!show) {
            setNewMessage({ to: [], subject: '', body: '', quotes: [] });
          }
        }}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        users={users}
        handleSendMessage={onSendMessage}
        setShowQuoteModal={handleShowQuoteModal}
      />

      <QuoteModal
        showQuoteModal={showQuoteModal}
        setShowQuoteModal={setShowQuoteModal}
        payments={payments}
        creditCards={creditCards}
        reminders={reminders}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
      />
    </div>
  );
}
