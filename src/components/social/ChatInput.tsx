import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Send, Mic } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = '#0CFF9C';
const SURFACE = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1 = '#EAEEF2';
const T2 = '#8899AA';
const T3 = '#4A5568';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onAttach,
  placeholder = 'Message…',
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        triggerSend();
      }
    }
  };

  const triggerSend = () => {
    onSend();
    // reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <>
      {/* Scoped placeholder colour — one tiny injection, no conflicts */}
      <style>{`._chat-ta::placeholder{color:${T3};}`}</style>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 50,
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: SURFACE,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* ── Attach button ── */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onAttach?.()}
            disabled={disabled}
            aria-label="Attach file"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onAttach && !disabled ? 'pointer' : 'default',
              flexShrink: 0,
              outline: 'none',
              opacity: onAttach ? 1 : 0.45,
            }}
          >
            <Plus size={18} color={T2} />
          </motion.button>

          {/* ── Textarea wrapper ── */}
          <div style={{ position: 'relative', flex: 1 }}>
            <textarea
              ref={textareaRef}
              className="_chat-ta"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              style={{
                width: '100%',
                background: SURFACE_UP,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 44px 10px 16px',
                color: T1,
                fontSize: 14,
                lineHeight: '20px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                maxHeight: 120,
                overflowY: 'auto',
                display: 'block',
              }}
            />

            {/* ── Send / Mic button (absolute inside textarea container) ── */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { if (hasText && !disabled) triggerSend(); }}
              disabled={disabled}
              aria-label={hasText ? 'Send message' : 'Voice input'}
              style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: hasText ? ACCENT : SURFACE_UP,
                border: hasText ? 'none' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                outline: 'none',
                transition: 'background 200ms ease',
                flexShrink: 0,
              }}
            >
              {hasText ? (
                <Send size={16} color="#0C1015" />
              ) : (
                <Mic size={16} color={T3} />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInput;
