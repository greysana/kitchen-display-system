import { test as base } from "@playwright/test";
import {
  loginUserProgrammatically,
  logoutUser,
  TEST_USERS,
  UserType,
} from "../helpers/auth.helper";
import { setupAuthMocks } from "../helpers/api.helper";

type AuthFixtures = {
  authenticatedUser: UserType;
  loginAs: (userType: UserType) => Promise<(typeof TEST_USERS)[UserType]>;
  authMocks: void;
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: ["user", { option: true }],

  authMocks: [
    async ({ page, authenticatedUser }, use) => {
      await setupAuthMocks(page, authenticatedUser);
      await use();
    },
    { auto: true },
  ],

  loginAs: async ({ page, authMocks }, use) => {
    const loginFn = async (userType: UserType) => {
      await setupAuthMocks(page, userType);
      return await loginUserProgrammatically(page, userType);
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginFn);

    // Cleanup: logout after test
    try {
      await logoutUser(page);
    } catch {
      // Ignore logout errors in cleanup
    }
  },
});

export { expect } from "@playwright/test";
