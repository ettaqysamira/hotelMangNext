'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatBot: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre portier virtuel. Comment puis-je vous aider aujourd\'hui (WiFi, check-out, règlements...) ?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Only show the chatbot if logged in (security/auth best practices)
  if (!isAuthenticated) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    
    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      // Build history payload (excluding initial greeting to save tokens)
      const history = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await api.post('/chatbot/message', {
        message: userMsg,
        history
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Désolé, je rencontre des difficultés pour me connecter au serveur d'intelligence artificielle. Veuillez réessayer." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-4 w-96 h-[500px] rounded-2xl shadow-2xl border border-[#1c2333] bg-[#080b12]/95 backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1c2333] bg-gradient-to-r from-cyan-400/15 to-cyan-400/10 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-400/15 text-cyan-400 border border-cyan-400/25">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#e8edf5] text-sm">Portier Virtuel</h3>
                  <span className="text-[10px] text-[#00d4aa] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse"></span>
                    Assistant IA en ligne
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#8892a8] hover:text-[#e8edf5] transition-colors p-1.5 rounded-lg hover:bg-[#151b28]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs border ${
                    msg.role === 'user' 
                      ? 'bg-[#0d1117] border-cyan-400/40 text-cyan-400 shadow-sm shadow-cyan-400/5' 
                      : 'bg-[#0d1117] border-[#1c2333] text-cyan-400'
                  }`}>
                    {msg.role === 'user' ? <User size={14} /> : <MessageSquare size={14} />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-400/10 border border-cyan-400/20 text-[#e8edf5] rounded-tr-none shadow-sm shadow-cyan-400/5'
                      : 'bg-[#0d1117]/85 border border-[#1c2333] text-[#e8edf5] rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-[#0d1117] border border-[#1c2333] flex items-center justify-center text-[#00d4aa]">
                    <MessageSquare size={14} />
                  </div>
                  <div className="p-3 bg-[#0d1117]/85 border border-[#1c2333] rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#8892a8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#8892a8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#8892a8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-[#1c2333] bg-[#0d1117]/40">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 focus:ring-1 focus:ring-[#00d4aa]/80 rounded-xl px-3.5 py-2 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478]"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-2 rounded-xl bg-[#0d1117] hover:bg-[#151b28] border border-[#1c2333] hover:border-[#00d4aa]/40 text-[#00d4aa] disabled:opacity-50 disabled:hover:border-[#1c2333] disabled:text-[#5a6478] transition-all shadow-md cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[#0d1117]/90 backdrop-blur-md text-[#00d4aa] flex items-center justify-center shadow-xl shadow-[#00d4aa]/5 border border-[#00d4aa]/30 cursor-pointer relative hover:border-[#00d4aa]/80 hover:shadow-[#00d4aa]/15 hover:bg-[#151b28]/90 transition-all duration-200"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00f0c8] border border-[#0d1117] rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
            1
          </span>
        )}
      </motion.button>
    </div>
  );
};

