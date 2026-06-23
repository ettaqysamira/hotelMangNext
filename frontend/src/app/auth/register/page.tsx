'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { Building2, Mail, Lock, User, Phone } from 'lucide-react';

export default function Register() {
  const { registerUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await registerUser({
        email,
        password,
        firstName,
        lastName,
        phone
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création de compte.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#080b12] px-6 py-12 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-[#00f0c8]/8 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#00d4aa]/6 blur-[110px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#0d1117]/60 border border-[#1c2333] backdrop-blur-md rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="p-3 rounded-2xl bg-[#00d4aa]/15 border border-[#00d4aa]/20 text-[#00d4aa]">
            <Building2 size={24} />
          </Link>
          <h2 className="text-xl font-extrabold text-[#e8edf5] tracking-tight mt-2">
            Créer un compte
          </h2>
          <p className="text-xs text-[#5a6478]">
            Rejoignez Roomify et explorez nos fonctionnalités intelligentes
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[#ff4d6d] text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                Prénom
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6478]" size={16} />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl pl-10 pr-4 py-3 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                Nom
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6478]" size={16} />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl pl-10 pr-4 py-3 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6478]" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@email.com"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl pl-10 pr-4 py-3 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6478]" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl pl-10 pr-4 py-3 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#5a6478] uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6478]" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080b12] border border-[#1c2333] focus:border-[#00d4aa]/80 rounded-xl pl-10 pr-4 py-3 text-xs text-[#e8edf5] outline-none transition-all placeholder:text-[#5a6478] focus:ring-1 focus:ring-[#00d4aa]/30"
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[#00d4aa] hover:bg-[#00f0c8] text-[#080b12] font-bold text-xs tracking-wide transition-all shadow-lg shadow-[#00d4aa]/20 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isSubmitting ? 'Création de compte...' : 'Créer mon compte'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-[#5a6478] border-t border-[#1c2333] pt-4">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-[#00d4aa] hover:text-[#00f0c8] font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
