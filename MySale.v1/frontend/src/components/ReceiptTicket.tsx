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

const thermalStyles = `
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
    line-height: 1.3;
    color: #000;
    width: 80mm;
    padding: 3mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-header { text-align: center; margin-bottom: 6px; }
  .receipt-logo { max-width: 45mm; max-height: 18mm; margin: 0 auto 4px; display: block; object-fit: contain; }
  .business-name { font-size: 15px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; letter-spacing: 0.5px; }
  .business-detail { font-size: 10px; color: #333; line-height: 1.3; }
  .sep-dash { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .sep-solid { border: none; border-top: 2px solid #000; margin: 5px 0; }
  .sep-double { border: none; border-top: 3px double #000; margin: 5px 0; }
  .doc-title { text-align: center; font-size: 14px; font-weight: bold; margin: 4px 0; letter-spacing: 1px; }
  .info-row { display: flex; justify-content: space-between; font-size: 10px; line-height: 1.5; }
  .info-label { color: #555; }
  .info-value { font-weight: 600; }
  .items-header { display: flex; font-size: 10px; font-weight: bold; padding: 3px 0; border-bottom: 1px solid #000; margin-bottom: 3px; }
  .items-header span:first-child { flex: 1; }
  .items-header span:nth-child(2) { width: 30px; text-align: center; }
  .items-header span:nth-child(3) { width: 55px; text-align: right; }
  .items-header span:nth-child(4) { width: 60px; text-align: right; }
  .item-row { margin-bottom: 3px; }
  .item-name { font-size: 11px; font-weight: 600; }
  .item-detail { display: flex; font-size: 10px; color: #333; }
  .item-detail span:first-child { flex: 1; }
  .item-detail span:nth-child(2) { width: 30px; text-align: center; }
  .item-detail span:nth-child(3) { width: 55px; text-align: right; }
  .item-detail span:nth-child(4) { width: 60px; text-align: right; }
  .item-notes { font-size: 9px; color: #555; font-style: italic; }
  .item-discount { font-size: 9px; color: #666; text-align: right; }
  .totals-section { margin-top: 4px; }
  .totals-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
  .total-final { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding: 3px 0; }
  .payment-section { margin-top: 4px; }
  .footer { text-align: center; margin-top: 8px; }
  .footer-thanks { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
  .footer-slogan { font-size: 10px; color: #555; font-style: italic; }
  .footer-brand { font-size: 9px; color: #999; margin-top: 6px; }
  .items-count { font-size: 10px; color: #555; text-align: right; margin-top: 2px; }
`;

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
      timeZone: 'America/Bogota',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota',
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

  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

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
        <title>Factura - ${sale.folio}</title>
        <style>${thermalStyles}</style>
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
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #e5e7eb' }}
        >
          <h3 className="font-semibold text-base" style={{ color: '#111827' }}>
            Factura de Venta
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white transition-all"
              style={{ backgroundColor: '#00a86b', borderRadius: '8px' }}
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

        {/* Receipt content */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div
            ref={receiptRef}
            style={{
              fontFamily: "'Courier New', 'Lucida Console', monospace",
              fontSize: '12px',
              lineHeight: '1.3',
              color: '#000',
              backgroundColor: '#fff',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              {getLogoSrc() && (
                <img
                  src={getLogoSrc()!}
                  alt="Logo"
                  style={{
                    maxWidth: '130px',
                    maxHeight: '55px',
                    margin: '0 auto 6px',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              )}
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {business?.name || 'Mi Negocio'}
              </div>
              {business?.razon_social && (
                <div style={{ fontSize: '10px', color: '#333' }}>{business.razon_social}</div>
              )}
              {business?.nit && (
                <div style={{ fontSize: '10px', color: '#333' }}>NIT: {business.nit}</div>
              )}
              {business?.address && (
                <div style={{ fontSize: '10px', color: '#333' }}>{business.address}</div>
              )}
              {business?.contact_phone && (
                <div style={{ fontSize: '10px', color: '#333' }}>Tel: {business.contact_phone}</div>
              )}
              {business?.contact_email && (
                <div style={{ fontSize: '10px', color: '#333' }}>{business.contact_email}</div>
              )}
            </div>

            {/* Document title */}
            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }} />
            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: '4px 0', letterSpacing: '1px' }}>
              FACTURA DE VENTA
            </div>
            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }} />

            {/* Sale info */}
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                <span style={{ color: '#555' }}>Folio:</span>
                <span style={{ fontWeight: 600 }}>{sale.folio}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                <span style={{ color: '#555' }}>Fecha:</span>
                <span>{formatDate(sale.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                <span style={{ color: '#555' }}>Hora:</span>
                <span>{formatTime(sale.created_at)}</span>
              </div>
              {sale.cashier_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                  <span style={{ color: '#555' }}>Cajero:</span>
                  <span>{sale.cashier_name}</span>
                </div>
              )}
              {sale.location_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                  <span style={{ color: '#555' }}>Sede:</span>
                  <span>{sale.location_name}</span>
                </div>
              )}
            </div>

            {/* Items header */}
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
            <div style={{ display: 'flex', fontSize: '10px', fontWeight: 'bold', paddingBottom: '3px', borderBottom: '1px solid #000', marginBottom: '3px' }}>
              <span style={{ flex: 1 }}>Producto</span>
              <span style={{ width: '30px', textAlign: 'center' }}>Ud</span>
              <span style={{ width: '55px', textAlign: 'right' }}>P.Unit</span>
              <span style={{ width: '60px', textAlign: 'right' }}>Subtotal</span>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '3px' }}>
              {sale.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>
                    {item.product_name || `Producto #${item.product_id}`}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '9px', color: '#555', fontStyle: 'italic' }}>
                      ▸ {item.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', fontSize: '10px', color: '#333' }}>
                    <span style={{ flex: 1 }}></span>
                    <span style={{ width: '30px', textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ width: '55px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</span>
                    <span style={{ width: '60px', textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div style={{ fontSize: '9px', color: '#666', textAlign: 'right' }}>
                      Desc: -{formatCurrency(item.discount)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Items count */}
            <div style={{ fontSize: '10px', color: '#555', textAlign: 'right', marginTop: '2px' }}>
              {totalItems} artículo{totalItems !== 1 ? 's' : ''}
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0', color: '#dc2626' }}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '1px 0' }}>
                  <span>Impuesto:</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ borderTop: '3px double #000', margin: '5px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', padding: '3px 0' }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div style={{ borderTop: '3px double #000', margin: '5px 0' }} />

            {/* Payment */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                <span style={{ color: '#555' }}>Método de pago:</span>
                <span style={{ fontWeight: 'bold' }}>{paymentMethodLabel(sale.payment_method)}</span>
              </div>
              {sale.amount_received != null && sale.payment_method === 'cash' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.5' }}>
                  <span style={{ color: '#555' }}>Recibido:</span>
                  <span>{formatCurrency(sale.amount_received)}</span>
                </div>
              )}
              {sale.change_given != null && sale.change_given > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.5' }}>
                  <span>Cambio:</span>
                  <span>{formatCurrency(sale.change_given)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                ¡Gracias por su compra!
              </div>
              {business?.slogan && (
                <div style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>
                  {business.slogan}
                </div>
              )}
              <div style={{ fontSize: '9px', color: '#999', marginTop: '6px' }}>
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
            style={{ color: '#6b7280', borderRadius: '8px', border: '1px solid #e5e7eb' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#00a86b', borderRadius: '8px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
          >
            <Printer size={16} />
            Imprimir Factura
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTicket;
