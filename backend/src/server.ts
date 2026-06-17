import app from "./app";
import { ensureTenantSchemas } from "./utils/prisma";

const PORT = process.env.PORT || 5001;

ensureTenantSchemas().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to sync tenant schemas:", err);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
