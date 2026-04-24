import prisma from "../src/utils/prisma";

async function check() {
  const mobile = "9788330072";
  const user = await prisma.user.findUnique({ where: { mobile } });
  console.log("User found:", user);
  const member = await prisma.member.findFirst({ where: { mobile } });
  console.log("Member found:", member);
  process.exit(0);
}

check();
