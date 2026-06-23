import { PrismaClient, RoomType, BedStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Moroccan hostels and rooms...');

  // 1. Clean up existing data in correct dependency order
  console.log('Cleaning up database...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.guestProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Create default demo accounts for every role
  console.log('Creating user accounts...');
  const demoAccounts = [
    {
      email: 'admin@hostel.com',
      password: 'Admin@1234',
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      phone: '+212 6 00 00 00 01'
    },
    {
      email: 'manager@hostel.com',
      password: 'Manager@1234',
      firstName: 'Meryem',
      lastName: 'Manager',
      role: Role.MANAGER,
      phone: '+212 6 00 00 00 02'
    },
    {
      email: 'reception@hostel.com',
      password: 'Reception@1234',
      firstName: 'Nadia',
      lastName: 'Reception',
      role: Role.RECEPTIONIST,
      phone: '+212 6 00 00 00 03'
    },
    {
      email: 'guest@hostel.com',
      password: 'Guest@1234',
      firstName: 'Yassine',
      lastName: 'Voyageur',
      role: Role.GUEST,
      phone: '+212 6 00 00 00 04'
    },
    {
      email: 'maintenance@hostel.com',
      password: 'Maintenance@1234',
      firstName: 'Youssef',
      lastName: 'Reparateur',
      role: Role.MAINTENANCE,
      phone: '+212 6 00 00 00 05'
    },
    {
      email: 'accountant@hostel.com',
      password: 'Accountant@1234',
      firstName: 'Karim',
      lastName: 'Comptable',
      role: Role.ACCOUNTANT,
      phone: '+212 6 00 00 00 06'
    }
  ];

  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.create({
      data: {
        email: account.email,
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        phone: account.phone
      }
    });

    if (account.role === Role.GUEST) {
      await prisma.guestProfile.create({
        data: {
          userId: user.id,
          preferences: {}
        }
      });
    }

    console.log(`Created ${account.role}: ${account.email} (Password: ${account.password})`);
  }

  // 3. Create Moroccan Hostels
  console.log('Creating hostels...');
  const hostelsData = [
    {
      name: 'Marrakech Beach Riad & Hostel',
      address: '14 Derb Sidi Bouloukada, Medina',
      city: 'Marrakech',
      phone: '+212 5 24 44 12 34',
      email: 'marrakech@hostelhub.com',
      description: 'Un magnifique riad traditionnel converti en auberge moderne au cœur de la Médina, doté d\'un rooftop avec vue sur l\'Atlas et d\'un bassin rafraîchissant.'
    },
    {
      name: 'Rabat City & Surf Hostel',
      address: '8 Rue Sidi Fatah, Medina',
      city: 'Rabat',
      phone: '+212 5 37 72 56 78',
      email: 'rabat@hostelhub.com',
      description: 'L\'auberge idéale pour les voyageurs souhaitant explorer la capitale et surfer sur les vagues de l\'Atlantique. Ambiance conviviale et cours de surf quotidiens.'
    },
    {
      name: 'Fez Medina Traditional House',
      address: '22 Derb el-Miter, Fes El Bali',
      city: 'Fès',
      phone: '+212 5 35 63 90 12',
      email: 'fes@hostelhub.com',
      description: 'Une maison d\'hôtes historique datant du 14ème siècle avec des zelliges authentiques et une cour intérieure tranquille pour se détendre après avoir arpenté les souks.'
    },
    {
      name: 'Essaouira Beachfront Hostel',
      address: '3 Avenue de l\'Océan',
      city: 'Essaouira',
      phone: '+212 5 24 78 45 67',
      email: 'essaouira@hostelhub.com',
      description: 'Profitez de la brise marine et du soleil d\'Essaouira. Une auberge de jeunesse bohème avec des terrasses surplombant la plage, parfaite pour le kitesurf et les barbecues.'
    },
    {
      name: 'Chefchaouen Blue Nest Hostel',
      address: '12 Rue Hassan I, Quartier Souika',
      city: 'Chefchaouen',
      phone: '+212 5 39 98 89 90',
      email: 'chefchaouen@hostelhub.com',
      description: 'Niché dans les ruelles bleues pittoresques de Chefchaouen, ce nid douillet propose une vue panoramique sur les montagnes du Rif et une cuisine traditionnelle faite maison.'
    }
  ];

  const hostels: any[] = [];
  for (const data of hostelsData) {
    const hostel = await prisma.hostel.create({ data });
    hostels.push(hostel);
    console.log(`Created hostel: ${hostel.name} in ${hostel.city}`);
  }

  // 4. Create Rooms & Beds for each Hostel
  console.log('Creating rooms and beds...');
  
  // Define standard room templates
  const roomTemplates = [
    {
      roomNumber: '101',
      floor: 1,
      type: RoomType.DORM_MIXED,
      pricePerNight: 15.00, // ~165 MAD
      capacity: 8,
      amenities: ['WiFi', 'Air Conditioning', 'Individual Lockers', 'USB Chargers', 'Shared Bathroom']
    },
    {
      roomNumber: '102',
      floor: 1,
      type: RoomType.DORM_MALE,
      pricePerNight: 16.00, // ~176 MAD
      capacity: 6,
      amenities: ['WiFi', 'Air Conditioning', 'Individual Lockers', 'Reading Lamp', 'Shared Bathroom']
    },
    {
      roomNumber: '103',
      floor: 1,
      type: RoomType.DORM_FEMALE,
      pricePerNight: 18.00, // ~198 MAD
      capacity: 6,
      amenities: ['WiFi', 'Air Conditioning', 'Individual Lockers', 'Make-up Mirror', 'Hair Dryer', 'Shared Bathroom']
    },
    {
      roomNumber: '201',
      floor: 2,
      type: RoomType.PRIVATE_ROOM,
      pricePerNight: 45.00, // ~495 MAD
      capacity: 2, // Double bed
      amenities: ['WiFi', 'Air Conditioning', 'Queen Size Bed', 'Private Bathroom', 'Towels Included', 'Work Desk']
    },
    {
      roomNumber: '202',
      floor: 2,
      type: RoomType.PRIVATE_ROOM,
      pricePerNight: 35.00, // ~385 MAD
      capacity: 1, // Single private
      amenities: ['WiFi', 'Air Conditioning', 'Single Bed', 'Private Bathroom', 'Towels Included', 'Balcony']
    },
    {
      roomNumber: '203',
      floor: 2,
      type: RoomType.DORM_MIXED,
      pricePerNight: 14.00, // ~154 MAD
      capacity: 10,
      amenities: ['WiFi', 'Ceiling Fan', 'Individual Lockers', 'USB Chargers', 'Shared Bathroom']
    }
  ];

  for (const hostel of hostels) {
    for (const template of roomTemplates) {
      // Modify template specific to hostel to make room number and floor layout unique if needed
      const room = await prisma.room.create({
        data: {
          hostelId: hostel.id,
          roomNumber: template.roomNumber,
          floor: template.floor,
          type: template.type,
          pricePerNight: template.pricePerNight,
          amenities: template.amenities
        }
      });

      // Generate beds
      const bedCount = template.type === RoomType.PRIVATE_ROOM ? 1 : template.capacity;
      const bedsData = Array.from({ length: bedCount }).map((_, i) => {
        // Randomly set some beds as occupied (about 20% occupancy) to test filters
        const shouldBeOccupied = Math.random() < 0.2;
        return {
          roomId: room.id,
          bedNumber: template.type === RoomType.PRIVATE_ROOM ? 'Double Bed' : `Bed ${i + 1}`,
          status: shouldBeOccupied ? BedStatus.OCCUPIED : BedStatus.AVAILABLE
        };
      });

      await prisma.bed.createMany({
        data: bedsData
      });

      console.log(`  Created Room ${room.roomNumber} (${room.type}) in ${hostel.name} with ${bedCount} beds.`);
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
