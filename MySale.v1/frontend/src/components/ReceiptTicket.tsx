import React, { useEffect, useState, useRef } from 'react';
import { getReceiptInfo } from '../api';
import type { Sale } from '../types';
import { Printer, X } from 'lucide-react';

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

interface ReceiptTicketProps {
  sale: Sale;
  onClose: () => void;
}

const ReceiptTicket: React.FC<ReceiptTicketProps> = ({ sale, onClose }) => {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    try {
      const data = await getReceiptInfo();
      setBusiness(data);
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getLogoSrc = () => {
    if (!business?.logo_url) return null;
    if (business.logo_url.startsWith('http')) return business.logo_url;
    return `${API_URL}${business.logo_url}`;
  };

  const paymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      nequi: 'Nequi',
      breb: 'BREB',
    };
    return labels[method] || method;
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket - ${sale.folio}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            width: 80mm;
            padding: 4mm;
          }
          .receipt-header { text-align: center; margin-bottom: 8px; }
          .receipt-logo { max-width: 50mm; max-height: 20mm; margin: 0 auto 6px; display: block; object-fit: contain; }
          .business-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .business-detail { font-size: 11px; color: #333; }
          .separator { border-top: 1px dashed #000; margin: 6px 0; }
          .separator-double { border-top: 2px solid #000; margin: 6px 0; }
          .info-row { display: flex; justify-content: space-between; font-size: 11px; }
          .info-label { color: #555; }
          .items-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; padding-bottom: 4px; border-bottom: 1px solid #000; margin-bottom: 4px; }
          .item-row { margin-bottom: 4px; }
          .item-name { font-size: 12px; font-weight: 600; }
          .item-detail { display: flex; justify-content: space-between; font-size: 11px; color: #333; }
          .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .total-final { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #555; }
          .footer-thanks { font-size: 13px; font-weight: bold; color: #000; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="bg-white flex flex-col"
        style={{
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          width: '380px',
        }}
      >
        {/* Modal header with action buttons */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #e5e7eb' }}
        >
          <h3 className="font-semibold text-base" style={{ color: '#111827' }}>
            Ticket de Venta
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white transition-all"
              style={{
                backgroundColor: '#00a86b',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
            >
              <Printer size={15} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 transition-colors"
              style={{ color: '#6b7280', borderRadius: '6px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt content (scrollable) */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div
            ref={receiptRef}
            style={{
              fontFamily: "'Courier New', 'Lucida Console', monospace",
              fontSize: '12px',
              lineHeight: '1.4',
              color: '#000',
              backgroundColor: '#fff',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            {/* Header: Logo + Business Info */}
            <div className="receipt-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
              {getLogoSrc() && (
                <img
                  src={getLogoSrc()!}
                  alt="Logo"
                  className="receipt-logo"
                  style={{
                    maxWidth: '140px',
                    maxHeight: '60px',
                    margin: '0 auto 8px',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              )}
              <div
                className="business-name"
                style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '2px' }}
              >
                {business?.name || 'Mi Negocio'}
              </div>
              {business?.razon_social && (
                <div className="business-detail" style={{ fontSize: '11px', color: '#333' }}>
                  {business.razon_social}
                </div>
              )}
              {business?.nit && (
                <div className="business-detail" style={{ fontSize: '11px', color: '#333' }}>
                  NIT: {business.nit}
                </div>
              )}
              {business?.address && (
                <div className="business-detail" style={{ fontSize: '11px', color: '#333' }}>
                  {business.address}
                </div>
              )}
              {business?.contact_phone && (
                <div className="business-detail" style={{ fontSize: '11px', color: '#333' }}>
                  Tel: {business.contact_phone}
                </div>
              )}
              {business?.contact_email && (
                <div className="business-detail" style={{ fontSize: '11px', color: '#333' }}>
                  {business.contact_email}
                </div>
              )}
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px solid #000', margin: '6px 0' }} />

            {/* Sale Info */}
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>Folio:</span>
                <span style={{ fontWeight: 'bold' }}>{sale.folio}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>Fecha:</span>
                <span>{formatDate(sale.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>Hora:</span>
                <span>{formatTime(sale.created_at)}</span>
              </div>
              {sale.cashier_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#555' }}>Cajero:</span>
                  <span>{sale.cashier_name}</span>
                </div>
              )}
              {sale.location_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#555' }}>Sede:</span>
                  <span>{sale.location_name}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Items header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 'bold',
                paddingBottom: '4px',
                borderBottom: '1px solid #000',
                marginBottom: '4px',
              }}
            >
              <span style={{ flex: 1 }}>Producto</span>
              <span style={{ width: '70px', textAlign: 'right' }}>Subtotal</span>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '4px' }}>
              {sale.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    {item.product_name || `Producto #${item.product_id}`}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#333',
                    }}
                  >
                    <span>
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#dc2626',
                        textAlign: 'right',
                      }}
                    >
                      Desc: -{formatCurrency(item.discount)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Totals */}
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '2px 0',
                    color: '#dc2626',
                  }}
                >
                  <span>Descuento:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                  <span>Impuesto:</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
              )}
            </div>

            {/* Total final */}
            <div style={{ borderTop: '2px solid #000', margin: '4px 0' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '4px 0',
              }}
            >
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div style={{ borderTop: '2px solid #000', margin: '4px 0' }} />

            {/* Payment info */}
            <div style={{ marginTop: '6px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#555' }}>Metodo de pago:</span>
                <span style={{ fontWeight: 'bold' }}>{paymentMethodLabel(sale.payment_method)}</span>
              </div>
              {sale.amount_received != null && sale.payment_method === 'cash' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#555' }}>Recibido:</span>
                  <span>{formatCurrency(sale.amount_received)}</span>
                </div>
              )}
              {sale.change_given != null && sale.change_given > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                  <span>Cambio:</span>
                  <span>{formatCurrency(sale.change_given)}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Gracias por su compra!
              </div>
              {business?.slogan && (
                <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
                  {business.slogan}
                </div>
              )}
              <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
                Powered by MySale POS
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #e5e7eb' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: '#6b7280',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all"
            style={{
              backgroundColor: '#00a86b',
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
          >
            <Printer size={16} />
            Imprimir Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTicket;
