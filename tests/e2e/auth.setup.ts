
import { test as setup } from "@playwright/test";
import { loginUserProgrammatically, TEST_USERS } from "./helpers/auth.helper";

const authFiles = {
  user: "tests/.auth/user.json",
  admin: "tests/.auth/admin.json",
  manager: "tests/.auth/manager.json",
};

// Setup authentication for different roles
setup("authenticate as user", async ({ page }) => {
  await loginUserProgrammatically(page, "user");
  await page.context().storageState({ path: authFiles.user });
});

setup("authenticate as admin", async ({ page }) => {
  await loginUserProgrammatically(page, "admin");
  await page.context().storageState({ path: authFiles.admin });
});

setup("authenticate as manager", async ({ page }) => {
  await loginUserProgrammatically(page, "manager");
  await page.context().storageState({ path: authFiles.manager });
});
