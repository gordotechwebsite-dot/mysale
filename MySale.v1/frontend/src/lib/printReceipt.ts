const legibilityStyles = `
  body, body * {
    color: #000 !important;
    font-style: normal !important;
    text-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body, body * { font-weight: 700 !important; }
  body { font-size: 13px !important; line-height: 1.4 !important; }
`;

export function printReceiptWindow(title: string, styles: string, bodyHTML: string) {
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${title}</title>
    <style>${styles}${legibilityStyles}</style></head>
    <body>${bodyHTML}</body></html>
  `);
  printWindow.document.close();

  let printed = false;
  const printAndClose = () => {
    if (printed || printWindow.closed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  printWindow.addEventListener('afterprint', () => printWindow.close());
  printWindow.onload = printAndClose;
  setTimeout(printAndClose, 700);
}
