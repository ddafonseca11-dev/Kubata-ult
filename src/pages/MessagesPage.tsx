import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getConversations, getMessages, sendMessage, markMessagesRead, subscribeToMessages } from '@/services/chatService';
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService';
import type { Conversation, Message } from '@/types';

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    getConversations(user.id).then((convs) => {
      setConversations(convs);
      setLoading(false);
    });
  }, [user, navigate]);

  useEffect(() => {
    if (!activeConv || !user) return;
    getMessages(activeConv.id).then((msgs) => {
      setMessages(msgs);
      markMessagesRead(activeConv.id, user.id);
    });

    const sub = subscribeToMessages(activeConv.id, (msg) => {
      setMessages((prev) => [...prev, msg]);
      markMessagesRead(activeConv.id, user.id);
    });

    return () => { sub.unsubscribe(); };
  }, [activeConv, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !user) return;
    const body = input.trim();
    setInput('');
    try {
      const msg = await sendMessage(activeConv.id, user.id, body);
      setMessages((prev) => [...prev, msg]);
      trackEvent(AnalyticsEvents.MESSAGE_SENT, { conversationId: activeConv.id });
    } catch {
      alert('Erro ao enviar mensagem.');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse h-60 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mensagens</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Não tens conversas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          {/* Conversation list */}
          <div className={`bg-white rounded-xl border border-slate-200 overflow-y-auto ${activeConv ? 'hidden lg:block' : ''}`}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  activeConv?.id === conv.id ? 'bg-teal-50' : ''
                }`}
              >
                <div className="font-medium text-slate-900 truncate">
                  {conv.property?.title || 'Conversa'}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(conv.last_message_at).toLocaleDateString('pt-PT')}
                </div>
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className={`lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 ${activeConv ? '' : 'hidden lg:flex'}`}>
            {activeConv ? (
              <>
                <div className="p-4 border-b border-slate-200 flex items-center gap-2">
                  <button onClick={() => setActiveConv(null)} className="lg:hidden p-1 text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="font-medium text-slate-900">{activeConv.property?.title || 'Conversa'}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <div className="text-sm">{msg.body}</div>
                        <div className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-teal-100' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escreve uma mensagem..."
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button type="submit" className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                  <p>Seleciona uma conversa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
