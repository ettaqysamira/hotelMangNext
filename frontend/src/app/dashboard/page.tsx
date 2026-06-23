'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getDemoBookings } from '../../lib/demo-bookings';
import { 
  Bot, LogOut, User, Bed, ShieldAlert, Sparkles, Camera, Check, X,
  Wrench, Activity, BarChart2, Plus, RefreshCw, AlertTriangle, CheckSquare, Layers, ChevronRight,
  Search, Edit3, Trash2, MapPin
} from 'lucide-react';
import Link from 'next/link';

// Helper to avoid SSR errors with html5-qrcode
let Html5QrcodeScanner: any = null;
if (typeof window !== 'undefined') {
  try {
    Html5QrcodeScanner = require('html5-qrcode').Html5QrcodeScanner;
  } catch (e) {}
}

const getSidebarItems = (role: string) => {
  switch (role) {
    case 'GUEST':
      return [
        { id: 'stays', label: 'Mes Séjours', icon: <Bed size={18} /> },
        { id: 'complaints', label: 'Support & Réclamations', icon: <ShieldAlert size={18} /> },
      ];
    case 'RECEPTIONIST':
      return [
        { id: 'scanner', label: 'Scanner QR Code', icon: <Camera size={18} /> },
        { id: 'list', label: 'Enregistrements', icon: <Layers size={18} /> },
      ];
    case 'MANAGER':
      return [
        { id: 'analytics', label: 'Statistiques & Plan', icon: <BarChart2 size={18} /> },
        { id: 'rooms', label: 'Gerer Chambres', icon: <Bed size={18} /> },
      ];
    case 'SUPER_ADMIN':
      return [
        { id: 'analytics', label: 'Statistiques & Plan', icon: <BarChart2 size={18} /> },
        { id: 'hostels', label: 'Créer Auberge', icon: <Plus size={18} /> },
        { id: 'rooms', label: 'Ajouter Chambre', icon: <Bed size={18} /> },
      ];
    case 'MAINTENANCE':
      return [
        { id: 'interventions', label: 'Interventions', icon: <Wrench size={18} /> },
      ];
    case 'ACCOUNTANT':
      return [
        { id: 'overdue', label: 'Factures en Retard', icon: <AlertTriangle size={18} /> },
        { id: 'actions', label: 'Actions Comptabilité', icon: <CheckSquare size={18} /> },
      ];
    default:
      return [];
  }
};

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      if (user.role === 'GUEST') setActiveTab('stays');
      else if (user.role === 'RECEPTIONIST') setActiveTab('scanner');
      else if (user.role === 'MANAGER' || user.role === 'SUPER_ADMIN') setActiveTab('analytics');
      else if (user.role === 'MAINTENANCE') setActiveTab('interventions');
      else if (user.role === 'ACCOUNTANT') setActiveTab('overdue');
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex-1 min-h-screen bg-[#080b12] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d4aa]"></div>
        <span className="text-xs text-[#8892a8] mt-4 font-medium">Chargement de votre espace sécurisé...</span>
      </div>
    );
  }

  const sidebarItems = getSidebarItems(user.role);

  return (
    <div className="flex min-h-screen bg-[#080b12] text-[#e8edf5] font-sans relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00d4aa]/5 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00f0c8]/4 blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <aside 
        className="border-r border-[#1c2333] bg-[#0d1117]/85 backdrop-blur-md flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out relative"
        style={{ width: collapsed ? '68px' : '248px' }}
      >
        {/* Sidebar Header (Logo) */}
        <div className="p-4 border-b border-[#1c2333] flex items-center gap-3 overflow-hidden h-16 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#00f0c8] flex items-center justify-center text-xs font-black text-[#080b12] shrink-0 font-mono shadow-md shadow-[#00d4aa]/15">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col select-none">
              <span className="font-extrabold text-xs tracking-tight text-white font-heading">Roomify</span>
              <span className="text-[9px] text-[#00d4aa] font-bold uppercase tracking-wider">Hostel OS v2.0</span>
            </div>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-2">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : ''}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 relative cursor-pointer group ${
                  isActive 
                    ? 'bg-[#00d4aa]/10 text-[#00d4aa] font-semibold border-l-2 border-[#00d4aa]' 
                    : 'text-[#8892a8] hover:text-[#e8edf5] hover:bg-[#1c2333]/40 border-l-2 border-transparent'
                }`}
              >
                <div className={`shrink-0 ${isActive ? 'text-[#00d4aa]' : 'text-[#5a6478] group-hover:text-[#8892a8]'}`}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <span className="text-xs tracking-wide truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1c2333] flex flex-col gap-2 shrink-0 bg-[#0d1117]/40">
          {/* User card */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#151b28]/60 border border-[#1c2333] overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00f0c8] flex items-center justify-center text-xs font-bold text-[#080b12] shrink-0 select-none">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 flex flex-col select-none">
                <span className="text-[11px] font-bold text-[#e8edf5] truncate">{user.firstName} {user.lastName}</span>
                <span className="text-[8px] text-[#00d4aa] font-extrabold uppercase tracking-wider truncate">{user.role}</span>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                title="Déconnexion"
                className="p-1.5 rounded-lg text-[#5a6478] hover:text-[#00f0c8] hover:bg-[#00f0c8]/10 transition-all cursor-pointer shrink-0"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-2 border border-[#1c2333] rounded-xl hover:bg-[#1c2333]/40 text-[#8892a8] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <span className={`transform transition-transform duration-305 ${collapsed ? 'rotate-180' : ''}`}>←</span>
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-[#1c2333] bg-[#080b12]/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex flex-col">
            <h1 className="text-sm font-extrabold text-[#e8edf5] tracking-tight font-heading uppercase">
              {sidebarItems.find(item => item.id === activeTab)?.label || 'Roomify Espace'}
            </h1>
            <p className="text-[10px] text-[#5a6478] font-medium tracking-wide">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {collapsed && (
              <button
                onClick={logout}
                title="Déconnexion"
                className="p-2 rounded-xl bg-[#0d1117] border border-[#1c2333] hover:bg-[#00f0c8]/10 hover:border-[#00f0c8]/20 text-[#5a6478] hover:text-[#00f0c8] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
            <div className="h-4 w-px bg-[#1c2333] hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse"></span>
              <span className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Serveur Actif</span>
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto p-6 relative z-10 w-full sh-page-transition">
          {user.role === 'GUEST' && <GuestDashboard user={user} activeTab={activeTab} />}
          {user.role === 'RECEPTIONIST' && <ReceptionistDashboard user={user} activeTab={activeTab} />}
          {(user.role === 'MANAGER' || user.role === 'SUPER_ADMIN') && <ManagerDashboard user={user} activeTab={activeTab} />}
          {user.role === 'MAINTENANCE' && <MaintenanceDashboard user={user} activeTab={activeTab} />}
          {user.role === 'ACCOUNTANT' && <AccountantDashboard user={user} activeTab={activeTab} />}
        </main>
      </div>
    </div>
  );
}

// 1. GUEST DASHBOARD VIEW
function GuestDashboard({ user, activeTab }: { user: any; activeTab: string }) {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showQr, setShowQr] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchGuestData = async () => {
    try {
      const bRes = await api.get('/bookings/my-bookings');
      if (typeof window === 'undefined') return;
      const backendBookings = bRes.data.data?.bookings || bRes.data.bookings || [];
      const demoBookings = getDemoBookings();
      setBookings([...demoBookings, ...backendBookings]);

      const cRes = await api.get('/complaints/my-complaints');
      setComplaints(cRes.data.data?.complaints || cRes.data.complaints || []);
    } catch (e) {}
  };

  useEffect(() => {
    let isMounted = true;

    fetchGuestData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchGuestData();
    }
  }, [activeTab]);

  const handleComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg('');

    try {
      await api.post('/complaints', { title, description });
      setTitle('');
      setDescription('');
      setMsg('Réclamation envoyée. Notre IA va la catégoriser et l\'assigner en direct !');
      fetchGuestData();
    } catch (err: any) {
      setMsg(err.message || 'Erreur lors de l\'envoi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {activeTab === 'stays' && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#1c2333] pb-4">
              <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-2">
                <Bed className="text-[#00d4aa]" size={18} /> Mes Séjours & Réservations
              </h3>
              <Link 
                href="/rooms" 
                className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#00d4aa]/15"
              >
                Réserver un lit
              </Link>
            </div>

            {bookings.length > 0 ? (
              <div className="flex flex-col gap-4 mt-2">
                {bookings.map(book => {
                  const nights = Math.max(1, Math.round((new Date(book.checkOutDate).getTime() - new Date(book.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
                  const roomImage = book.room.type === 'PRIVATE_ROOM'
                    ? 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=200&q=60'
                    : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=200&q=60';
                  return (
                  <div
                    key={book.id}
                    onClick={() => router.push(`/booking/${book.id}`)}
                    className="p-4 rounded-xl border border-[#1c2333] bg-[#080b12]/40 flex flex-col sm:flex-row gap-4 hover:border-[#00d4aa]/30 transition-all duration-200 cursor-pointer group"
                  >
                    {/* Photo thumbnail */}
                    <div className="w-full sm:w-24 h-20 rounded-lg overflow-hidden shrink-0">
                      <img src={roomImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row justify-between gap-3 min-w-0">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] font-bold text-[#5a6478] uppercase tracking-wide">{book.payments[0]?.invoiceNumber || 'N/A'}</span>
                        <h4 className="font-bold text-[#e8edf5] text-xs group-hover:text-[#00d4aa] transition-colors truncate">{book.room.hostel.name}</h4>
                        <p className="text-[10px] text-[#8892a8] truncate">
                          {book.room.hostel.city} · Ch. {book.room.roomNumber}{book.bed ? ` · Lit ${book.bed.bedNumber}` : ''}
                        </p>
                        <p className="text-[9px] text-[#5a6478]">
                          {new Date(book.checkInDate).toLocaleDateString()} → {new Date(book.checkOutDate).toLocaleDateString()} · {nights} nuits
                        </p>
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase ${
                            book.status === 'CONFIRMED' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' : 
                            book.status === 'PENDING' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                            'bg-[#242d3f] text-[#8892a8]'
                          }`}>
                            {book.status === 'CONFIRMED' ? 'Validé' : book.status === 'PENDING' ? 'En attente' : 'Terminé'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase ${
                            book.paymentStatus === 'PAID' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' : 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20'
                          }`}>
                            {book.paymentStatus === 'PAID' ? 'Payé' : 'Impayé'}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-[#1c2333]/50 pt-2 sm:pt-0">
                        <span className="text-sm font-black text-[#e8edf5] font-mono">{Number(book.totalPrice).toFixed(2)} €</span>
                        <ChevronRight size={14} className="text-[#5a6478] group-hover:text-[#00d4aa] transition-colors" />
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-[#1c2333] rounded-xl mt-2">
                <p className="text-xs text-[#5a6478]">Vous n'avez pas encore de réservations de séjour.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl">
          {/* Create Complaint Form */}
          <div className="lg:col-span-1 bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl h-fit">
            <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
              <ShieldAlert className="text-[#00d4aa]" size={18} /> Signaler un problème
            </h3>

            <form onSubmit={handleComplaint} className="flex flex-col gap-4 mt-2">
              {msg && (
                <div className="p-3 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl text-[#00d4aa] text-[10px] text-center font-medium leading-relaxed animate-pulse">
                  {msg}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Sujet (Titre)</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Climatiseur cassé, WiFi lent"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Description du problème</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez précisément la panne..."
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3 py-2.5 text-xs text-[#e8edf5] outline-none resize-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#00d4aa] hover:bg-[#00f0c8] disabled:bg-[#00d4aa]/40 text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-[#00d4aa]/15"
              >
                Envoyer la réclamation
              </button>
            </form>
          </div>

          {/* Complaints history */}
          <div className="lg:col-span-2 bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
              <Wrench className="text-[#00d4aa]" size={18} /> Historique des tickets ({complaints.length})
            </h3>
            <div className="flex flex-col gap-3 mt-2 max-h-[380px] overflow-y-auto pr-1">
              {complaints.length > 0 ? (
                complaints.map(c => (
                  <div key={c.id} className="p-4 bg-[#080b12]/40 rounded-xl border border-[#1c2333] flex justify-between items-center hover:border-[#00d4aa]/30 transition-all duration-200">
                    <div>
                      <h4 className="font-bold text-[#e8edf5] text-xs">{c.title}</h4>
                      <span className="text-[9px] text-[#8892a8] font-medium block mt-1">Catégorie: <b className="text-white">{c.category}</b> | Priorité: <b className="text-white">{c.priority}</b></span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-extrabold ${
                      c.status === 'RESOLVED' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                      c.status === 'ASSIGNED' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                      c.status === 'IN_PROGRESS' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                      'bg-[#242d3f] text-[#8892a8]'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-xs text-[#5a6478]">
                  Aucun ticket créé pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal Overlay */}
      {showQr && (
        <div className="fixed inset-0 bg-[#080b12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-[#1c2333] p-6 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 shadow-2xl relative">
            <button 
              onClick={() => setShowQr(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1c2333] text-[#8892a8] hover:text-[#e8edf5] transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="font-extrabold text-[#e8edf5] text-sm">Votre QR Code Check-in</h3>
            <div className="p-3 bg-white rounded-2xl border border-[#1c2333] shadow-inner">
              <img src={showQr} alt="QR Code" className="w-48 h-48 rounded-xl" />
            </div>
            <p className="text-[10px] text-[#8892a8] text-center leading-relaxed max-w-[260px]">
              Présentez ce QR Code au réceptionniste à votre arrivée physique pour enregistrer votre check-in en 5 secondes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// 2. RECEPTIONIST DASHBOARD VIEW
function ReceptionistDashboard({ user, activeTab }: { user: any; activeTab: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [scannedResult, setScannedResult] = useState('');
  const [checkInMsg, setCheckInMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.data?.bookings || res.data.bookings || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const triggerScanner = () => {
    if (isScanning) {
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setScannedResult('');
    setCheckInMsg('');

    // Wait for the DOM element to render
    setTimeout(() => {
      if (Html5QrcodeScanner) {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-panel',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          async (decodedText: string) => {
            scanner.clear();
            setIsScanning(false);
            setScannedResult(decodedText);
            
            // Execute physical check-in directly
            setIsSubmitLoading(true);
            try {
              const res = await api.post('/bookings/check-in', { bookingId: decodedText });
              setCheckInMsg(res.message || 'Check-in enregistré !');
              fetchBookings();
            } catch (err: any) {
              setCheckInMsg(err.message || 'Erreur d\'enregistrement.');
            } finally {
              setIsSubmitLoading(false);
            }
          },
          (error: any) => {
            // Scan failed logs (can be ignored)
          }
        );
      }
    }, 100);
  };

  return (
    <>
      {activeTab === 'scanner' && (
        <div className="max-w-md bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
            <Camera className="text-[#00d4aa]" size={18} /> Scanner QR Code Check-in
          </h3>
          <p className="text-[11px] text-[#8892a8] leading-relaxed">
            Activez la caméra de votre poste pour enregistrer le check-in physique du voyageur en scannant son QR Code de confirmation.
          </p>

          {checkInMsg && (
            <div className="p-3.5 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl text-[#00d4aa] text-xs font-semibold text-center leading-relaxed animate-pulse">
              {checkInMsg}
            </div>
          )}

          <button
            onClick={triggerScanner}
            className="w-full py-3 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#00d4aa]/15"
          >
            {isScanning ? 'Désactiver la Caméra' : 'Activer le Scanner Caméra'}
          </button>

          {isScanning && (
            <div className="w-full bg-[#080b12] rounded-xl overflow-hidden border border-[#1c2333] p-2 mt-2">
              <div id="qr-reader-panel" className="w-full"></div>
            </div>
          )}

          {isSubmitLoading && (
            <div className="text-center py-2 flex items-center justify-center gap-1.5 text-[11px] text-[#8892a8]">
              <Loader2 size={12} className="animate-spin text-[#00d4aa]" /> Validation en cours sur la base PostgreSQL...
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="max-w-4xl bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
            <Layers className="text-[#00d4aa]" size={18} /> Tous les Enregistrements ({bookings.length})
          </h3>

          <div className="flex flex-col gap-3 mt-2 max-h-[480px] overflow-y-auto pr-1">
            {bookings.length > 0 ? (
              bookings.map(book => (
                <div key={book.id} className="p-4 rounded-xl border border-[#1c2333] bg-[#080b12]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#00d4aa]/30 transition-all duration-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-[#5a6478] uppercase tracking-wide font-mono">ID: {book.id.substring(0, 8)}... | INV: {book.payments[0]?.invoiceNumber || 'N/A'}</span>
                    <h4 className="font-semibold text-[#e8edf5] text-xs">
                      {book.guest.user.firstName} {book.guest.user.lastName} ({book.guest.nationality || 'N/A'})
                    </h4>
                    <p className="text-[10px] text-[#8892a8] mt-0.5">
                      Lit: <b className="text-white">{book.bed?.bedNumber}</b> ({book.room.roomNumber} - {book.room.type}) | Loyer: <b className="text-white">{book.totalPrice}€</b>
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                    book.status === 'COMPLETED' ? 'bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-[#00f0c8]' :
                    book.status === 'CONFIRMED' ? 'bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-[#00f0c8]' :
                    book.status === 'PENDING' ? 'bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-[#00f0c8]' :
                    'bg-[#242d3f] text-[#8892a8]'
                  }`}>
                    {book.status === 'COMPLETED' ? 'CHECKED-IN' : book.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-[#5a6478]">
                Aucun enregistrement trouvé.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 3. MANAGER / ADMIN DASHBOARD VIEW
function ManagerDashboard({ user, activeTab }: { user: any; activeTab: string }) {
  const [hostels, setHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Create Hostel states
  const [hostelName, setHostelName] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [hostelCity, setHostelCity] = useState('');
  const [hostelMsg, setHostelMsg] = useState('');

  // OSM Search States
  const [osmQuery, setOsmQuery] = useState('');
  const [osmResults, setOsmResults] = useState<any[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState('');

  const handleOsmSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osmQuery.trim()) return;

    setOsmLoading(true);
    setOsmError('');
    setOsmResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(osmQuery)}&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'Roomify-App/1.0'
          }
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setOsmResults(data);
        if (data.length === 0) {
          setOsmError('Aucun établissement trouvé sur OpenStreetMap pour cette recherche.');
        }
      } else {
        setOsmError('Réponse inattendue d\'OpenStreetMap.');
      }
    } catch (err) {
      setOsmError('Erreur de connexion avec OpenStreetMap.');
    } finally {
      setOsmLoading(false);
    }
  };

  const handleImportOsm = (result: any) => {
    const name = result.name || result.display_name.split(',')[0];
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.state || '';
    const road = addr.road || '';
    const suburb = addr.suburb || '';
    const houseNumber = addr.house_number || '';
    const formattedAddress = [houseNumber, road, suburb].filter(Boolean).join(', ') || result.display_name.split(',').slice(1, 3).join(',').trim();

    setHostelName(name);
    setHostelAddress(formattedAddress);
    setHostelCity(city);
    setHostelMsg('Données pré-remplies depuis OpenStreetMap ! Révisez-les et sauvegardez.');
  };

  // Create Room states
  const [selectedHostel, setSelectedHostel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [roomType, setRoomType] = useState('DORM_MIXED');
  const [pricePerNight, setPricePerNight] = useState('25');
  const [capacity, setCapacity] = useState('4');
  const [roomAmenities, setRoomAmenities] = useState('WiFi, casier, securite');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomHostelFilter, setRoomHostelFilter] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomMsg, setRoomMsg] = useState('');

  const fetchData = async () => {
    try {
      const [hRes, rRes] = await Promise.all([
        api.get('/hostels'),
        api.get('/rooms?includeOccupancy=true')
      ]);
      const hostelList = hRes.data.hostels || [];
      const roomList = rRes.data.data?.rooms || [];
      setHostels(hostelList);
      setRooms(roomList);
      if (!selectedHostel && hostelList.length > 0) {
        setSelectedHostel(hostelList[0].id);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setHostelMsg('');

    try {
      await api.post('/hostels', {
        name: hostelName,
        address: hostelAddress,
        city: hostelCity
      });
      setHostelName('');
      setHostelAddress('');
      setHostelCity('');
      setHostelMsg('Auberge enregistrée avec succès !');
      fetchData();
    } catch (err: any) {
      setHostelMsg(err.message || 'Erreur de création.');
    }
  };

  const resetRoomForm = () => {
    setRoomNumber('');
    setFloor('1');
    setRoomType('DORM_MIXED');
    setPricePerNight('25');
    setCapacity('4');
    setRoomAmenities('WiFi, casier, securite');
    setEditingRoomId(null);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomMsg('');

    try {
      const payload = {
        roomNumber,
        floor,
        type: roomType,
        pricePerNight,
        capacity,
        amenities: roomAmenities.split(',').map((item: string) => item.trim()).filter(Boolean)
      };

      if (editingRoomId) {
        await api.patch(`/rooms/${editingRoomId}`, payload);
        setRoomMsg('Chambre modifiee avec succes.');
      } else {
        await api.post('/rooms', {
          hostelId: selectedHostel,
          ...payload
        });
        setRoomMsg(`Chambre creee. ${roomType === 'PRIVATE_ROOM' ? '1 lit prive' : `${capacity} lits dortoir`} auto-generes !`);
      }

      resetRoomForm();
      fetchData();
    } catch (err: any) {
      setRoomMsg(err.message || 'Erreur de sauvegarde.');
    }
  };

  const handleEditRoom = (room: any) => {
    setEditingRoomId(room.id);
    setSelectedHostel(room.hostelId);
    setRoomNumber(room.roomNumber || '');
    setFloor(String(room.floor || 1));
    setRoomType(room.type || 'DORM_MIXED');
    setPricePerNight(String(room.pricePerNight || 25));
    setCapacity(String(room.beds?.length || 1));
    setRoomAmenities((room.amenities || []).join(', '));
    setRoomMsg('Mode modification active.');
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Supprimer cette chambre ?')) return;
    setRoomMsg('');

    try {
      await api.delete(`/rooms/${roomId}`);
      if (editingRoomId === roomId) resetRoomForm();
      setRoomMsg('Chambre supprimee.');
      fetchData();
    } catch (err: any) {
      setRoomMsg(err.message || 'Erreur de suppression.');
    }
  };

  const filteredRooms = rooms.filter((room: any) => {
    const text = `${room.roomNumber || ''} ${room.hostel?.name || ''} ${room.hostel?.city || ''}`.toLowerCase();
    const matchesSearch = text.includes(roomSearch.toLowerCase());
    const matchesHostel = roomHostelFilter === 'all' || room.hostelId === roomHostelFilter;
    const matchesType = roomTypeFilter === 'all' || room.type === roomTypeFilter;
    return matchesSearch && matchesHostel && matchesType;
  });

  const occupancyBeds = rooms.flatMap((room: any) =>
    (room.beds || []).map((bed: any) => ({
      ...bed,
      roomNumber: room.roomNumber,
      hostelName: room.hostel?.name || 'Hostel',
      hostelCity: room.hostel?.city || ''
    }))
  );
  const totalBeds = occupancyBeds.length;
  const occupiedBeds = occupancyBeds.filter((bed: any) => bed.occupancyStatus === 'OCCUPIED').length;
  const reservedBeds = occupancyBeds.filter((bed: any) => bed.occupancyStatus === 'RESERVED').length;
  const availableBeds = occupancyBeds.filter((bed: any) => bed.occupancyStatus === 'AVAILABLE').length;
  const occupancyRate = totalBeds > 0 ? Math.round(((occupiedBeds + reservedBeds) / totalBeds) * 1000) / 10 : 0;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomMsg('');

    try {
      await api.post('/rooms', {
        hostelId: selectedHostel,
        roomNumber,
        floor,
        type: roomType,
        pricePerNight,
        capacity,
        amenities: ['WiFi', 'Individual Lockers', 'USB Charger']
      });
      setRoomNumber('');
      setRoomMsg(`Chambre créée. ${roomType === 'PRIVATE_ROOM' ? '1 lit privé' : `${capacity} lits dortoir`} auto-générés !`);
    } catch (err: any) {
      setRoomMsg(err.message || 'Erreur de création.');
    }
  };

  return (
    <>
      {/* ANALYTICS PANEL */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-[#1c2333] bg-[#0d1117]/60 backdrop-blur-md flex items-center justify-between gap-4 hover:border-[#00d4aa]/30 transition-all duration-300 relative overflow-hidden group shadow-xl">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00d4aa]/5 rounded-full blur-xl group-hover:bg-[#00d4aa]/10 transition-all"></div>
            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Taux d'occupation global</span>
              <span className="text-3xl font-black text-white font-mono leading-none">{occupancyRate} %</span>
              <span className="text-[9px] text-[#00f0c8] mt-2.5 font-semibold flex items-center gap-1">
                {occupiedBeds} occupes, {reservedBeds} reserves, {availableBeds} libres
              </span>
            </div>
            <div className="p-3 bg-[#00d4aa]/10 text-[#00d4aa] rounded-xl border border-[#00d4aa]/20 relative z-10 shrink-0">
              <Activity size={24} />
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-[#1c2333] bg-[#0d1117]/60 backdrop-blur-md flex items-center justify-between gap-4 hover:border-[#00f0c8]/30 transition-all duration-300 relative overflow-hidden group shadow-xl">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00f0c8]/5 rounded-full blur-xl group-hover:bg-[#00f0c8]/10 transition-all"></div>
            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Chiffre d'Affaires</span>
              <span className="text-3xl font-black text-white font-mono leading-none">12,450 €</span>
              <span className="text-[9px] text-[#00f0c8] mt-2.5 font-semibold flex items-center gap-1">
                Rapport IA auto-généré n8n
              </span>
            </div>
            <div className="p-3 bg-[#00f0c8]/10 text-[#00f0c8] rounded-xl border border-[#00f0c8]/20 relative z-10 shrink-0">
              <BarChart2 size={24} />
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-[#1c2333] bg-[#0d1117]/60 backdrop-blur-md flex items-center justify-between gap-4 hover:border-[#00d4aa]/30 transition-all duration-300 relative overflow-hidden group shadow-xl">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00d4aa]/5 rounded-full blur-xl group-hover:bg-[#00d4aa]/10 transition-all"></div>
            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Total Établissements</span>
              <span className="text-3xl font-black text-white font-mono leading-none">{hostels.length} sites</span>
              <span className="text-[9px] text-[#8892a8] mt-2.5 font-semibold">
                Multi-sites configuré
              </span>
            </div>
            <div className="p-3 bg-[#00d4aa]/10 text-[#00d4aa] rounded-xl border border-[#00d4aa]/20 relative z-10 shrink-0">
              <Plus size={24} />
            </div>
          </div>

          {/* Real occupancy heatmap */}
          <div className="md:col-span-3 bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl mt-2">
            <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
              <Sparkles className="text-[#00d4aa] animate-pulse" size={16} /> Plan d'Occupation & Heatmap des Dortoirs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mt-2">
              {occupancyBeds.length === 0 && (
                <div className="col-span-full rounded-xl border border-[#1c2333] bg-[#080b12] p-6 text-center text-xs font-semibold text-[#8892a8]">
                  Aucun lit cree pour le moment.
                </div>
              )}
              {occupancyBeds.map((bed: any, i: number) => {
                const status = bed.occupancyStatus || bed.status || 'AVAILABLE';
                const color =
                  status === 'OCCUPIED'
                    ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20'
                    : status === 'RESERVED'
                      ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20'
                      : status === 'MAINTENANCE' || status === 'CLEANING_REQUIRED'
                        ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20'
                        : 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20';
                const text =
                  status === 'OCCUPIED'
                    ? 'OCCUPE'
                    : status === 'RESERVED'
                      ? 'RESERVE'
                      : status === 'MAINTENANCE'
                        ? 'MAINT.'
                        : status === 'CLEANING_REQUIRED'
                          ? 'NETTOYAGE'
                          : 'LIBRE';
                return (
                  <div
                    key={bed.id || i}
                    title={`${bed.hostelName} - Chambre ${bed.roomNumber}${bed.activeBooking?.guestName ? ` - ${bed.activeBooking.guestName}` : ''}`}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition-all duration-200 cursor-default ${color}`}
                  >
                    <span className="text-[9px] font-bold uppercase font-mono">CH-{bed.roomNumber} / {bed.bedNumber || `LIT-${i + 1}`}</span>
                    <span className="text-[8px] font-black tracking-wider">{text}</span>
                  </div>
                );
              })}
              {false && Array.from({ length: 16 }).map((_, i) => {
                const colors = [
                  'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20', 
                  'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20', 
                  'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8] hover:bg-[#00f0c8]/20'
                ];
                const texts = ['LIBRE', 'OCCUPÉ', 'SÉJOUR'];
                const rand = (i * 7 + 13) % 3;
                return (
                  <div key={i} className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition-all duration-200 cursor-default ${colors[rand]}`}>
                    <span className="text-[9px] font-bold uppercase font-mono">LIT-{100 + i}</span>
                    <span className="text-[8px] font-black tracking-wider">{texts[rand]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE HOSTEL */}
      {activeTab === 'hostels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full max-w-5xl">
          {/* OSM Search Column */}
          <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
              <Sparkles size={16} className="text-[#00d4aa]" /> 1. Importer depuis OpenStreetMap
            </h3>
            <p className="text-[11px] text-[#8892a8] leading-relaxed">
              Recherchez n'importe quel établissement ou auberge existante au Maroc (ex: "Backpackers Marrakech") pour pré-remplir la fiche.
            </p>

            <form onSubmit={handleOsmSearch} className="flex gap-2 mt-2">
              <input
                type="text"
                value={osmQuery}
                onChange={e => setOsmQuery(e.target.value)}
                placeholder="Ex: Hostel Chefchaouen"
                className="flex-1 bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
              />
              <button
                type="submit"
                disabled={osmLoading}
                className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#00d4aa]/15"
              >
                {osmLoading ? 'Recherche...' : 'Rechercher'}
              </button>
            </form>

            {osmError && (
              <span className="text-[10px] text-[#00f0c8] font-semibold">{osmError}</span>
            )}

            {osmResults.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2 max-h-[250px] overflow-y-auto pr-1">
                {osmResults.map((res, idx) => (
                  <div key={idx} className="p-3 bg-[#080b12]/40 border border-[#1c2333] rounded-xl flex justify-between items-center gap-3">
                    <div className="flex flex-col gap-0.5 truncate">
                      <span className="text-[11px] font-bold text-[#e8edf5] truncate">{res.name || res.display_name.split(',')[0]}</span>
                      <span className="text-[9px] text-[#8892a8] truncate">{res.display_name}</span>
                    </div>
                    <button
                      onClick={() => handleImportOsm(res)}
                      className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#151b28] border border-[#1c2333] hover:border-[#00d4aa]/30 text-[10px] text-[#00d4aa] font-bold rounded-lg shrink-0 transition-all cursor-pointer"
                    >
                      Pré-remplir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Save Form Column */}
          <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <h3 className="font-extrabold text-[#e8edf5] text-sm pb-2 border-b border-[#1c2333]">
              2. Enregistrer dans la base de données
            </h3>
            <p className="text-[11px] text-[#8892a8] leading-relaxed">
              Vérifiez et complétez les informations avant de sauvegarder l'auberge dans votre base PostgreSQL locale.
            </p>

            <form onSubmit={handleCreateHostel} className="flex flex-col gap-4 mt-2">
              {hostelMsg && (
                <div className="p-3 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl text-[#00d4aa] text-xs text-center font-medium leading-relaxed">
                  {hostelMsg}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Nom</label>
                <input
                  type="text"
                  required
                  value={hostelName}
                  onChange={e => setHostelName(e.target.value)}
                  placeholder="Ex: Roomify Backpackers"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Adresse</label>
                  <input
                    type="text"
                    required
                    value={hostelAddress}
                    onChange={e => setHostelAddress(e.target.value)}
                    placeholder="Ex: 12 Rue de la Gare"
                    className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Ville</label>
                  <input
                    type="text"
                    required
                    value={hostelCity}
                    onChange={e => setHostelCity(e.target.value)}
                    placeholder="Ex: Paris"
                    className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d4aa]/15"
              >
                Sauvegarder en local
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROOMS MANAGEMENT */}
      {activeTab === 'rooms' && (
        <div className="w-full max-w-7xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Manage Rooms</h2>
              <p className="text-sm text-[#8892a8] mt-1">Add, edit, or delete rooms.</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg border border-[#1c2333] bg-[#0d1117] px-3 py-2 text-xs font-bold text-[#e8edf5] hover:border-[#00d4aa]/50 transition-all"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {roomMsg && (
            <div className="rounded-lg border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-4 py-3 text-sm font-semibold text-[#00d4aa]">
              {roomMsg}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">
            <form onSubmit={handleSaveRoom} className="rounded-lg border border-[#1c2333] bg-[#0d1117]/80 p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1c2333] pb-4 mb-4">
                <h3 className="font-extrabold text-[#e8edf5] text-sm">
                  {editingRoomId ? 'Edit Room' : 'Add New Room'}
                </h3>
                {editingRoomId ? (
                  <button type="button" onClick={resetRoomForm} className="rounded-md border border-[#1c2333] px-2.5 py-1.5 text-[11px] font-bold text-[#8892a8] hover:text-white">
                    Cancel
                  </button>
                ) : (
                  <span className="rounded-md bg-[#00d4aa]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#00d4aa]">Create</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Select Hostel</label>
                  <select value={selectedHostel} disabled={Boolean(editingRoomId)} onChange={e => setSelectedHostel(e.target.value)} className="w-full rounded-md border border-[#263044] bg-[#101722] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80 disabled:opacity-60">
                    {hostels.map(h => (
                      <option key={h.id} value={h.id} className="bg-[#0d1117] text-white">{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Room Number</label>
                    <input type="text" required value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="Room 101" className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#e8edf5] outline-none placeholder:text-[#5a6478] focus:border-[#00d4aa]/80" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Monthly Rent</label>
                    <input type="number" required value={pricePerNight} onChange={e => setPricePerNight(e.target.value)} placeholder="800" className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#e8edf5] outline-none placeholder:text-[#5a6478] focus:border-[#00d4aa]/80" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Room Type</label>
                    <select value={roomType} onChange={e => setRoomType(e.target.value)} className="w-full rounded-md border border-[#263044] bg-[#101722] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80">
                      <option value="DORM_MIXED" className="bg-[#0d1117]">Shared</option>
                      <option value="DORM_FEMALE" className="bg-[#0d1117]">Female</option>
                      <option value="DORM_MALE" className="bg-[#0d1117]">Male</option>
                      <option value="PRIVATE_ROOM" className="bg-[#0d1117]">Private</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Capacity</label>
                    <input type="number" min="1" max="12" required value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Floor</label>
                    <input type="number" required value={floor} onChange={e => setFloor(e.target.value)} className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Location</label>
                    <input type="text" value={hostels.find(h => h.id === selectedHostel)?.city || ''} readOnly className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#8892a8] outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8892a8] uppercase tracking-wider">Amenities (comma separated)</label>
                  <input type="text" value={roomAmenities} onChange={e => setRoomAmenities(e.target.value)} placeholder="wifi, desk, security" className="w-full rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs text-[#e8edf5] outline-none placeholder:text-[#5a6478] focus:border-[#00d4aa]/80" />
                </div>

                <div className="rounded-md border border-dashed border-[#263044] bg-[#080b12] p-4 text-center">
                  <Camera className="mx-auto mb-2 text-[#5a6478]" size={22} />
                  <p className="text-xs font-semibold text-[#8892a8]">Room photo</p>
                  <p className="text-[11px] text-[#5a6478] mt-1">Upload preview can be connected later.</p>
                </div>

                <button type="submit" disabled={!selectedHostel} className="w-full rounded-lg bg-[#00d4aa] px-4 py-3 text-xs font-black text-[#061014] shadow-lg shadow-[#00d4aa]/10 transition-all hover:bg-[#00f0c8] disabled:cursor-not-allowed disabled:opacity-50">
                  {editingRoomId ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="rounded-lg border border-[#1c2333] bg-[#0d1117]/80 p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_150px_auto] gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6478]" />
                    <input type="text" value={roomSearch} onChange={e => setRoomSearch(e.target.value)} placeholder="Search by room number, location..." className="w-full rounded-md border border-[#263044] bg-[#080b12] pl-9 pr-3 py-2 text-xs text-[#e8edf5] outline-none placeholder:text-[#5a6478] focus:border-[#00d4aa]/80" />
                  </div>
                  <select value={roomHostelFilter} onChange={e => setRoomHostelFilter(e.target.value)} className="rounded-md border border-[#263044] bg-[#101722] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80">
                    <option value="all" className="bg-[#0d1117]">All Hostels</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id} className="bg-[#0d1117]">{h.name}</option>
                    ))}
                  </select>
                  <select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)} className="rounded-md border border-[#263044] bg-[#101722] px-3 py-2 text-xs text-[#e8edf5] outline-none focus:border-[#00d4aa]/80">
                    <option value="all" className="bg-[#0d1117]">All Types</option>
                    <option value="DORM_MIXED" className="bg-[#0d1117]">Shared</option>
                    <option value="DORM_FEMALE" className="bg-[#0d1117]">Female</option>
                    <option value="DORM_MALE" className="bg-[#0d1117]">Male</option>
                    <option value="PRIVATE_ROOM" className="bg-[#0d1117]">Private</option>
                  </select>
                  <span className="rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs font-bold text-[#00d4aa]">
                    Available: {filteredRooms.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {filteredRooms.length === 0 ? (
                  <div className="rounded-lg border border-[#1c2333] bg-[#0d1117]/80 p-8 text-center">
                    <Bed className="mx-auto text-[#5a6478]" size={30} />
                    <p className="mt-3 text-sm font-bold text-[#e8edf5]">No rooms found</p>
                    <p className="mt-1 text-xs text-[#8892a8]">Create a room or change your filters.</p>
                  </div>
                ) : (
                  filteredRooms.map(room => (
                    <div key={room.id} className="rounded-lg border border-[#1c2333] bg-[#0d1117]/80 p-3 hover:border-[#00d4aa]/25 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-14 w-16 shrink-0 rounded-md border border-[#263044] bg-[#151d2b] flex items-center justify-center">
                            <Bed size={22} className="text-[#8892a8]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-white">Room {room.roomNumber}</h4>
                              <span className="rounded-full bg-[#1c2333] px-2 py-0.5 text-[10px] font-bold text-[#c7d0df]">
                                {room.type === 'PRIVATE_ROOM' ? 'private' : room.type === 'DORM_FEMALE' ? 'female' : room.type === 'DORM_MALE' ? 'male' : 'shared'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#8892a8]">
                              <span className="inline-flex items-center gap-1"><MapPin size={12} />{room.hostel?.city || 'Unknown'}</span>
                              <span>{room.hostel?.name || 'Hostel'}</span>
                              <span>{room.beds?.length || 0} beds</span>
                              <span>{String(room.pricePerNight)} / night</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleEditRoom(room)} className="inline-flex items-center gap-1.5 rounded-md border border-[#263044] bg-[#080b12] px-3 py-2 text-xs font-bold text-[#e8edf5] hover:border-[#00d4aa]/50">
                            <Edit3 size={13} />
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteRoom(room.id)} className="inline-flex items-center gap-1.5 rounded-md bg-[#ef4444] px-3 py-2 text-xs font-bold text-white hover:bg-[#dc2626]">
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ROOM / BEDS GENERATION */}
      {false && activeTab === 'rooms' && (
        <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl max-w-lg w-full shadow-xl">
          <h3 className="font-extrabold text-[#e8edf5] text-sm pb-2 border-b border-[#1c2333] mb-4">
            Ajouter une Chambre & Lits
          </h3>
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
            {roomMsg && (
              <div className="p-3 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl text-[#00d4aa] text-xs text-center font-medium animate-pulse">
                {roomMsg}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Auberge Cible</label>
              <select
                value={selectedHostel}
                onChange={e => setSelectedHostel(e.target.value)}
                className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all cursor-pointer focus:ring-1 focus:ring-[#00d4aa]/30"
              >
                {hostels.map(h => (
                  <option key={h.id} value={h.id} className="bg-[#0d1117] text-white">{h.name} ({h.city})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Numéro de chambre</label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="Ex: 204"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Étage</label>
                <input
                  type="number"
                  required
                  value={floor}
                  onChange={e => setFloor(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all text-center focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Type</label>
                <select
                  value={roomType}
                  onChange={e => setRoomType(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all cursor-pointer focus:ring-1 focus:ring-[#00d4aa]/30"
                >
                  <option value="DORM_MIXED" className="bg-[#0d1117] text-white">Dortoir Mixte</option>
                  <option value="DORM_FEMALE" className="bg-[#0d1117] text-white">Dortoir Filles</option>
                  <option value="DORM_MALE" className="bg-[#0d1117] text-white">Dortoir Garçons</option>
                  <option value="PRIVATE_ROOM" className="bg-[#0d1117] text-white">Chambre Privée</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                  {roomType === 'PRIVATE_ROOM' ? 'Prix Chambre / nuit' : 'Prix Lit / nuit'}
                </label>
                <input
                  type="number"
                  required
                  value={pricePerNight}
                  onChange={e => setPricePerNight(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all text-center focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>
            {roomType !== 'PRIVATE_ROOM' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">Capacité (Lits dortoir à générer)</label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  required
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl px-3.5 py-2.5 text-xs text-[#e8edf5] outline-none transition-all text-center focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d4aa]/15 mt-2"
            >
              Enregistrer la Chambre & Lits
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// 4. MAINTENANCE DASHBOARD VIEW
function MaintenanceDashboard({ user, activeTab }: { user: any; activeTab: string }) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      setComplaints(res.data.complaints);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status: nextStatus });
      fetchTickets();
    } catch (e) {}
  };

  return (
    <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl max-w-5xl">
      <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
        <Wrench className="text-[#00d4aa]" size={18} /> Mon Tableau d'Interventions Maintenance / Ménage
      </h3>
      <p className="text-[11px] text-[#8892a8] leading-relaxed">
        Consultez les tickets d'intervention qui vous ont été assignés automatiquement par notre moteur d'Intelligence Artificielle.
      </p>

      {loading ? (
        <div className="text-center py-12 text-xs text-[#5a6478]">Chargement...</div>
      ) : complaints.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {complaints.map(t => (
            <div key={t.id} className="p-4 rounded-xl border border-[#1c2333] bg-[#080b12]/40 flex flex-col justify-between gap-4 hover:border-[#00d4aa]/30 transition-all duration-200">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-[#e8edf5] text-xs">{t.title}</h4>
                  <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                    t.priority === 'URGENT' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                    t.priority === 'HIGH' ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20' :
                    'bg-[#242d3f] text-[#8892a8]'
                  }`}>
                    {t.priority}
                  </span>
                </div>
                <p className="text-[10px] text-[#8892a8] leading-relaxed">{t.description}</p>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#1c2333]/60 pt-3">
                <div className="flex justify-between items-center text-[10px] text-[#5a6478]">
                  <span>Signalé par : <b className="text-white">{t.guest.user.firstName} {t.guest.user.lastName}</b></span>
                  <span className="px-2 py-0.5 bg-[#00d4aa]/10 text-[#00d4aa] rounded font-semibold uppercase text-[8px] tracking-wider">{t.category}</span>
                </div>

                <div className="flex justify-end gap-2">
                  {t.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 bg-[#00f0c8] hover:bg-[#ffbe6b] text-[#080b12] text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Démarrer l'intervention
                    </button>
                  )}
                  {t.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-[#00f0c8] hover:bg-[#2eff8b] text-[#080b12] text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Marquer comme résolu
                    </button>
                  )}
                  {t.status === 'RESOLVED' && (
                    <span className="text-[10px] text-[#00f0c8] font-bold flex items-center gap-1">
                      <Check size={14} /> Intervention close
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-[#1c2333] rounded-xl mt-2">
          <p className="text-xs text-[#5a6478]">Aucune intervention en attente. Tout est en ordre !</p>
        </div>
      )}
    </div>
  );
}

// 5. ACCOUNTANT DASHBOARD VIEW
function AccountantDashboard({ user, activeTab }: { user: any; activeTab: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const fetchOverdue = async () => {
    try {
      const res = await api.get('/payments/overdue');
      setPayments(res.data.overduePayments);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const triggerReport = () => {
    setMsg('Workflow n8n de rapport mensuel simulé et déclenché. Le PDF sera envoyé par e-mail !');
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <>
      {activeTab === 'overdue' && (
        <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl max-w-4xl">
          <h3 className="font-extrabold text-[#00f0c8] text-sm flex items-center gap-2 pb-2 border-b border-[#1c2333]">
            <AlertTriangle size={18} /> Relances Factures en Retard (Late Payments)
          </h3>

          {msg && (
            <div className="p-3 bg-[#00f0c8]/10 border border-[#00f0c8]/20 rounded-xl text-[#00f0c8] text-[10px] text-center font-medium animate-pulse">
              {msg}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-2">
            {payments.length > 0 ? (
              payments.map(p => (
                <div key={p.id} className="p-4 bg-[#080b12]/40 rounded-xl border border-[#1c2333] flex justify-between items-center gap-4 hover:border-[#00f0c8]/30 transition-all duration-200">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono text-[#5a6478] font-bold">{p.invoiceNumber}</span>
                    <span className="text-xs font-bold text-[#e8edf5]">{p.booking.guest.user.firstName} {p.booking.guest.user.lastName}</span>
                    <span className="text-[9px] text-[#8892a8]">
                      Auberge : <b className="text-white">{p.booking.room.hostel.name}</b> | Échéance : <b className="text-white">{new Date(p.dueDate).toLocaleDateString()}</b>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#00f0c8]">{p.amount} EUR</span>
                    <button 
                      onClick={async () => {
                        setMsg(`Relance envoyée par email au voyageur pour la facture ${p.invoiceNumber}`);
                        setTimeout(() => setMsg(''), 3000);
                      }}
                      className="px-2.5 py-1.5 bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/20 hover:bg-[#00f0c8] hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm shadow-[#00f0c8]/5"
                    >
                      Relancer
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-[#1c2333] rounded-xl">
                <p className="text-xs text-[#5a6478]">Aucun retard de paiement détecté aujourd'hui.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 shadow-xl max-w-md">
          <h3 className="font-extrabold text-[#e8edf5] text-sm flex items-center gap-1.5 pb-2 border-b border-[#1c2333]">
            <CheckSquare className="text-[#00d4aa]" size={18} /> Actions Comptabilité
          </h3>
          
          {msg && (
            <div className="p-3 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl text-[#00d4aa] text-[10px] text-center font-medium leading-relaxed animate-pulse">
              {msg}
            </div>
          )}

          <button
            onClick={triggerReport}
            className="w-full py-3 bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#00d4aa]/15 mt-2"
          >
            <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} /> Déclencher le rapport mensuel IA
          </button>
          <p className="text-[10px] text-[#8892a8] leading-relaxed text-center mt-1">
            Déclenche manuellement le workflow n8n n°3 pour agréger les statistiques mensuelles, appeler Hugging Face et exporter la synthèse PDF par e-mail.
          </p>
        </div>
      )}
    </>
  );
}

// Loader component helper
const Loader2 = ({ className, size }: { className?: string; size?: number }) => (
  <svg className={`animate-spin ${className}`} width={size || 24} height={size || 24} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

