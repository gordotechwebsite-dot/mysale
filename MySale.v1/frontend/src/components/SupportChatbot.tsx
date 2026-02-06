import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Headphones, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  isImage?: boolean;
  imageUrl?: string;
}

export default function SupportChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '¡Hola! Soy el asistente virtual de MySale. ¿En qué puedo ayudarte hoy?\n\nEscribe "ayuda" para ver las opciones disponibles o "agente" para hablar con soporte técnico.',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isConnectedToAgent, setIsConnectedToAgent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for agent messages when connected
  useEffect(() => {
    if (!isConnectedToAgent || !sessionId) return;

    const pollMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/faq/chat/messages/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          // Find new agent messages
          const agentMessages = data.filter((msg: { from_agent: boolean; id: number }) => 
            msg.from_agent && !messages.some(m => m.id === msg.id + 10000)
          );
          
          if (agentMessages.length > 0) {
            const newMessages = agentMessages.map((msg: { id: number; message: string; agent_name: string }) => ({
              id: msg.id + 10000, // Offset to avoid ID conflicts
              text: `👤 ${msg.agent_name || 'Agente'}: ${msg.message}`,
              isBot: true,
              timestamp: new Date(),
            }));
            setMessages(prev => [...prev, ...newMessages]);
          }
        }
      } catch {
        // Silent fail on polling
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [isConnectedToAgent, sessionId, messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');

    try {
      // If connected to agent, send follow-up message (no confirmation shown)
      if (isConnectedToAgent && sessionId) {
        await fetch(`${API_URL}/faq/chat/follow-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: messageText,
            session_id: sessionId,
            user_name: user?.full_name || user?.username || 'Usuario',
            tenant_name: 'MySale'
          }),
        });
        return;
      }

      // Normal chat flow
      const response = await fetch(`${API_URL}/faq/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText,
          user_name: user?.full_name || user?.username || 'Usuario',
          tenant_name: 'MySale'
        }),
      });
      
      const data = await response.json();
      
      // Check if connected to agent
      if (data.connected_to_agent) {
        setIsConnectedToAgent(true);
        setSessionId(data.session_id);
      }
      
      const botResponse: Message = {
        id: messages.length + 2,
        text: data.answer,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch {
      const botResponse: Message = {
        id: messages.length + 2,
        text: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      
      const imageMessage: Message = {
        id: messages.length + 1,
        text: 'Imagen adjunta',
        isBot: false,
        timestamp: new Date(),
        isImage: true,
        imageUrl: imageUrl,
      };
      setMessages((prev) => [...prev, imageMessage]);

      if (isConnectedToAgent && sessionId) {
        try {
          await fetch(`${API_URL}/faq/chat/send-image?session_id=${sessionId}&user_name=${encodeURIComponent(user?.full_name || user?.username || 'Usuario')}&tenant_name=MySale&description=${encodeURIComponent('Imagen adjunta por el usuario')}`, {
            method: 'POST',
          });
        } catch {
          // Silent fail - image notification failed but user already sees the image
        }
      } else {
        const botResponse: Message = {
          id: messages.length + 2,
          text: 'Para enviar imágenes al equipo de soporte, primero escribe "agente" para conectarte con un representante.',
          isBot: true,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      }

      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-gray-600 rotate-90' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-110'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Headphones className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className={`${isConnectedToAgent ? 'bg-orange-500' : 'bg-emerald-600'} text-white p-4 flex items-center gap-3 transition-colors`}>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">
                {isConnectedToAgent ? 'Soporte en Vivo' : 'Soporte MySale'}
              </h3>
              <p className="text-xs opacity-80">
                {isConnectedToAgent ? `Ticket #${sessionId}` : 'Asistente virtual'}
              </p>
            </div>
            {isConnectedToAgent && (
              <div className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs">Conectado</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    message.isBot
                      ? 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                      : 'bg-emerald-600 text-white rounded-tr-none'
                  }`}
                >
                  {message.isImage && message.imageUrl ? (
                    <img 
                      src={message.imageUrl} 
                      alt="Imagen adjunta" 
                      className="max-w-full rounded-lg"
                    />
                  ) : (
                    <span 
                      className="whitespace-pre-line"
                      dangerouslySetInnerHTML={{ 
                        __html: message.text.replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>') 
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              {/* Image upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-10 h-10 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                title="Adjuntar imagen"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnectedToAgent ? "Escribe al agente..." : "Escribe tu mensaje..."}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {isConnectedToAgent && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Conectado con soporte - Puedes enviar imagenes con el boton de camara
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
