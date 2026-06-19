'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bed,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Landmark,
  Loader2,
  MapPin,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../../../lib/api';


declare global {
  interface Window {
    Razorpay?: any;
  }
}

type PaymentState = 'idle' | 'opening' | 'confirming' | 'success' | 'failed';
type PaymentMode = 'upi' | 'card' | 'netbanking' | 'wallet' | 'paylater';

const modeMeta: Record<PaymentMode, { label: string; icon: React.ReactNode; hint: string }> = {
  upi: { label: 'UPI QR', icon: <QrCode size={16} />, hint: 'Scan with any UPI app and confirm payment.' },
  card: { label: 'Cards', icon: <CreditCard size={16} />, hint: 'Pay using debit or credit card.' },
  netbanking: { label: 'Netbanking', icon: <Landmark size={16} />, hint: 'Continue with your bank account.' },
  wallet: { label: 'Wallet', icon: <Wallet size={16} />, hint: 'Use a supported wallet provider.' },
  paylater: { label: 'Pay Later', icon: <Clock3 size={16} />, hint: 'Use deferred payment options.' }
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatMoney(amount: string, currency: string) {
  const numericAmount = Number(amount || 0);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  if (currency === 'INR') return `INR ${safeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  if (currency === 'MAD') return `${safeAmount.toLocaleString('fr-MA', { maximumFractionDigits: 2 })} MAD`;
  if (currency === 'USD') return `USD ${safeAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `${safeAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency || 'EUR'}`;
}

function shortId(value: string, fallback: string) {
  if (!value) return fallback;
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function drawKeyValue(doc: jsPDF, label: string, value: string, x: number, y: number, valueWidth = 54) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(value || '-', valueWidth), x, y + 7);
}

function CheckoutPayContent() {
  const searchParams = useSearchParams();

  const [paymentId, setPaymentId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0000');
  const [hostelName, setHostelName] = useState('Roomify');
  const [gateway, setGateway] = useState<'razorpay' | 'demo'>('demo');
  const [currency, setCurrency] = useState('INR');
  const [razorpayOrderId, setRazorpayOrderId] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayAmount, setRazorpayAmount] = useState('');
  const [hostelCity, setHostelCity] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('DORM_MIXED');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

  const [selectedMode, setSelectedMode] = useState<PaymentMode>('upi');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [transactionRef, setTransactionRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setPaymentId(searchParams.get('paymentId') || '');
    setBookingId(searchParams.get('bookingId') || '');
    setAmount(searchParams.get('amount') || '0.00');
    setInvoiceNumber(searchParams.get('invoiceNumber') || 'INV-0000');
    setHostelName(searchParams.get('hostelName') || 'Roomify');
    setGateway((searchParams.get('gateway') as 'razorpay' | 'demo') || 'demo');
    setCurrency(searchParams.get('currency') || 'INR');
    setRazorpayOrderId(searchParams.get('razorpayOrderId') || '');
    setRazorpayKeyId(searchParams.get('razorpayKeyId') || '');
    setRazorpayAmount(searchParams.get('razorpayAmount') || '');
    setHostelCity(searchParams.get('hostelCity') || '');
    setHostelAddress(searchParams.get('hostelAddress') || '');
    setRoomNumber(searchParams.get('roomNumber') || '');
    setRoomType(searchParams.get('roomType') || 'DORM_MIXED');
    setCheckInDate(searchParams.get('checkIn') || '');
    setCheckOutDate(searchParams.get('checkOut') || '');
  }, [searchParams]);

  const displayAmount = useMemo(() => formatMoney(amount, currency), [amount, currency]);
  const isRealRazorpay = gateway === 'razorpay' && razorpayKeyId && razorpayOrderId;

  const handleDownloadReceipt = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentWidth = width - margin * 2;
    const orderText = shortId(bookingId || razorpayOrderId || 'demo-order', 'demo-order');
    const paidAt = new Date().toLocaleString();

    doc.setFillColor(37, 62, 232);
    doc.rect(0, 0, width, 42, 'F');
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 36, width, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('Payment Receipt', margin, 25);

    doc.setFillColor(34, 197, 94);
    doc.roundedRect(width - 52, 13, 34, 13, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text('PAID', width - 35, 21.5, { align: 'center' });

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, 55, contentWidth, 44, 4, 4, 'F');
    drawKeyValue(doc, 'Order ID', orderText, margin + 8, 68, 58);
    drawKeyValue(doc, 'Payment ID', shortId(transactionRef || 'demo-payment', 'demo-payment'), margin + 78, 68, 50);
    drawKeyValue(doc, 'Paid At', paidAt, margin + 138, 68, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Booking Details', margin, 119);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 126, width - margin, 126);

    drawKeyValue(doc, 'Hostel', hostelName, margin, 141, 72);
    drawKeyValue(doc, 'Invoice', invoiceNumber, margin + 84, 141, 54);
    drawKeyValue(doc, 'Gateway', isRealRazorpay ? 'Razorpay' : 'Demo Razorpay UI', margin + 146, 141, 38);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, 168, contentWidth, 42, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Summary', margin + 8, 182);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Hostel booking payment', margin + 8, 195);
    doc.text(displayAmount, width - margin - 8, 195, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 8, 201, width - margin - 8, 201);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Paid', margin + 8, 207);
    doc.setTextColor(34, 197, 94);
    doc.text(displayAmount, width - margin - 8, 207, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('This receipt was generated automatically by Roomify Management System.', width / 2, 278, { align: 'center' });

    doc.save(`receipt-${transactionRef || invoiceNumber}.pdf`);
  };

  const runDemoPayment = async () => {
    setPaymentState('confirming');
    setErrorMsg('');
    await new Promise(resolve => setTimeout(resolve, 1800));

    try {
      const generatedRef = `pay_demo_${Math.floor(100000000 + Math.random() * 900000000)}`;

      const res = await fetch(`${API_BASE_URL}/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: 'SUCCESS',
          transactionRef: generatedRef,
          paymentMethod: selectedMode === 'upi' ? 'BANK_TRANSFER' : 'CARD'
        })
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Payment failed.');
      }

      setTransactionRef(generatedRef);
      setPaymentState('success');
    } catch (error: any) {
      setErrorMsg(error.message || 'Impossible de finaliser le paiement demo.');
      setPaymentState('failed');
    }
  };

  const runRazorpayPayment = async () => {
    setPaymentState('opening');
    setErrorMsg('');

    const loaded = await loadRazorpayScript();

    if (!loaded || !window.Razorpay) {
      setErrorMsg('Razorpay Checkout ne peut pas etre charge. Verifiez votre connexion.');
      setPaymentState('failed');
      return;
    }

    const options = {
      key: razorpayKeyId,
      amount: Number(razorpayAmount) || Math.round(Number(amount) * 100),
      currency,
      name: hostelName,
      description: `Booking invoice ${invoiceNumber}`,
      order_id: razorpayOrderId,
      prefill: {
        name: 'Roomify Guest',
        email: 'guest@roomify.test',
        contact: '9876543210'
      },
      theme: {
        color: '#00d4aa'
      },
      handler: async (response: any) => {
        setPaymentState('confirming');

        try {
          await api.post('/payments/verify-razorpay', {
            paymentId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature
          });

          setTransactionRef(response.razorpay_payment_id);
          setPaymentState('success');
        } catch (error: any) {
          setErrorMsg(error.message || 'Verification Razorpay impossible.');
          setPaymentState('failed');
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentState('idle');
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handlePay = async () => {
    if (!paymentId) {
      setErrorMsg('Payment ID manquant.');
      return;
    }

    if (isRealRazorpay) {
      await runRazorpayPayment();
      return;
    }

    await runDemoPayment();
  };

  if (paymentState === 'success') {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#e8edf5] flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-xl rounded-2xl border border-[#1c2333] bg-[#0d1117]/95 p-8 shadow-2xl text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-[#00d4aa]/15 border border-[#00d4aa]/30 text-[#00d4aa] flex items-center justify-center mb-5">
            <CheckCircle2 size={38} />
          </div>

          <h1 className="text-2xl font-black text-white">Payment Successful</h1>
          <p className="text-xs text-[#8892a8] mt-2">
            Your booking is confirmed. You can download the receipt below.
          </p>

          <div className="mt-7 rounded-xl border border-[#1c2333] bg-[#080b12] p-4 text-left">
            <div className="grid grid-cols-[110px_1fr] gap-3 text-[11px] py-2">
              <span className="text-[#8892a8]">Order ID</span>
              <span className="font-mono text-white break-all">{bookingId || razorpayOrderId || 'demo-order'}</span>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-3 text-[11px] py-2">
              <span className="text-[#8892a8]">Payment ID</span>
              <span className="font-mono text-white break-all">{transactionRef}</span>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-3 text-[11px] py-2">
              <span className="text-[#8892a8]">Amount</span>
              <span className="font-bold text-[#00d4aa]">{displayAmount}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00d4aa] px-4 py-3 text-xs font-bold text-[#071017] hover:bg-[#00f0c8] transition-colors"
            >
              <Download size={14} /> Download Receipt
            </button>
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#1c2333] bg-[#0d1117] px-4 py-3 text-xs font-bold text-[#e8edf5] hover:border-[#00d4aa]/40 transition-colors"
            >
              View My Bookings <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e8edf5] px-4 py-8 sm:py-12 relative overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,#00d4aa38,transparent_58%)] pointer-events-none" />

      <main className="relative z-10 w-full max-w-6xl mx-auto">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <Link href="/rooms" className="inline-flex items-center gap-2 text-xs font-semibold text-[#00d4aa] hover:text-[#00f0c8]">
              <ShieldCheck size={15} /> Roomify Secure Checkout
            </Link>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
              Complete Your <span className="text-[#00f0c8]">Booking</span>
            </h1>
            <p className="mt-2 text-sm text-[#8892a8]">Review your invoice and choose a secure payment method.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#1c2333] bg-[#0d1117] px-4 py-2 text-[11px] font-bold text-[#8892a8]">
            <span className="h-2 w-2 rounded-full bg-[#00d4aa]" />
            {isRealRazorpay ? 'Razorpay Test/Live' : 'Demo Razorpay UI'}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <section className="rounded-2xl border border-[#1c2333] bg-[#0d1117]/95 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#00d4aa] to-[#08101d] p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/12 flex items-center justify-center font-black text-white">P</div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white break-words">{hostelName}</h2>
                  <p className="mt-1 text-[11px] text-white/70">Payment powered by Razorpay</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/95 p-5 text-[#111827]">
                <p className="text-[10px] font-black text-[#6b7280] uppercase tracking-wider">Total Amount</p>
                <p className="mt-2 text-3xl font-black">{displayAmount}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-[#1c2333] bg-[#080b12] p-4">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <ReceiptText size={16} className="text-[#00d4aa]" /> Invoice
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-[#8892a8]">{invoiceNumber}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex items-center gap-2 rounded-xl border border-[#1c2333] bg-[#080b12] p-3">
                  <Bed size={16} className="text-[#00f0c8]" />
                  <span className="text-[#8892a8]">Booking ID</span>
                  <span className="ml-auto max-w-[150px] truncate font-mono text-white">{bookingId || 'pending'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#1c2333] bg-[#080b12] p-3">
                  <MapPin size={16} className="text-[#00d4aa]" />
                  <span className="text-[#8892a8]">Gateway</span>
                  <span className="ml-auto font-bold text-white">{isRealRazorpay ? 'Razorpay' : 'Demo'}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-4 py-3 text-[11px] leading-relaxed text-[#9fffea]">
                In demo mode, the payment is simulated but the booking is confirmed in the database like a real flow.
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1c2333] bg-[#0d1117]/95 shadow-2xl overflow-hidden">
            <div className="border-b border-[#1c2333] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Payment Method</h2>
                <p className="mt-1 text-xs text-[#8892a8]">Select the method you want to demonstrate.</p>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-[#0d1117] px-3 py-1 text-[10px] font-bold text-[#8892a8]">
                Secure
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
              <nav className="border-b md:border-b-0 md:border-r border-[#1c2333] bg-[#080b12]/65 p-4">
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                  {(Object.keys(modeMeta) as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-bold transition-all ${
                        selectedMode === mode
                          ? 'bg-[#00d4aa] text-white shadow-lg shadow-[#00d4aa]/20'
                          : 'bg-[#0d1117] text-[#8892a8] hover:bg-[#0d1117] hover:text-white'
                      }`}
                    >
                      {modeMeta[mode].icon}
                      <span>{modeMeta[mode].label}</span>
                    </button>
                  ))}
                </div>
              </nav>

              <div className="p-6">
                <div className="rounded-2xl border border-[#1c2333] bg-[#080b12] p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#00f0c8]">Recommended</p>

                  {selectedMode === 'upi' ? (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-5 items-center">
                      <div className="w-36 h-36 rounded-2xl bg-white p-3 grid grid-cols-5 gap-1 shadow-inner">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <span key={i} className={`${i % 3 === 0 || i % 7 === 0 ? 'bg-[#080b12]' : 'bg-[#0d1117]'} rounded-[2px]`} />
                        ))}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">UPI QR</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[#8892a8]">
                          Scan the generated QR code using any UPI application, then confirm the payment in the secure gateway.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                            <span key={app} className="rounded-full bg-[#0d1117] px-3 py-1.5 text-[10px] font-bold text-[#8892a8]">
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#00d4aa]/15 text-[#00f0c8] flex items-center justify-center">
                        {modeMeta[selectedMode].icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">{modeMeta[selectedMode].label}</h3>
                        <p className="mt-2 text-sm text-[#8892a8]">{modeMeta[selectedMode].hint}</p>
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="mt-4 rounded-xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/10 px-4 py-3 text-xs font-semibold text-[#ff4d6d]">
                    {errorMsg}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-[#1c2333] bg-[#080b12] p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8892a8]">Amount to pay</span>
                    <span className="font-black text-white">{displayAmount}</span>
                  </div>
                  <button
                    onClick={handlePay}
                    disabled={paymentState === 'opening' || paymentState === 'confirming'}
                    className="mt-4 w-full rounded-xl bg-[#00d4aa] px-4 py-3.5 text-sm font-black text-[#061014] hover:bg-[#00f0c8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {paymentState === 'opening' && <><Loader2 size={16} className="animate-spin" /> Opening Razorpay...</>}
                    {paymentState === 'confirming' && <><Loader2 size={16} className="animate-spin" /> Confirming Payment...</>}
                    {paymentState === 'idle' && <>Pay {displayAmount} <ArrowRight size={16} /></>}
                    {paymentState === 'failed' && <>Retry Payment <ArrowRight size={16} /></>}
                  </button>
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8892a8]">
                    <ShieldCheck size={14} className="text-[#00d4aa]" />
                    Razorpay-style secure checkout. Demo fallback works without API keys.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPay() {
  return (
    <Suspense fallback={
      <div className="flex-1 min-h-screen bg-[#080b12] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d4aa]"></div>
        <span className="text-xs text-[#8892a8] mt-4">Chargement securise de la passerelle...</span>
      </div>
    }>
      <CheckoutPayContent />
    </Suspense>
  );
}

