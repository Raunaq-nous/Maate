import { PrismaClient } from '../src/generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'vaibhavisingh6655@gmail.com';
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (user) {
    console.log(`Found user: ${user.id} (${user.email}). Deleting user...`);
    
    // In database, we might have foreign keys. Let's delete related entities or let cascade handle it.
    // Let's see what tables are related. Usually UserSession, UserAuditLog, etc.
    // Let's delete session first
    const deletedSessions = await prisma.userSession.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${deletedSessions.count} sessions.`);
    
    const deletedAudits = await prisma.userAuditLog.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${deletedAudits.count} audit logs.`);
    
    const deletedUser = await prisma.user.delete({
      where: { id: user.id }
    });
    console.log(`Successfully deleted user: ${deletedUser.email}`);
  } else {
    console.log(`User ${email} does not exist in the database.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
