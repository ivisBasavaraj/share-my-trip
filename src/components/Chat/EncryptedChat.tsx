import React, { useState, useEffect, useRef } from 'react';
import { Trip, EncryptedMessage } from '../../types';
import { useAuth } from '../../context/useAuth';
import { 
  deriveTripKey, 
  encryptText, 
  decryptText, 
  computeKeyFingerprint 
} from '../../utils/crypto';
import { 
  subscribeToMessages, 
  sendEncryptedMessage, 
  toggleMessageReaction, 
  voteOnPoll,
  compressImageToDataUrl,
  uploadDataUrl
} from '../../services/tripService';
import { 
  Send, 
  AlertTriangle, 
  Sparkles, 
  CheckCheck,
  Compass,
  MessageSquare,
  Users,
  Smile,
  Vote,
  Image as ImageIcon,
  Search,
  Coffee,
  MapPin,
  Fuel,
  CheckCircle2,
  X,
  UploadCloud,
  ShieldCheck
} from 'lucide-react';

interface EncryptedChatProps {
  trip: Trip;
}

const COMMON_REACTIONS = ['👍', '❤️', '☕', '🏕️', '🔥', '🚀'];

export const EncryptedChat: React.FC<EncryptedChatProps> = ({ trip }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'live' | 'sending' | 'cached' | 'error'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Poll Creator State
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Photo Attachment State
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Reaction Picker Popover
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Initialize Key for this trip
  useEffect(() => {
    let isMounted = true;
    async function initKey() {
      try {
        const key = await deriveTripKey(trip.id, trip.encryptionKeyId);
        const fp = await computeKeyFingerprint(trip.id);
        if (isMounted) {
          setCryptoKey(key);
          setFingerprint(fp);
        }
      } catch (e) {
        console.warn('Crypto key derivation error:', e);
      }
    }
    initKey();
    return () => { isMounted = false; };
  }, [trip.id, trip.encryptionKeyId]);

  // Subscribe to real-time chat messages and display clearly to everyone
  useEffect(() => {
    const unsubscribe = subscribeToMessages(trip.id, async (rawMsgs) => {
      // Process messages so they are immediately readable by everyone
      const processed = await Promise.all(
        rawMsgs.map(async (m) => {
          // If message already has clear text or decryptedText, display it directly
          if (m.text) {
            return { ...m, decryptedText: m.text };
          }
          if (m.decryptedText && !m.decryptedText.startsWith('[Decryption error')) {
            return m;
          }
          // If encrypted and we have key, attempt decryption
          if (m.encryptedPayload && m.iv && cryptoKey) {
            try {
              const text = await decryptText(m.encryptedPayload, m.iv, cryptoKey);
              if (!text.startsWith('[Decryption error')) {
                return { ...m, text, decryptedText: text };
              }
            } catch (err) {}
          }
          // Fallback to avoid hiding from anyone
          const fallback = m.decryptedText || m.text || 'Message from traveler';
          return { ...m, text: fallback, decryptedText: fallback };
        })
      );
      setMessages(processed);
    });

    return () => unsubscribe();
  }, [trip.id, cryptoKey]);

  // Scroll only the chat container — never the whole page
  useEffect(() => {
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !attachmentDataUrl) return;

    setIsSending(true);
    setDeliveryStatus('sending');
    if (customText === undefined) setInputText('');

    try {
      let ciphertext = '';
      let iv = '';

      if (cryptoKey && textToSend) {
        try {
          const enc = await encryptText(textToSend, cryptoKey);
          ciphertext = enc.ciphertext;
          iv = enc.iv;
        } catch (err) {
          console.warn('Encryption fallback to clear text:', err);
        }
      }

      let uploadedMediaUrl = undefined;
      if (attachmentDataUrl) {
        uploadedMediaUrl = await uploadDataUrl(attachmentDataUrl, attachmentName || 'chat_photo.jpg');
        setAttachmentDataUrl(null);
        setAttachmentName('');
      }

      const msg: EncryptedMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tripId: trip.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.photoURL,
        text: textToSend,
        decryptedText: textToSend,
        encryptedPayload: ciphertext,
        iv,
        timestamp: new Date().toISOString(),
        mediaUrl: uploadedMediaUrl,
        reactions: {}
      };

      const result = await sendEncryptedMessage(msg);
      setDeliveryStatus(result.delivery === 'sent' ? 'live' : 'cached');
    } catch (err) {
      console.error('Failed to send message:', err);
      setDeliveryStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(undefined, promptText);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    const filteredOptions = pollOptions.filter(o => o.trim().length > 0);
    if (filteredOptions.length < 2) return;

    const pollObj = {
      question: pollQuestion.trim(),
      options: filteredOptions.map((label, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        label: label.trim(),
        votes: []
      }))
    };

    const pollAnnouncement = `📊 Group Poll: ${pollQuestion.trim()}`;
    const msg: EncryptedMessage = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.photoURL,
      text: pollAnnouncement,
      decryptedText: pollAnnouncement,
      timestamp: new Date().toISOString(),
      poll: pollObj,
      reactions: { '🗳️': [currentUser.id] }
    };

    const result = await sendEncryptedMessage(msg);
    setDeliveryStatus(result.delivery === 'sent' ? 'live' : 'cached');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl, name } = await compressImageToDataUrl(file, 1200, 0.85);
      setAttachmentDataUrl(dataUrl);
      setAttachmentName(name);
    } catch (err) {
      console.error('Failed to compress attachment:', err);
    }
  };

  const handleSosSafetyCheck = async () => {
    const sosText = `🚨 EMERGENCY CHECK-IN: Traveler ${currentUser.displayName} broadcast a safety alert for ${trip.destination}! Emergency Contact: ${currentUser.emergencyContact || 'Active in Trip Group'}.`;
    
    let ciphertext = '';
    let iv = '';
    if (cryptoKey) {
      try {
        const enc = await encryptText(sosText, cryptoKey);
        ciphertext = enc.ciphertext;
        iv = enc.iv;
      } catch (e) {}
    }

    const msg: EncryptedMessage = {
      id: `sos_${Date.now()}`,
      tripId: trip.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.photoURL,
      text: sosText,
      decryptedText: sosText,
      encryptedPayload: ciphertext,
      iv,
      timestamp: new Date().toISOString()
    };
    const result = await sendEncryptedMessage(msg);
    setDeliveryStatus(result.delivery === 'sent' ? 'live' : 'cached');

    // Call Express Backend Safety Alert API
    const { dispatchSafetySos } = await import('../../services/tripService');
    await dispatchSafetySos({
      travelerName: currentUser.displayName,
      tripTitle: trip.title,
      lat: 12.4208,
      lng: 75.7382,
      emergencyContact: currentUser.emergencyContact || '+91 98451 23456'
    });
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => {
        const text = (m.text || m.decryptedText || '').toLowerCase();
        const author = (m.senderName || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return text.includes(q) || author.includes(q);
      })
    : messages;

  return (
    <div className="flex flex-col h-[580px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Group Channel Header */}
      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold tracking-tight">Trip Group Channel</span>
              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${deliveryStatus === 'error' ? 'border-rose-800 bg-rose-950 text-rose-200' : deliveryStatus === 'cached' ? 'border-amber-800 bg-amber-950 text-amber-200' : 'border-emerald-800 bg-emerald-950 text-emerald-300'}`} role="status">
                <span className={`h-1.5 w-1.5 rounded-full ${deliveryStatus === 'error' ? 'bg-rose-400' : deliveryStatus === 'cached' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {deliveryStatus === 'sending' ? 'Sending…' : deliveryStatus === 'cached' ? 'Saved locally · retrying' : deliveryStatus === 'error' ? 'Delivery needs attention' : 'Live · delivered'}
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded font-medium">
                Live Sync · Visible to Everyone
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{trip.title}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300 font-mono text-[10px]">
                {messages.length} messages
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors ${
              showSearch ? 'bg-slate-800 text-amber-400' : 'hover:bg-slate-800'
            }`}
            title="Search messages"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* SOS Broadcast Button */}
          <button
            onClick={handleSosSafetyCheck}
            className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            title="Broadcast emergency check-in to group members"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SOS Broadcast</span>
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search conversations, meeting points, stops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Messages List */}
      <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">Trip Group Channel</div>
            <div className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Real-time open channel for all travelers. Coordinate departure times, fuel stops, packing checklists, and chai points.
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => handleQuickPrompt('Hey everyone, excited for this journey! 🎒')}
                className="text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs transition-colors"
              >
                Say Hello 👋
              </button>
              <button
                onClick={() => handleQuickPrompt('☕ Suggesting a chai and breakfast stop on the way!')}
                className="text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs transition-colors"
              >
                Suggest Chai ☕
              </button>
            </div>
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const displayText = m.text || m.decryptedText || 'Message from traveler';
            const isSos = displayText.startsWith('🚨 EMERGENCY');
            const reactionsMap = m.reactions || {};

            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}
              >
                {!isMe && (
                  <img
                    src={m.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={m.senderName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs relative ${
                    isSos
                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-900'
                      : isMe
                      ? 'bg-amber-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Sender & Timestamp */}
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`font-semibold text-[11px] ${isMe ? 'text-amber-100' : 'text-slate-600'}`}>
                      {m.senderName}
                    </span>
                    <span className={`text-[10px] font-mono ${isMe ? 'text-amber-200' : 'text-slate-400'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Photo Attachment if any */}
                  {m.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/40 max-w-sm">
                      <img 
                        src={m.mediaUrl} 
                        alt="Shared in group chat" 
                        className="w-full h-44 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(m.mediaUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Message Text (Displayed to Everyone) */}
                  <p className="leading-relaxed whitespace-pre-wrap text-[12px]">{displayText}</p>

                  {/* Poll Card if message is a Poll */}
                  {m.poll && (
                    <div className={`mt-3 p-3 rounded-xl border ${
                      isMe ? 'bg-amber-700/50 border-amber-500/50 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-2">
                        <Vote className="w-3.5 h-3.5 text-amber-300" />
                        <span>{m.poll.question}</span>
                      </div>

                      <div className="space-y-1.5">
                        {m.poll.options.map((opt) => {
                          const totalVotes = m.poll?.options.reduce((sum, o) => sum + o.votes.length, 0) || 0;
                          const count = opt.votes.length;
                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                          const hasVoted = opt.votes.includes(currentUser.id);

                          return (
                            <button
                              key={opt.id}
                              onClick={() => voteOnPoll(trip.id, m.id, opt.id, currentUser.id)}
                              className={`w-full text-left p-2 rounded-lg text-xs transition-all relative overflow-hidden border ${
                                hasVoted
                                  ? 'border-amber-400 bg-amber-400/20 font-semibold'
                                  : isMe
                                  ? 'border-amber-500/40 bg-amber-800/40 hover:bg-amber-800/70'
                                  : 'border-slate-200 bg-white hover:bg-slate-100'
                              }`}
                            >
                              {/* Background vote percentage fill */}
                              <div
                                className={`absolute left-0 top-0 bottom-0 opacity-15 pointer-events-none transition-all ${
                                  hasVoted ? 'bg-amber-400' : 'bg-slate-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />

                              <div className="relative z-10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-3 h-3 rounded-full border flex items-center justify-center text-[8px] ${
                                    hasVoted ? 'border-amber-400 bg-amber-400 text-slate-900' : 'border-slate-400'
                                  }`}>
                                    {hasVoted ? '✓' : ''}
                                  </span>
                                  <span>{opt.label}</span>
                                </div>
                                <span className="font-mono text-[10px] opacity-80">{pct}% ({count})</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reactions Display */}
                  {Object.keys(reactionsMap).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2 pt-1.5 border-t border-slate-200/20">
                      {Object.entries(reactionsMap).map(([emoji, userList]) => {
                        const isReactedByMe = userList.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleMessageReaction(trip.id, m.id, emoji, currentUser.id)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                              isReactedByMe
                                ? isMe
                                  ? 'bg-amber-700 border border-amber-400 text-amber-100'
                                  : 'bg-amber-50 border border-amber-300 text-amber-800'
                                : isMe
                                ? 'bg-amber-700/60 text-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono">{userList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer status & reaction launcher button */}
                  <div className={`flex items-center justify-between gap-1 mt-1.5 text-[10px] ${
                    isMe ? 'text-amber-200' : 'text-slate-400'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveReactionMsgId(activeReactionMsgId === m.id ? null : m.id)}
                        className={`hover:opacity-100 opacity-60 transition-opacity p-0.5 rounded flex items-center gap-0.5 ${
                          isMe ? 'hover:bg-amber-700' : 'hover:bg-slate-100'
                        }`}
                        title="React to message"
                      >
                        <Smile className="w-3 h-3" />
                      </button>

                      {/* Quick reaction popover */}
                      {activeReactionMsgId === m.id && (
                        <div className="absolute bottom-6 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex items-center gap-1 text-slate-800">
                          {COMMON_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                toggleMessageReaction(trip.id, m.id, emoji, currentUser.id);
                                setActiveReactionMsgId(null);
                              }}
                              className="p-1 hover:bg-slate-100 rounded-lg text-sm transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="opacity-80">Visible to group</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Banner if selected */}
      {attachmentDataUrl && (
        <div className="px-3.5 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-900 truncate">
            <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold truncate">Ready to attach: {attachmentName}</span>
          </div>
          <button
            onClick={() => { setAttachmentDataUrl(null); setAttachmentName(''); }}
            className="text-amber-700 hover:text-amber-950 p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Action Suggestion Chips */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
        <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider shrink-0 mr-1">
          Quick:
        </span>
        <button
          type="button"
          onClick={() => handleQuickPrompt('☕ Suggesting a quick filter coffee and tea stop ahead!')}
          className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
        >
          <Coffee className="w-3 h-3 text-amber-600" />
          <span>Chai Stop</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickPrompt(`📍 Shared pin: Approaching checkpoint on route for ${trip.destination}.`)}
          className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
        >
          <MapPin className="w-3 h-3 text-rose-500" />
          <span>Share Pin</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickPrompt('⛽ Fuel & FASTag check at the next highway plaza.')}
          className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
        >
          <Fuel className="w-3 h-3 text-blue-500" />
          <span>Fuel Check</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickPrompt('🎒 Checked off packing items in the group checklist!')}
          className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Packing Check</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPollCreator(true)}
          className="shrink-0 flex items-center gap-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs"
        >
          <Vote className="w-3 h-3 text-purple-600" />
          <span>Group Poll</span>
        </button>
      </div>

      {/* Input bar */}
      <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        {/* Hidden File Input for Device Photo Attachment */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileSelect}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors shrink-0"
          title="Attach photo moment from local device"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowPollCreator(true)}
          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl border border-slate-200 transition-colors shrink-0"
          title="Create a group vote / poll"
        >
          <Vote className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder="Type a message for your travel group (displayed live to everyone)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isSending}
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !attachmentDataUrl) || isSending}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>

      {/* Modal: Create Group Poll */}
      {showPollCreator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Vote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Travel Group Poll</h3>
                  <p className="text-xs text-slate-500">Ask travelers to vote on stops, meals, or departure times</p>
                </div>
              </div>
              <button
                onClick={() => setShowPollCreator(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poll Question</label>
                <input
                  type="text"
                  placeholder="e.g. Which viewpoint for sunset: Raja's Seat or Abbey Falls?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Options</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[idx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      required={idx < 2}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    + Add another option
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPollCreator(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  Post Poll to Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
