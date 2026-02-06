import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Headphones } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '¡Hola! Soy el asistente virtual de MySale. ¿En qué puedo ayudarte hoy?\n\nEscribe "ayuda" para ver las opciones disponibles.',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch(`${API_URL}/faq/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });
      
      const data = await response.json();
      
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

  return (
    <>
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
          <div className="bg-emerald-600 text-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Soporte MySale</h3>
              <p className="text-xs text-emerald-100">Asistente virtual</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                    message.isBot
                      ? 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                      : 'bg-emerald-600 text-white rounded-tr-none'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
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
          </div>
        </div>
      )}
    </>
  );
}
