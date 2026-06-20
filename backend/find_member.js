const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    include: {
      user: true
    }
  });
  console.log("MEMBERS:");
  for (const m of members) {
    console.log(`Name: ${m.name}`);
    console.log(`Flat: ${m.flatNo}`);
    console.log(`Email: ${m.email}`);
    console.log(`Mobile: ${m.mobile}`);
    console.log(`UserId: ${m.userId}`);
    if (m.user) {
      console.log(`User Email: ${m.user.email}`);
      console.log(`User Mobile: ${m.user.mobile}`);
    }
    console.log("-------------------");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
