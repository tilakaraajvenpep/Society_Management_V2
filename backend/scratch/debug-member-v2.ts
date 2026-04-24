import prisma from "../src/utils/prisma";

async function check() {
  const users = await prisma.user.findMany();
  console.log("All users count:", users.length);
  users.forEach(u => {
    if (u.mobile === "9788330072" || u.email === "a@b.com") {
      console.log("Conflicting User:", u);
    }
  });
  process.exit(0);
}

check();
