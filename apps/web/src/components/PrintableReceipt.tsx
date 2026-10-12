import React, { useState } from 'react';
import { Bill } from '../types';
import {
  Printer,
  X,
  Share2,
  Download,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import magicMugLogo from '../assets/logo.png';
import html2canvas from 'html2canvas';

interface PrintableReceiptProps {
  bill: Bill;
  onClose: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ bill, onClose }) => {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);

  const isVoid = bill.status === 'VOID';

  const handlePrint = () => {
    window.print();
  };

  // Helper: Generates crisp, clean PNG canvas from receipt element
  const generateReceiptCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const receiptElement = document.getElementById('printable-receipt');
    if (!receiptElement) return null;

    return await html2canvas(receiptElement, {
      scale: 3, // High DPI crisp rendering
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 400,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('printable-receipt');
        if (el) {
          el.style.width = '340px';
          el.style.maxWidth = '340px';
          el.style.margin = '0 auto';
          el.style.boxShadow = 'none';
          el.style.backgroundColor = '#ffffff';
          el.style.fontFamily = "'JetBrains Mono', 'Courier New', Courier, monospace";
          el.style.color = '#09090b';
          el.style.padding = '20px 16px';
          el.style.borderRadius = '16px';
          el.style.border = '1px solid #e2e8f0';

          const imgs = el.getElementsByTagName('img');
          for (let i = 0; i < imgs.length; i++) {
            imgs[i].style.width = '80px';
            imgs[i].style.height = '80px';
            imgs[i].style.maxWidth = '80px';
            imgs[i].style.maxHeight = '80px';
            imgs[i].style.objectFit = 'contain';
            imgs[i].style.display = 'block';
            imgs[i].style.margin = '0 auto 8px auto';
          }
        }
      },
    });
  };

  // 1. Share Receipt as PNG Image to WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      setIsSharingWhatsApp(true);
      const canvas = await generateReceiptCanvas();
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (blob) {
        const file = new File([blob], `MagicMug_Bill_${bill.bill_number}.png`, {
          type: 'image/png',
        });

        // 1. Native Web Share with PNG Image File (Mobile / Tablet / Modern desktop)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Magic Mug Bill #${bill.bill_number}`,
              files: [file],
            });
            setIsShareMenuOpen(false);
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') {
              // User dismissed dialog
              return;
            }
            console.warn('Native file share failed:', shareErr);
          }
        }

        // 2. Fallback: Copy image to clipboard and open WhatsApp
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
          }
        } catch (clipErr) {
          console.warn('Clipboard image copy failed:', clipErr);
        }

        window.open('https://web.whatsapp.com', '_blank');
        setIsShareMenuOpen(false);
      }
    } catch (err) {
      console.error('Failed to share bill as image:', err);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // 2. Download Receipt as PNG image
  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true);
      const canvas = await generateReceiptCanvas();
      if (!canvas) return;

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `MagicMug_Bill_${bill.bill_number}.png`;
      link.click();
      setIsShareMenuOpen(false);
    } catch (err) {
      console.error('Failed to export receipt PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-maroon-700" />
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Receipt Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-3 sm:p-6 overflow-y-auto flex justify-center items-start bg-slate-100/70 max-h-[72vh]">
          <div
            id="printable-receipt"
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', Courier, monospace",
              backgroundColor: '#ffffff',
              color: '#09090b',
            }}
            className="w-full max-w-[340px] bg-white text-zinc-950 p-4 sm:p-6 rounded-2xl shadow-lg text-xs relative select-none leading-relaxed border border-slate-200/90 h-fit"
          >
            {/* Void Watermark if applicable */}
            {isVoid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10">
                <div className="text-red-700 font-extrabold text-5xl transform -rotate-45 border-4 border-red-700 px-6 py-2 rounded-xl">
                  VOIDED
                </div>
              </div>
            )}

            {/* Receipt Header with Magic Mug Logo */}
            <div className="text-center pb-3.5" style={{ borderBottom: '1px dashed #a1a1aa' }}>
              <div style={{ width: '80px', height: '80px', margin: '0 auto 8px auto' }}>
                <img
                  src={magicMugLogo}
                  alt="Magic Mug"
                  width={80}
                  height={80}
                  style={{
                    width: '80px',
                    height: '80px',
                    maxWidth: '80px',
                    maxHeight: '80px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#18181b' }}>
                MAGIC MUG
              </div>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 600, letterSpacing: '0.05em', marginTop: '2px' }}>
                Not Just COFFEE
              </div>
              <div style={{ fontSize: '9.5px', color: '#71717a', lineHeight: 1.35, padding: '3px 8px 0 8px' }}>
                No 13/21, Avant Garde, Road, Nehru St, opposite to Turf Genesis, Nehru Nagar West, Coimbatore, Tamil Nadu 641014
              </div>
            </div>

            {/* Receipt Meta */}
            <div style={{ padding: '10px 0', borderBottom: '1px dashed #a1a1aa', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#71717a' }}>Bill No:</span>
                <span style={{ fontWeight: 700, color: '#18181b' }}>{bill.bill_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#71717a' }}>Date & Time:</span>
                <span style={{ color: '#27272a' }}>{formatDateTime(bill.bill_date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#71717a' }}>Cashier:</span>
                <span style={{ color: '#27272a' }}>{bill.creator_name || 'Cafe Owner (Magic Mug)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                <span style={{ color: '#71717a' }}>Status:</span>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    lineHeight: '1.2',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isVoid ? '#ffe4e6' : '#d1fae5',
                    color: isVoid ? '#be123c' : '#065f46',
                  }}
                >
                  {bill.status}
                </span>
              </div>
              {isVoid && bill.void_reason && (
                <div style={{ fontSize: '10px', color: '#e11d48', paddingTop: '2px' }}>
                  Reason: {bill.void_reason}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div style={{ padding: '10px 0', borderBottom: '1px dashed #a1a1aa' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #d4d4d8', color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ fontWeight: 700, paddingBottom: '6px', textAlign: 'left' }}>Item</th>
                    <th style={{ fontWeight: 700, paddingBottom: '6px', textAlign: 'center', width: '32px' }}>Qty</th>
                    <th style={{ fontWeight: 700, paddingBottom: '6px', textAlign: 'right', width: '60px', paddingRight: '8px' }}>Rate</th>
                    <th style={{ fontWeight: 700, paddingBottom: '6px', textAlign: 'right', width: '60px' }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, idx) => (
                    <tr key={idx} style={{ verticalAlign: 'top', borderTop: idx > 0 ? '1px solid #f4f4f5' : 'none' }}>
                      <td style={{ padding: '6px 6px 6px 0', fontWeight: 600, color: '#18181b', lineHeight: 1.3 }}>
                        {item.product_name_snapshot}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'center', color: '#3f3f46', fontWeight: 500 }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: '#52525b', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(item.unit_price_snapshot).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#09090b', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(item.line_total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ padding: '10px 0', borderBottom: '1px dashed #a1a1aa', fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(bill.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
                  <span>Discount:</span>
                  <span style={{ fontWeight: 600 }}>-₹{parseFloat(bill.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(bill.tax_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                  <span>Tax:</span>
                  <span style={{ fontWeight: 600 }}>+₹{parseFloat(bill.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: 900,
                  paddingTop: '8px',
                  marginTop: '4px',
                  borderTop: '1px solid #d4d4d8',
                  color: '#09090b',
                }}
              >
                <span>TOTAL:</span>
                <span style={{ fontSize: '15px' }}>₹{parseFloat(bill.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a', paddingTop: '4px' }}>
                <span>Payment Mode:</span>
                <span style={{ fontWeight: 700, color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {bill.payment_mode}
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div style={{ textAlign: 'center', paddingTop: '12px', paddingBottom: '4px', fontSize: '10px', color: '#71717a' }}>
              <div style={{ fontWeight: 700, color: '#18181b', letterSpacing: '0.05em', marginBottom: '3px' }}>
                THANK YOU FOR VISITING!
              </div>
              <div>Follow us on Instagram @magicmug_cbe</div>
            </div>
          </div>
        </div>

        {/* Share Options Drawer / Popover */}
        {isShareMenuOpen && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 animate-slide-up space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-maroon-700" />
                <span>Share Receipt Options</span>
              </div>
              <button
                onClick={() => setIsShareMenuOpen(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Cancel
              </button>
            </div>

            {/* Quick Share Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* WhatsApp Direct */}
              <button
                onClick={handleShareWhatsApp}
                disabled={isSharingWhatsApp}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer shadow-sm hover:shadow"
                title="Directly share PNG Bill on WhatsApp"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div>{isSharingWhatsApp ? 'Generating...' : 'WhatsApp'}</div>
                  <div className="text-[10px] text-emerald-600 font-normal">PNG Bill Image</div>
                </div>
              </button>

              {/* PNG Image Export */}
              <button
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer shadow-sm hover:shadow"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div>{isExportingPng ? 'Generating...' : 'Save as PNG'}</div>
                  <div className="text-[10px] text-amber-700 font-normal">High-res image</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions (3-Option Bottom Bar) */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Option 1: Close */}
          <button
            onClick={onClose}
            className="flex-1 px-2.5 sm:px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] sm:text-xs font-bold transition-colors text-center"
          >
            Close
          </button>

          {/* Option 2: Share Bill */}
          <button
            onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold transition-all border ${
              isShareMenuOpen
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-maroon-700" />
            <span>Share</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isShareMenuOpen ? 'rotate-180 text-white' : 'text-slate-400'
              }`}
            />
          </button>

          {/* Option 3: Print Receipt */}
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-[11px] sm:text-xs font-bold shadow-glow-maroon transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
