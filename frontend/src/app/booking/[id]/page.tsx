'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { getDemoBookings } from '../../../lib/demo-bookings';
import { useAuth } from '../../../hooks/use-auth';
import {
  ArrowLeft, Building2, MapPin, Bed, Calendar, CreditCard, Download,
  QrCode, Share2, CheckCircle2, AlertCircle, Loader2, FileText,
  Clock, ExternalLink, Globe, Sun, CloudSun, ChevronRight
} from 'lucide-react';
import { generateInvoicePdf } from '../../../lib/pdf';
import { generateIcsFile } from '../../../lib/calendar';
import dynamic from 'next/dynamic';

const HostelMap = dynamic(() => import('../../../components/hostel-map'), { ssr: false });
const WeatherWidget = dynamic(() => import('../../../components/weather-widget'), { ssr: false });
const CountryInfo = dynamic(() => import('../../../components/country-info'), { ssr: false });
const BookingTimeline = dynamic(() => import('../../../components/booking-timeline'), { ssr: false });

function getHostelImage(city: string, name: string) {
  const images: Record<string, string> = {
    marrakech: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?auto=format&fit=crop&w=1200&q=80',
    essaouira: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    rabat: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    chefchaouen: 'https://images.unsplash.com/photo-1548625361-155deee223d5?auto=format&fit=crop&w=1200&q=80',
    fes: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?auto=format&fit=crop&w=1200&q=80',
    tangier: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=80',
    agadir: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    ouarzazate: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?auto=format&fit=crop&w=1200&q=80',
    casablanca: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=80',
    meknes: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  };
  const c = (city || '').toLowerCase();
  for (const [key, url] of Object.entries(images)) {
    if (c.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
}

function getRoomImage(type: string) {
  const images: Record<string, string> = {
    DORM_FEMALE: 'https://images.unsplash.com/photo-1623625409419-f7027670783a?auto=format&fit=crop&w=800&q=80',
    DORM_MALE: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    PRIVATE_ROOM: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    DORM_MIXED: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
  };
  return images[type] || images.DORM_MIXED;
}

export default function BookingDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);

  const resolveDemoBooking = () => {
    const id = String(params?.id || '');
    return getDemoBookings().find(item => item.id === id || item.invoiceNumber === id) || null;
  };

  useEffect(() => {
    let isMounted = true;

    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (!params?.id) { setError('ID de réservation manquant'); setLoading(false); return; }

    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${params.id}`);
        if (!isMounted) return;
        setBooking(res.data.booking);
        setError('');
      } catch (err: any) {
        if (!isMounted) return;
        const demoBooking = resolveDemoBooking();
        if (demoBooking) {
          setBooking(demoBooking);
          setError('');
          return;
        }

        setError(err.message || 'Impossible de charger la réservation.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };
    fetchBooking();
    return () => {
      isMounted = false;
    };
  }, [params?.id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#080b12] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#8892a8] font-medium">Chargement de votre réservation...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#080b12] flex flex-col items-center justify-center gap-4 px-4">
        <div className="p-4 rounded-full bg-[#ff4d6d]/10 border border-[#ff4d6d]/20">
          <AlertCircle size={32} className="text-[#ff4d6d]" />
        </div>
        <p className="text-sm text-[#ff4d6d] font-semibold">{error || 'Réservation introuvable'}</p>
        <Link href="/dashboard" className="px-6 py-2.5 bg-[#00d4aa] text-[#080b12] font-bold text-xs rounded-xl transition-all hover:bg-[#00f0c8]">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const hostel = booking.room?.hostel;
  const room = booking.room;
  const bed = booking.bed;
  const payment = booking.payments?.[0];
  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      CONFIRMED: 'bg-[#00d4aa]/10 text-[#00d4aa] border-[#00d4aa]/20',
      COMPLETED: 'bg-[#00f0c8]/10 text-[#00f0c8] border-[#00f0c8]/20',
      PENDING: 'bg-[#00c8b3]/10 text-[#00c8b3] border-[#00c8b3]/20',
      REJECTED: 'bg-[#ff4d6d]/10 text-[#ff4d6d] border-[#ff4d6d]/20',
      CANCELLED: 'bg-[#242d3f]/10 text-[#8892a8] border-[#242d3f]/20',
    };
    return map[s] || 'bg-[#242d3f] text-[#8892a8]';
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { CONFIRMED: '✅ Confirmé', COMPLETED: '🔑 Check-in effectué', PENDING: '⏳ En attente', REJECTED: '❌ Refusé', CANCELLED: '🚫 Annulé' };
    return map[s] || s;
  };

  const handlePdf = () => {
    generateInvoicePdf({
      invoiceNumber: payment?.invoiceNumber || 'N/A',
      guestName: `${booking.guest?.user?.firstName || ''} ${booking.guest?.user?.lastName || ''}`,
      hostelName: hostel?.name || '',
      roomNumber: room?.roomNumber || '',
      bedNumber: bed?.bedNumber,
      checkInDate: formatDate(checkIn),
      checkOutDate: formatDate(checkOut),
      totalPrice: Number(booking.totalPrice),
      amountPaid: payment?.status === 'PAID' ? Number(booking.totalPrice) : 0,
      status: payment?.status || 'UNPAID'
    });
  };

  const handleCalendar = () => {
    generateIcsFile({
      summary: `Séjour - ${hostel?.name || ''}`,
      description: `Réservation ${payment?.invoiceNumber || ''} - Chambre ${room?.roomNumber || ''}${bed ? ', Lit ' + bed.bedNumber : ''}`,
      location: `${hostel?.name || ''}, ${hostel?.address || ''}, ${hostel?.city || ''}`,
      startDate: checkIn,
      endDate: checkOut,
      uid: booking.id
    });
  };

  const qrPayload = booking?.qrCodeUrl || `booking:${booking?.id || params?.id || ''}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="min-h-screen bg-[#080b12] text-[#e8edf5] relative overflow-y-auto">
      {/* Background glows */}
        <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00d4aa]/5 blur-[140px] pointer-events-none" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00f0c8]/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-[#1c2333] bg-[#080b12]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-[#8892a8] hover:text-white transition-colors">
              <ArrowLeft size={16} />
              <span className="text-xs font-semibold">Retour</span>
            </Link>
            <div className="h-4 w-px bg-[#1c2333]" />
            <Link href="/" className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00d4aa]/15 text-[#00d4aa]">
                <Building2 size={16} />
              </span>
              <span className="font-bold text-xs bg-gradient-to-r from-white to-[#8892a8] bg-clip-text text-transparent">
                Smart<span className="text-[#00d4aa]">Hostel</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
            <span className="text-[9px] font-bold text-[#8892a8] uppercase tracking-wider">Sécurisé</span>
          </div>
        </div>
      </header>

      {/* Hero Photo Section */}
      <div className="relative w-full h-[280px] sm:h-[380px] overflow-hidden">
        <img
          src={getHostelImage(hostel?.city || '', hostel?.name || '')}
          alt={hostel?.name || ''}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-[#080b12]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[#00d4aa] text-[#080b12] text-[9px] font-extrabold rounded uppercase tracking-wider">
                {hostel?.city || ''}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${statusColor(booking.status)}`}>
                {statusLabel(booking.status)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{hostel?.name || ''}</h1>
            <div className="flex items-center gap-3 mt-2 text-[#8892a8] text-xs">
              <span className="flex items-center gap-1"><MapPin size={12} /> {hostel?.address || ''}, {hostel?.city || ''}</span>
              <CountryInfo countryName={hostel?.city || ''} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* MAIN COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Booking Timeline */}
            <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#00d4aa] flex items-center gap-1.5">
                  <Clock size={14} /> Statut du séjour
                </h3>
                <span className="text-[10px] text-[#00d4aa] font-mono font-bold">{payment?.invoiceNumber || ''}</span>
              </div>
              <BookingTimeline status={booking.status} paymentStatus={booking.paymentStatus} checkInDate={booking.checkInDate} />
            </div>

            {/* Room Details */}
            <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-48 h-32 rounded-xl overflow-hidden shrink-0">
                  <img src={getRoomImage(room?.type || '')} alt={room?.type || ''} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <h3 className="font-bold text-sm text-[#e8edf5] flex items-center gap-2">
                    <Bed size={16} className="text-[#00d4aa]" />
                    Chambre {room?.roomNumber || ''} {bed ? `· Lit ${bed.bedNumber}` : ''}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Type</span>
                      <span className="text-xs font-semibold">{(room?.type || '').replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Étage</span>
                      <span className="text-xs font-semibold">{room?.floor || ''}e</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Arrivée</span>
                      <span className="text-xs font-semibold">{formatDate(checkIn)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Départ</span>
                      <span className="text-xs font-semibold">{formatDate(checkOut)}</span>
                    </div>
                  </div>
                  {room?.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {room.amenities.map((am: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-[#080b12] border border-[#1c2333] rounded text-[9px] text-[#8892a8] font-medium">
                          {am}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Info */}
            {booking.guest?.user && (
              <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#00d4aa] mb-4 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#38bdf8] flex items-center justify-center text-[8px] font-bold text-[#080b12]">
                    {booking.guest.user.firstName?.[0]}{booking.guest.user.lastName?.[0]}
                  </span>
                  Voyageur
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Nom</span>
                    <span className="text-xs font-semibold">{booking.guest.user.firstName} {booking.guest.user.lastName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Email</span>
                    <span className="text-xs font-semibold text-[#00d4aa]">{booking.guest.user.email}</span>
                  </div>
                  {booking.guest.user.phone && (
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Téléphone</span>
                      <span className="text-xs font-semibold">{booking.guest.user.phone}</span>
                    </div>
                  )}
                  {booking.guest?.nationality && (
                    <div>
                      <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold block">Nationalité</span>
                      <span className="text-xs font-semibold">{booking.guest.nationality}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map */}
            {hostel && (
              <HostelMap address={hostel.address || ''} city={hostel.city || ''} hostelName={hostel.name || ''} />
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={handlePdf} className="p-4 bg-[#0d1117]/60 border border-[#1c2333] rounded-xl hover:border-[#00d4aa]/30 transition-all flex flex-col items-center gap-2 cursor-pointer group">
                <FileText size={20} className="text-[#00d4aa] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-[#8892a8] uppercase tracking-wider">PDF Facture</span>
              </button>
              <button onClick={handleCalendar} className="p-4 bg-[#0d1117]/60 border border-[#1c2333] rounded-xl hover:border-[#00d4aa]/30 transition-all flex flex-col items-center gap-2 cursor-pointer group">
                <Calendar size={20} className="text-[#38bdf8] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-[#8892a8] uppercase tracking-wider">Calendrier</span>
              </button>
              <button onClick={() => setShowQr(true)} className="p-4 bg-[#0d1117]/60 border border-[#1c2333] rounded-xl hover:border-[#00d4aa]/30 transition-all flex flex-col items-center gap-2 cursor-pointer group">
                <QrCode size={20} className="text-[#00e676] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-[#8892a8] uppercase tracking-wider">QR Code</span>
              </button>
              <button onClick={() => { if (navigator.share) navigator.share({ title: `Séjour ${hostel?.name}`, text: `Ma réservation ${payment?.invoiceNumber} du ${formatDate(checkIn)} au ${formatDate(checkOut)}` }); }} className="p-4 bg-[#0d1117]/60 border border-[#1c2333] rounded-xl hover:border-[#00d4aa]/30 transition-all flex flex-col items-center gap-2 cursor-pointer group">
                <Share2 size={20} className="text-[#ffab40] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-[#8892a8] uppercase tracking-wider">Partager</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* Weather */}
            <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-[#ffab40] flex items-center gap-1.5 mb-3">
                <Sun size={14} /> Météo du séjour
              </h3>
              <WeatherWidget city={hostel?.city || ''} checkIn={booking.checkInDate} checkOut={booking.checkOutDate} />
              <div className="mt-3 text-[9px] text-[#5a6478]">Prévisions pour {hostel?.city || 'la destination'}</div>
            </div>

            {/* Price Summary */}
            <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-[#00e676] flex items-center gap-1.5 mb-4">
                <CreditCard size={14} /> Résumé des paiements
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8892a8]">{nights} nuits × {Number(room?.pricePerNight || 0).toFixed(2)} EUR</span>
                  <span className="font-semibold">{Number(booking.totalPrice).toFixed(2)} EUR</span>
                </div>
                <div className="border-t border-[#1c2333] pt-3 flex justify-between items-center">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-black text-lg text-[#00d4aa]">{Number(booking.totalPrice).toFixed(2)} EUR</span>
                </div>
                {payment && (
                  <div className="border-t border-[#1c2333] pt-3 flex justify-between items-center">
                    <span className="text-[9px] text-[#5a6478] uppercase tracking-wider font-bold">Paiement</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${payment.status === 'PAID' ? 'bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20' : 'bg-[#ff4d6d]/10 text-[#ff4d6d] border border-[#ff4d6d]/20'}`}>
                      {payment.status === 'PAID' ? 'Payé' : 'Impayé'}
                    </span>
                  </div>
                )}
                {payment?.transactionRef && (
                  <div className="text-[9px] text-[#5a6478] font-mono border-t border-[#1c2333] pt-3">
                    Réf: {payment.transactionRef}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-5 rounded-2xl shadow-xl">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5 mb-3">
                <Globe size={14} /> Infos pratiques
              </h3>
              <div className="space-y-2.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#8892a8]">Check-in</span>
                  <span className="font-semibold">14:00 - 22:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8892a8]">Check-out</span>
                  <span className="font-semibold">Jusqu'à 11:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8892a8]">WiFi</span>
                  <span className="font-semibold text-[#00e676]">Gratuit ✓</span>
                </div>
                {hostel?.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#8892a8]">Contact</span>
                    <span className="font-semibold">{hostel.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQr && qrPayload && (
        <div className="fixed inset-0 bg-[#080b12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-[#1c2333] p-6 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 shadow-2xl relative">
            <button onClick={() => setShowQr(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1c2333] text-[#8892a8] hover:text-white transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <h3 className="font-extrabold text-[#e8edf5] text-sm">QR Code Check-in</h3>
            <div className="p-3 bg-white rounded-2xl border border-[#1c2333]">
              <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 rounded-xl" />
            </div>
            <p className="text-[10px] text-[#8892a8] text-center">Présentez ce QR Code à la réception pour votre check-in.</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1c2333] py-6 text-center">
        <p className="text-[10px] text-[#5a6478]">Roomify System · Document généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </footer>
    </div>
  );
}
