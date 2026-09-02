import React, { useEffect, useState, useRef } from 'react';
import { getReceiptInfo } from '../api';
import type { Ticket } from '../types';
import { Printer, X } from 'lucide-react';
import { printReceiptWindow } from '../lib/printReceipt';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface BusinessInfo {
  name: string;
  logo_url: string | null;
  razon_social: string | null;
  nit: string | null;
  slogan: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  primary_color: string | null;
}

interface PrecheckTicketProps {
  ticket: Ticket;
  onClose: () => void;
}

const thermalStyles = `
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 12px; line-height: 1.3; color: #000;
    width: 80mm; padding: 3mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
`;

const PrecheckTicket: React.FC<PrecheckTicketProps> = ({ ticket, onClose }) => {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    try {
      const data = await getReceiptInfo(ticket.location_id);
      setBusiness(data);
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'America/Bogota' });
  };

  const getLogoSrc = () => {
    if (!business?.logo_url) return null;
    if (business.logo_url.startsWith('http')) return business.logo_url;
    return `${API_URL}${business.logo_url}`;
  };

  const totalItems = ticket.items.reduce((sum, item) => sum + item.quantity, 0);
  const nowStr = new Date().toISOString();

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;
    printReceiptWindow(`Precuenta - ${ticket.table_name || ticket.id}`, thermalStyles, printContent.innerHTML);
  };

  const s = {
    row: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', lineHeight: '1.5' } as React.CSSProperties,
    label: { color: '#000' } as React.CSSProperties,
    bold: { fontWeight: 600 } as React.CSSProperties,
    sepDash: { borderTop: '1px dashed #000', margin: '5px 0' } as React.CSSProperties,
    sepSolid: { borderTop: '2px solid #000', margin: '5px 0' } as React.CSSProperties,
    detail: { fontSize: '11px', color: '#000' } as React.CSSProperties,
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white flex flex-col" style={{ borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', width: '380px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h3 className="font-semibold text-base" style={{ color: '#111827' }}>Precuenta</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white transition-all" style={{ backgroundColor: '#3b82f6', borderRadius: '8px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2563eb'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#3b82f6'; }}>
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onClose} className="p-1.5 transition-colors" style={{ color: '#6b7280', borderRadius: '6px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt content */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div ref={receiptRef} style={{ fontFamily: "'Courier New', 'Lucida Console', monospace", fontSize: '12px', lineHeight: '1.3', color: '#000', backgroundColor: '#fff', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {/* Business header */}
            <div style={{ textAlign: 'center' }}>
              {getLogoSrc() && (
                <img src={getLogoSrc()!} alt="Logo" style={{ maxWidth: '130px', maxHeight: '55px', margin: '0 auto 6px', display: 'block', objectFit: 'contain' }} />
              )}
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {business?.name || 'Mi Negocio'}
              </div>
              {business?.nit && <div style={s.detail}>NIT: {business.nit}</div>}
            </div>

            {/* Title - highlighted as PRECUENTA */}
            <div style={s.sepSolid} />
            <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '6px 0', letterSpacing: '2px', padding: '4px 0', borderBottom: '2px dashed #000', borderTop: '2px dashed #000' }}>
              *** PRECUENTA ***
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#000', marginBottom: '4px' }}>
              Este documento NO es una factura
            </div>

            {/* Ticket info */}
            <div style={{ marginBottom: '4px' }}>
              {ticket.table_name && (
                <div style={s.row}>
                  <span style={s.label}>Mesa:</span>
                  <span style={s.bold}>{ticket.table_name}</span>
                </div>
              )}
              {ticket.waiter_name && (
                <div style={s.row}>
                  <span style={s.label}>Mesero:</span>
                  <span>{ticket.waiter_name}</span>
                </div>
              )}
              {ticket.customer_name && (
                <div style={s.row}>
                  <span style={s.label}>Cliente:</span>
                  <span>{ticket.customer_name}</span>
                </div>
              )}
              {ticket.num_people > 0 && (
                <div style={s.row}>
                  <span style={s.label}>Personas:</span>
                  <span>{ticket.num_people}</span>
                </div>
              )}
              <div style={s.row}>
                <span style={s.label}>Fecha:</span>
                <span>{formatDate(nowStr)}</span>
              </div>
              <div style={s.row}>
                <span style={s.label}>Hora:</span>
                <span>{formatTime(nowStr)}</span>
              </div>
            </div>

            {/* Items header */}
            <div style={s.sepDash} />
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 'bold', paddingBottom: '3px', borderBottom: '1px solid #000', marginBottom: '3px' }}>
              <span style={{ flex: 1 }}>Producto</span>
              <span style={{ width: '30px', textAlign: 'center' }}>Ud</span>
              <span style={{ width: '55px', textAlign: 'right' }}>P.Unit</span>
              <span style={{ width: '60px', textAlign: 'right' }}>Subtotal</span>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '3px' }}>
              {ticket.items.filter(item => item.status !== 'cancelled').map((item, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#000' }}>
                    <span style={{ flex: 1, fontWeight: 600, paddingRight: '3px', wordBreak: 'break-word' }}>
                      {item.product_name || `Producto #${item.product_id}`}
                    </span>
                    <span style={{ width: '30px', textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ width: '55px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</span>
                    <span style={{ width: '60px', textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div style={{ fontSize: '11px', color: '#000', textAlign: 'right' }}>
                      Desc: -{formatCurrency(item.discount)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11px', color: '#000', textAlign: 'right', marginTop: '2px' }}>
              {totalItems} artículo{totalItems !== 1 ? 's' : ''}
            </div>

            {/* Totals */}
            <div style={s.sepDash} />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(ticket.subtotal)}</span>
              </div>
              {ticket.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0', color: '#dc2626' }}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(ticket.discount)}</span>
                </div>
              )}
              {ticket.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0' }}>
                  <span>Impuesto:</span>
                  <span>{formatCurrency(ticket.tax)}</span>
                </div>
              )}
              {ticket.service_charge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0' }}>
                  <span>Servicio:</span>
                  <span>{formatCurrency(ticket.service_charge)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ borderTop: '3px double #000', margin: '5px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', padding: '3px 0' }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(ticket.total)}</span>
            </div>
            <div style={{ borderTop: '3px double #000', margin: '5px 0' }} />

            {/* Footer */}
            <div style={s.sepDash} />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
                Solicite su factura al momento de pagar
              </div>
              <div style={{ fontSize: '11px', color: '#000', marginTop: '6px' }}>Powered by MySale POS</div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium transition-colors" style={{ color: '#6b7280', borderRadius: '8px', border: '1px solid #e5e7eb' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
            Cerrar
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all" style={{ backgroundColor: '#3b82f6', borderRadius: '8px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}>
            <Printer size={16} /> Imprimir Precuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrecheckTicket;
