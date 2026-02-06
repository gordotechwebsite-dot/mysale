import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Headphones } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const FAQ_RESPONSES: Record<string, string> = {
  'hola': '¡Hola! Soy el asistente virtual de MySale. ¿En qué puedo ayudarte hoy?',
  'ayuda': 'Puedo ayudarte con:\n• Problemas de inventario\n• Gestión de ventas\n• Configuración de mesas\n• Problemas técnicos\n\n¿Sobre qué tema necesitas ayuda?',
  'inventario': 'Para gestionar tu inventario:\n1. Ve al módulo "Inventario"\n2. Puedes agregar productos, grupos y familias\n3. Ajusta el stock desde la vista de productos\n\n¿Necesitas ayuda con algo específico del inventario?',
  'venta': 'Para realizar una venta rápida:\n1. Ve al módulo "Venta Rápida"\n2. Selecciona los productos\n3. Confirma la venta\n\n¿Tienes algún problema con las ventas?',
  'mesa': 'Para gestionar mesas:\n1. Ve al módulo "Gestión de Mesas"\n2. Crea zonas y mesas\n3. Abre cuentas y agrega productos\n\n¿Necesitas ayuda con la configuración de mesas?',
  'error': 'Si tienes un error técnico:\n1. Intenta refrescar la página (F5)\n2. Cierra sesión y vuelve a entrar\n3. Si persiste, contacta soporte técnico\n\n¿Cuál es el error que estás viendo?',
  'contacto': 'Para contactar soporte técnico directo:\n📧 Email: soporte@mysale.com\n📱 WhatsApp: +57 300 000 0000\n\nNuestro horario de atención es de Lunes a Sábado, 8am - 6pm.',
  'gracias': '¡De nada! Estoy aquí para ayudarte. Si tienes más preguntas, no dudes en escribirme.',
  'precio': 'Los precios de los productos se configuran en el módulo de Inventario. Puedes editar cada producto y ajustar su precio de venta.',
  'turno': 'Para gestionar turnos:\n1. Inicia turno al comenzar el día\n2. Registra las ventas normalmente\n3. Cierra turno al finalizar\n\nEl sistema calculará automáticamente el resumen del día.',
};

function getResponse(input: string): string {
  const lowerInput = input.toLowerCase().trim();
  
  // Check for keyword matches
  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lowerInput.includes(keyword)) {
      return response;
    }
  }
  
  // Default response
  return 'No estoy seguro de cómo ayudarte con eso. Puedes escribir:\n• "ayuda" para ver las opciones\n• "contacto" para hablar con soporte técnico\n\n¿En qué más puedo asistirte?';
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

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        text: getResponse(inputValue),
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 500);
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
