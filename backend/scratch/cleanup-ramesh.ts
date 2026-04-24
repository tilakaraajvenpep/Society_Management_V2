import prisma from "../src/utils/prisma";

async function cleanup() {
  const mobile = "9788330072";
  // Delete user if exists
  await prisma.user.deleteMany({ where: { mobile } });
  console.log("Deleted user with mobile:", mobile);
  // Also delete member Ramesh if exists (though debug script showed it didn't)
  await prisma.member.deleteMany({ where: { name: "Ramesh", mobile } });
  console.log("Cleanup done.");
  process.exit(0);
}

cleanup();
