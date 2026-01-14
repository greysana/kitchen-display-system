import { Page, expect } from "@playwright/test";
import { KDSUser, LoginResponse } from "@/types/auth.types";

const API_BASE_URL = "http://localhost:8073";
const LOGIN_URL = "http://localhost:3000/login";
const KDS_URL = "http://localhost:3000/";

export const TEST_USERS = {
  admin: {
    email: "admin@test.com",
    password: "admin123",
    name: "Admin User",
    roles: ["admin", "manager", "user"],
    token: "mock-admin-token-12345",
    uid: 1,
    permissions: {
      can_view_orders: true,
      can_update_orders: true,
      can_manage_config: true,
      can_manage_tokens: true,
      can_view_all_stations: true,
    },
  },
  manager: {
    email: "manager@test.com",
    password: "manager123",
    name: "Manager User",
    roles: ["manager", "user"],
    token: "mock-manager-token-67890",
    uid: 2,
    permissions: {
      can_view_orders: true,
      can_update_orders: true,
      can_manage_config: false,
      can_manage_tokens: false,
      can_view_all_stations: true,
    },
  },
  user: {
    email: "user@test.com",
    password: "user123",
    name: "Kitchen User",
    roles: ["user"],
    token: "mock-user-token-abcde",
    uid: 3,
    permissions: {
      can_view_orders: true,
      can_update_orders: true,
      can_manage_config: false,
      can_manage_tokens: false,
      can_view_all_stations: false,
    },
  },
};

export type UserType = keyof typeof TEST_USERS;

/**
 * Mock the login API endpoint with JSON-RPC format
 */
export async function mockLoginAPI(page: Page) {
  await page.route(`${API_BASE_URL}/api/kds/login`, async (route) => {
    const postData = route.request().postDataJSON();
    const { login, password } = postData.params;

    // Find matching user
    const user = Object.values(TEST_USERS).find(
      (u) => u.email === login && u.password === password
    );

    if (user) {
      const response: LoginResponse = {
        success: true,
        token: user.token,
        user: {
          id: user.uid,
          name: user.name,
          email: user.email,
          login: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: postData.id || null,
          result: response,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: postData.id || null,
          error: {
            code: 100,
            message: "Invalid credentials",
            data: {
              message: "Invalid email or password",
            },
          },
        }),
      });
    }
  });
}

/**
 * Mock the verify token API endpoint
 */
export async function mockVerifyAPI(page: Page, validTokens: string[] = []) {
  await page.route(`${API_BASE_URL}/api/kds/verify`, async (route) => {
    const headers = route.request().headers();
    const token = headers["x-api-token"];

    const user = Object.values(TEST_USERS).find((u) => u.token === token);

    if (user && (validTokens.length === 0 || validTokens.includes(token))) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          result: {
            valid: true,
            user: {
              uid: user.uid,
              name: user.name,
              email: user.email,
              roles: user.roles,
              permissions: user.permissions,
            },
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: 100,
            message: "Invalid token",
            data: {
              message: "Token verification failed",
            },
          },
        }),
      });
    }
  });
}

/**
 * Mock the logout API endpoint
 */
export async function mockLogoutAPI(page: Page) {
  await page.route(`${API_BASE_URL}/api/kds/logout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jsonrpc: "2.0",
        result: {
          success: true,
          message: "Logged out successfully",
        },
      }),
    });
  });
}

/**
 * Login user via UI
 */
export async function loginUser(page: Page, userType: UserType) {
  const user = TEST_USERS[userType];

  // Mock the login API
  await mockLoginAPI(page);
  await mockVerifyAPI(page, [user.token]);
  await mockLogoutAPI(page);

  await page.goto(LOGIN_URL);

  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for successful login and redirect
  await page.waitForURL(KDS_URL, { timeout: 10000 });

  // Verify user is logged in by checking navigation
  await expect(page.getByText(user.name)).toBeVisible({ timeout: 5000 });

  return user;
}

/**
 * Login user programmatically (faster for tests)
 */
export async function loginUserProgrammatically(
  page: Page,
  userType: UserType
) {
  const user = TEST_USERS[userType];

  // Mock APIs
  await mockVerifyAPI(page, [user.token]);
  await mockLogoutAPI(page);

  // Set localStorage directly
  await page.addInitScript(
    ({ token, userData }) => {
      localStorage.setItem("kds_token", token);
      localStorage.setItem("kds_user", JSON.stringify(userData));
    },
    {
      token: user.token,
      userData: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
      },
    }
  );
  console.log(KDS_URL);
  await page.goto(KDS_URL);
  await expect(page.getByText(user.name)).toBeVisible({ timeout: 5000 });

  return user;
}

/**
 * Logout user
 */
export async function logoutUser(page: Page) {
  await mockLogoutAPI(page);

  // Click logout button
  await page.click('button:has-text("Logout")');

  // Wait for redirect to login page
  await page.waitForURL(LOGIN_URL, { timeout: 5000 });
}

/**
 * Verify authentication state
 */
export async function verifyAuthentication(
  page: Page,
  shouldBeAuthenticated: boolean
) {
  if (shouldBeAuthenticated) {
    // Should see user info
    await expect(page.locator('[data-testid="user_auth"]')).toBeVisible();

    // Should see logout button
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // Should have token in localStorage
    const token = await page.evaluate(() => localStorage.getItem("kds_token"));
    expect(token).toBeTruthy();
  } else {
    // Should be on login page
    await page.waitForURL(LOGIN_URL, { timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Should not have token
    const token = await page.evaluate(() => localStorage.getItem("kds_token"));
    expect(token).toBeFalsy();
  }
}

/**
 * Get authentication data from localStorage
 */
export async function getAuthData(page: Page): Promise<{
  token: string | null;
  user: KDSUser | null;
}> {
  const data = await page.evaluate(() => {
    const token = localStorage.getItem("kds_token");
    const userStr = localStorage.getItem("kds_user");
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  });

  return data;
}

/**
 * Clear authentication data
 */
export async function clearAuthData(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("kds_token");
    localStorage.removeItem("kds_user");
  });
}

/**
 * Verify user has specific role
 */
export async function verifyUserRole(
  page: Page,
  expectedRole: string
): Promise<boolean> {
  const { user } = await getAuthData(page);
  return user?.roles?.includes(expectedRole) || false;
}
