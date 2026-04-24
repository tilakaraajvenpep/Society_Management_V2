import prisma from "../src/utils/prisma";
import bcrypt from "bcryptjs";

async function reset() {
  const email = "admin@venpep.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log(`Password reset successful for ${email}`);
  } catch (error) {
    console.error("Error resetting password:", error);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
