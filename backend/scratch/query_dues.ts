import prisma from '../src/utils/prisma';

async function main() {
  const members = await prisma.member.findMany();
  console.log("MEMBERS:");
  for (const m of members) {
    console.log(`- ${m.name} (Flat ${m.flatNo}): outstandingDues=${m.outstandingDues}, paidUntil=${m.paidUntil}`);
  }

  const payments = await prisma.payment.findMany();
  console.log("\nALL PAYMENTS:");
  for (const p of payments) {
    console.log(`- Receipt: ${p.receiptNumber}, Amount: ${p.amount}, Date: ${p.paymentDate}, Status: ${p.status}`);
  }

  const subs = await prisma.subscription.findMany();
  console.log("\nALL SUBSCRIPTIONS:");
  for (const s of subs) {
    console.log(`- ID: ${s.id}, Amount: ${s.maintenanceAmount}, StartDate: ${s.startDate}, Status: ${s.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
