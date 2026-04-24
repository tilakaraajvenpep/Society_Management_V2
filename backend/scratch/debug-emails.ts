import prisma from "../src/utils/prisma";

async function check() {
  const users = await prisma.user.findMany();
  users.forEach(u => {
    if (u.email === "" || u.email === null) {
      console.log("User with empty/null email:", u);
    }
  });
  process.exit(0);
}

check();
