import { PrismaClient, Role, ShipmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cargotrack.com' },
    update: {},
    create: {
      email: 'admin@cargotrack.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@cargotrack.com' },
    update: {},
    create: {
      email: 'user@cargotrack.com',
      password: userPassword,
      name: 'John Doe',
      role: Role.USER,
    },
  });

  // Create sample shipments
  const shipments = [
    {
      trackingNumber: 'CT-2026-100001',
      title: 'Electronics Package',
      senderName: 'TechCorp Inc.',
      receiverName: 'Jane Smith',
      origin: 'New York, NY',
      destination: 'Los Angeles, CA',
      shipmentType: 'Express',
      weight: 2.5,
      description: 'Laptop and accessories',
      status: ShipmentStatus.DELIVERED,
      estimatedDeliveryDate: new Date('2026-06-05'),
      userId: user.id,
    },
    {
      trackingNumber: 'CT-2026-100002',
      title: 'Medical Supplies',
      senderName: 'MedSupply Co.',
      receiverName: 'City Hospital',
      origin: 'Chicago, IL',
      destination: 'Houston, TX',
      shipmentType: 'Priority',
      weight: 15.0,
      description: 'Surgical equipment and supplies',
      status: ShipmentStatus.IN_TRANSIT,
      estimatedDeliveryDate: new Date('2026-06-10'),
      userId: user.id,
    },
    {
      trackingNumber: 'CT-2026-100003',
      title: 'Furniture Delivery',
      senderName: 'HomeStyle Furniture',
      receiverName: 'Mike Johnson',
      origin: 'Seattle, WA',
      destination: 'Portland, OR',
      shipmentType: 'Standard',
      weight: 45.0,
      description: 'Office desk and chair set',
      status: ShipmentStatus.PICKED_UP,
      estimatedDeliveryDate: new Date('2026-06-15'),
      userId: user.id,
    },
    {
      trackingNumber: 'CT-2026-100004',
      title: 'International Documents',
      senderName: 'Global Law Firm',
      receiverName: 'London Office',
      origin: 'San Francisco, CA',
      destination: 'London, UK',
      shipmentType: 'International',
      weight: 0.5,
      description: 'Legal documents for international filing',
      status: ShipmentStatus.CREATED,
      estimatedDeliveryDate: new Date('2026-06-20'),
      userId: user.id,
    },
    {
      trackingNumber: 'CT-2026-100005',
      title: 'Auto Parts Shipment',
      senderName: 'AutoParts Warehouse',
      receiverName: 'Quick Fix Auto',
      origin: 'Detroit, MI',
      destination: 'Miami, FL',
      shipmentType: 'Freight',
      weight: 120.0,
      description: 'Engine components and brake parts',
      status: ShipmentStatus.DELAYED,
      estimatedDeliveryDate: new Date('2026-06-08'),
      userId: user.id,
    },
  ];

  for (const shipmentData of shipments) {
    const shipment = await prisma.shipment.upsert({
      where: { trackingNumber: shipmentData.trackingNumber },
      update: {},
      create: shipmentData,
    });

    // Create tracking events based on status
    const events: { status: ShipmentStatus; description: string; location: string; daysAgo: number }[] = [];

    events.push({
      status: ShipmentStatus.CREATED,
      description: 'Shipment has been created',
      location: shipmentData.origin,
      daysAgo: 7,
    });

    if (([ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.DELAYED] as ShipmentStatus[]).includes(shipmentData.status)) {
      events.push({
        status: ShipmentStatus.PICKED_UP,
        description: 'Package picked up by carrier',
        location: shipmentData.origin,
        daysAgo: 6,
      });
    }

    if (([ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.DELAYED] as ShipmentStatus[]).includes(shipmentData.status)) {
      events.push({
        status: ShipmentStatus.IN_TRANSIT,
        description: 'Package is in transit',
        location: 'Distribution Center',
        daysAgo: 4,
      });
    }

    if (shipmentData.status === ShipmentStatus.DELAYED) {
      events.push({
        status: ShipmentStatus.DELAYED,
        description: 'Shipment delayed due to weather conditions',
        location: 'Regional Hub',
        daysAgo: 2,
      });
    }

    if (([ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED] as ShipmentStatus[]).includes(shipmentData.status)) {
      events.push({
        status: ShipmentStatus.OUT_FOR_DELIVERY,
        description: 'Package is out for delivery',
        location: shipmentData.destination,
        daysAgo: 1,
      });
    }

    if (shipmentData.status === ShipmentStatus.DELIVERED) {
      events.push({
        status: ShipmentStatus.DELIVERED,
        description: 'Package has been delivered',
        location: shipmentData.destination,
        daysAgo: 0,
      });
    }

    // Check if events already exist
    const existingEvents = await prisma.trackingEvent.count({
      where: { shipmentId: shipment.id },
    });

    if (existingEvents === 0) {
      for (const event of events) {
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - event.daysAgo);
        await prisma.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status: event.status,
            description: event.description,
            location: event.location,
            timestamp,
          },
        });
      }
    }
  }

  // Create sample notifications
  const existingNotifications = await prisma.notification.count({
    where: { userId: user.id },
  });

  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          title: 'Shipment Delivered',
          message: 'Your shipment CT-2026-100001 has been delivered successfully!',
          read: true,
        },
        {
          userId: user.id,
          title: 'Shipment In Transit',
          message: 'Your shipment CT-2026-100002 is now in transit.',
          read: false,
        },
        {
          userId: user.id,
          title: 'Shipment Delayed',
          message: 'Your shipment CT-2026-100005 has been delayed due to weather conditions.',
          read: false,
        },
      ],
    });
  }

  console.log('Seed complete!');
  console.log('Admin: admin@cargotrack.com / admin123');
  console.log('User:  user@cargotrack.com / user123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
