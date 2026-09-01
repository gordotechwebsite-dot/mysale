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
  img { filter: grayscale(1) brightness(0.75) contrast(4) !important; }
`;

const IMAGES_TIMEOUT_MS = 2000;

function waitForImages(doc: Document): Promise<void> {
  const pending = Array.from(doc.images).filter(img => !img.complete);
  if (pending.length === 0) return Promise.resolve();

  const loaded = Promise.all(
    pending.map(img => new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    }))
  ).then(() => undefined);

  const timeout = new Promise<void>(resolve => setTimeout(resolve, IMAGES_TIMEOUT_MS));
  return Promise.race([loaded, timeout]);
}

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
  waitForImages(printWindow.document).then(printAndClose);
  setTimeout(printAndClose, IMAGES_TIMEOUT_MS + 500);
}
