import React, { useState, useEffect, useRef } from 'react';
import { useGroupChat } from '@/hooks/useGroupChat';
import type { Group } from '@/types/social';
import { ArrowLeft, Send, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface GroupChatViewProps {
  group: Group;
  onBack: () => void;
  onLeave: () => Promise<void>;
}

function Avatar({ src, name }: { src: string | null | undefined; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-[#1E2330] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#00E676]">
      {initials}
    </div>
  );
}

export default function GroupChatView({ group, onBack, onLeave }: GroupChatViewProps) {
  const { messages, isLoading, sendMessage } = useGroupChat(group.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    
    setSending(true);
    const msg = text;
    setText('');
    try {
      await sendMessage(msg);
    } catch {
      setText(msg); // revert
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E2330] bg-[#0E1117] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 -ml-1.5 text-[#6B7280] hover:text-[#E5E7EB]">
            <ArrowLeft size={20} />
          </button>
          {group.avatar_url ? (
            <img src={group.avatar_url} alt={group.name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#1E2330] flex items-center justify-center">
              <Users size={16} className="text-[#00E676]" />
            </div>
          )}
          <div>
            <h2 className="text-[15px] font-bold text-[#E5E7EB]">{group.name}</h2>
            <p className="text-[11px] text-[#6B7280]">Code: {group.invite_code}</p>
          </div>
        </div>
        <button onClick={onLeave} className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition" title="Leave Group">
          <LogOut size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#06090D] scroll-smooth">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-[#1E2330] flex items-center justify-center mb-3">
               <Users size={20} className="text-[#6B7280]" />
             </div>
            <p className="text-[#E5E7EB] font-medium text-sm">Welcome to {group.name}!</p>
            <p className="text-[#6B7280] text-xs mt-1">Say hello to the group.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.user_id === user?.id;
            const showHeader = i === 0 || messages[i - 1].user_id !== msg.user_id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && showHeader && (
                    <div className="mt-auto mb-1">
                      <Avatar src={msg.user_profile?.avatar_url} name={msg.user_profile?.name || 'User'} />
                    </div>
                  )}
                  {!isMe && !showHeader && <div className="w-7 shrink-0" />}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && showHeader && (
                      <span className="text-[11px] text-[#6B7280] ml-1 mb-0.5">{msg.user_profile?.name || 'Unknown'}</span>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-[14px] leading-[1.3] ${
                        isMe
                          ? 'bg-[#00E676] text-[#06090D] rounded-tr-[4px]'
                          : 'bg-[#1E2330] text-[#E5E7EB] rounded-tl-[4px]'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-[#0E1117] border-t border-[#1E2330] rounded-b-2xl flex items-center gap-2">
        <input
          type="text"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-[#1E2330] text-[#E5E7EB] text-[14px] rounded-full px-4 py-2.5 outline-none placeholder:text-[#6B7280]"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-[38px] h-[38px] flex items-center justify-center shrink-0 bg-[#00E676] text-[#06090D] rounded-full disabled:opacity-50 transition"
        >
          <Send size={16} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
}
