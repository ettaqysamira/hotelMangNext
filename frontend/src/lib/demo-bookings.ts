const DEMO_BOOKINGS_KEY = 'roomify-demo-bookings-v1';

export type DemoBooking = {
  id: string;
  invoiceNumber: string;
  status: 'PENDING' | 'CONFIRMED';
  paymentStatus: 'UNPAID' | 'PAID';
  totalPrice: number;
  checkInDate: string;
  checkOutDate: string;
  bed?: { bedNumber: string } | null;
  room: {
    roomNumber: string;
    type: string;
    hostel: {
      name: string;
      city: string;
      address: string;
    };
  };
  payments: Array<{ invoiceNumber: string; status: string }>;
  demo: true;
};

export function getDemoBookings(): DemoBooking[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DEMO_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDemoBooking(booking: DemoBooking): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getDemoBookings();
    const filtered = existing.filter(item => item.id !== booking.id);
    window.localStorage.setItem(DEMO_BOOKINGS_KEY, JSON.stringify([booking, ...filtered]));
  } catch {
    // Ignore storage failures.
  }
}