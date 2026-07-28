// ============================================
// @maate/database — Seed Script
// Populates development database with sample data
// ============================================

import { PrismaClient } from './generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Maate database...');

  // Create sample user
  const user = await prisma.user.upsert({
    where: { email: 'priya@example.com' },
    update: {},
    create: {
      email: 'priya@example.com',
      phone: '+919876543210',
      fullName: 'Priya Sharma',
      dateOfBirth: new Date('1984-03-15'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      onboardingDone: true,
    },
  });

  console.log(`  ✅ Created user: ${user.fullName} (${user.id})`);

  // Create water reminder
  await prisma.waterReminder.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      dailyGoalMl: 2500,
      intervalMinutes: 90,
      activeStart: '07:00',
      activeEnd: '21:00',
      glassSizeMl: 250,
    },
  });

  console.log('  ✅ Created water reminder');

  // Create medicine reminders
  const medicines = [
    { name: 'Metformin 500mg', dosage: '1 tablet', times: ['07:00', '21:00'], freq: 'TWICE_DAILY' as const },
    { name: 'Amlodipine 5mg', dosage: '1 tablet', times: ['08:00'], freq: 'ONCE_DAILY' as const },
    { name: 'Atorvastatin 10mg', dosage: '1 tablet', times: ['21:00'], freq: 'ONCE_DAILY' as const },
  ];

  for (const med of medicines) {
    await prisma.medicineReminder.create({
      data: {
        userId: user.id,
        medicineName: med.name,
        dosage: med.dosage,
        frequency: med.freq,
        timesOfDay: med.times,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        mealRelation: 'AFTER_MEAL',
        startDate: new Date('2026-01-01'),
      },
    });
  }

  console.log(`  ✅ Created ${medicines.length} medicine reminders`);

  // Create meal reminders
  const meals = [
    { type: 'BREAKFAST' as const, time: '08:00' },
    { type: 'LUNCH' as const, time: '13:00' },
    { type: 'DINNER' as const, time: '19:30' },
  ];

  for (const meal of meals) {
    await prisma.mealReminder.create({
      data: {
        userId: user.id,
        mealType: meal.type,
        scheduledTime: meal.time,
      },
    });
  }

  console.log(`  ✅ Created ${meals.length} meal reminders`);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
