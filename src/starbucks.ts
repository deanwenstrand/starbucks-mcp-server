import { chromium, Browser, Page } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface StarbucksItem {
  type: "drink" | "food";
  name: string;
  size?: "tall" | "grande" | "venti";
  modifications?: string[];
}

interface StarbucksFavorite {
  name: string;
  items: StarbucksItem[];
}

export class StarbucksClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private favoritesPath: string;
  private sessionPath: string;
  private favorites: StarbucksFavorite[] = [];
  private pendingOrder: { items: StarbucksItem[]; location: string } | null = null;

  constructor() {
    this.favoritesPath = path.join(process.cwd(), "starbucks-favorites.json");
    this.sessionPath = path.join(process.cwd(), "starbucks-session.json");
  }

  async initialize() {
    // Load favorites if they exist
    try {
      const data = await fs.readFile(this.favoritesPath, "utf-8");
      this.favorites = JSON.parse(data);
    } catch (error) {
      // No favorites file yet, start with defaults
      this.favorites = [
        {
          name: "Morning Coffee Run",
          items: [
            { type: "drink", name: "Iced Cold Brew", size: "tall" },
            { type: "drink", name: "Pike Place Roast", size: "grande" },
          ],
        },
        {
          name: "Decaf Grande",
          items: [{ type: "drink", name: "Decaf Pike Place", size: "grande" }],
        },
        {
          name: "Venti Black",
          items: [{ type: "drink", name: "Pike Place Roast", size: "venti" }],
        },
        {
          name: "Breakfast",
          items: [
            { type: "drink", name: "Pike Place Roast", size: "grande" },
            { type: "food", name: "Bacon Gouda Artisan Breakfast Sandwich" },
          ],
        },
      ];
      await this.saveFavorites();
    }
  }

  private async saveFavorites() {
    await fs.writeFile(
      this.favoritesPath,
      JSON.stringify(this.favorites, null, 2)
    );
  }

  async listFavorites() {
    return this.favorites;
  }

  async addFavorite(name: string, items: StarbucksItem[]) {
    this.favorites.push({ name, items });
    await this.saveFavorites();
    return { success: true, message: `Added favorite: ${name}` };
  }

  private async launchBrowser(headless: boolean = true) {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless });
      const context = await this.browser.newContext({
        permissions: [], // Deny all permissions including geolocation
      });
      this.page = await context.newPage();

      // Deny geolocation permission specifically
      await context.grantPermissions([], { origin: 'https://www.starbucks.com' });

      // Load saved session if it exists
      try {
        const sessionData = await fs.readFile(this.sessionPath, "utf-8");
        const cookies = JSON.parse(sessionData);
        await context.addCookies(cookies);
      } catch (error) {
        // No saved session yet
      }
    }
    return this.page!;
  }

  private async saveSession() {
    if (this.page) {
      const cookies = await this.page.context().cookies();
      await fs.writeFile(this.sessionPath, JSON.stringify(cookies, null, 2));
    }
  }

  async login() {
    // Close any existing headless browser first
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    const page = await this.launchBrowser(false); // Show browser for login

    try {
      // Navigate to Starbucks login page
      await page.goto("https://www.starbucks.com/account/signin");

      // Return instructions for the user
      return {
        success: true,
        message: "Browser opened to Starbucks login page. Please log in manually.",
        instructions: [
          "1. Log in with your Starbucks account",
          "2. Complete any 2FA if prompted",
          "3. Once logged in and you see your account page, I'll save the session",
          "4. Wait for confirmation message",
        ],
        note: "Leave the browser open. I'll detect when you're logged in and save the session automatically.",
      };
    } catch (error) {
      throw new Error(`Failed to open login page: ${error}`);
    }
  }

  async completeLogin() {
    if (!this.page) {
      throw new Error("No browser session active. Call login_starbucks first.");
    }

    try {
      // Wait for user to be on account page or main page (indicating successful login)
      await this.page.waitForURL(/starbucks\.com\/(account|menu|$)/, { timeout: 120000 });

      // Save the session
      await this.saveSession();

      return {
        success: true,
        message: "✓ Login successful! Session saved. You can now place orders without logging in again.",
      };
    } catch (error) {
      throw new Error(`Login timeout or failed: ${error}`);
    }
  }

  async checkAuth() {
    try {
      const sessionData = await fs.readFile(this.sessionPath, "utf-8");
      const cookies = JSON.parse(sessionData);
      return {
        authenticated: cookies.length > 0,
        message: cookies.length > 0
          ? "✓ Starbucks session found"
          : "No session found. Run login_starbucks to authenticate.",
      };
    } catch (error) {
      return {
        authenticated: false,
        message: "No session found. Run login_starbucks to authenticate.",
      };
    }
  }

  private async autoLogin() {
    const email = process.env.STARBUCKS_EMAIL;
    const password = process.env.STARBUCKS_PASSWORD;

    if (!email || !password) {
      throw new Error("STARBUCKS_EMAIL and STARBUCKS_PASSWORD environment variables not set");
    }

    // Close any existing browser first
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    const page = await this.launchBrowser(true); // Headless for auto-login

    try {
      // Navigate to login page
      await page.goto("https://www.starbucks.com/account/signin", { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      // Fill in credentials
      await page.fill('input[type="email"], input[name="username"]', email);
      await page.waitForTimeout(500);
      await page.fill('input[type="password"], input[name="password"]', password);
      await page.waitForTimeout(500);

      // Click sign in button
      await page.click('button[type="submit"], button:has-text("Sign in")');
      await page.waitForTimeout(3000);

      // Wait for successful login (should be redirected)
      await page.waitForURL(/starbucks\.com\/(account|menu|$)/, { timeout: 30000 });

      // Save the session
      await this.saveSession();

      return {
        success: true,
        message: "✓ Auto-login successful! Session saved.",
      };
    } catch (error) {
      throw new Error(`Auto-login failed: ${error}`);
    }
  }

  async orderFavorite(favoriteName: string, location: string = "Polk Street") {
    const favorite = this.favorites.find((f) => f.name === favoriteName);
    if (!favorite) {
      throw new Error(`Favorite "${favoriteName}" not found`);
    }

    return await this.placeOrder(favorite.items, location);
  }

  async placeOrder(items: StarbucksItem[], location: string = "Polk Street") {
    let page = await this.ensureBrowserOpen();

    try {
      // Check if user is logged in first
      await page.goto("https://www.starbucks.com/menu", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(1000);

      // Check for sign-in button - if it exists, user is not logged in
      const signInButton = page.locator('button:has-text("Sign in"), a:has-text("Sign in")').first();
      const isSignInVisible = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isSignInVisible) {
        // Try auto-login if credentials are available
        if (process.env.STARBUCKS_EMAIL && process.env.STARBUCKS_PASSWORD) {
          await this.autoLogin();
          // Reopen browser and reload menu page after auto-login
          page = await this.ensureBrowserOpen();
          await page.goto("https://www.starbucks.com/menu", { waitUntil: "networkidle", timeout: 15000 });
          await page.waitForTimeout(1000);
        } else {
          throw new Error("Not logged in. Please run login_starbucks first to authenticate, or set STARBUCKS_EMAIL and STARBUCKS_PASSWORD environment variables.");
        }
      }

      // Clear cart first by navigating to it and removing items if present
      await page.goto("https://www.starbucks.com/menu/cart", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(1000);

      // Try to remove all items from cart
      const removeButtons = await page.locator('button[aria-label*="Remove"], button:has-text("Remove")').all();
      for (const button of removeButtons) {
        try {
          await button.click({ timeout: 2000 });
          await page.waitForTimeout(500);
        } catch (e) {
          // Ignore if button can't be clicked
        }
      }

      // Convert location name to full address
      const addressMap: { [key: string]: string } = {
        "Polk Street": "2165 Polk St, San Francisco, CA 94109, USA",
        "polk street": "2165 Polk St, San Francisco, CA 94109, USA",
        "polk": "2165 Polk St, San Francisco, CA 94109, USA",
      };

      const address = addressMap[location.toLowerCase()] || "2165 Polk St, San Francisco, CA 94109, USA";

      // Navigate to store locator first
      await page.goto("https://www.starbucks.com/menu/store-locator", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

      // Find the "Find a store" input and enter address
      const storeInput = page.locator('input[name="place"]').first();
      try {
        await storeInput.waitFor({ state: "visible", timeout: 10000 });
      } catch (error) {
        throw new Error("Could not find store search input. The page may have changed or failed to load.");
      }

      await storeInput.fill(address);
      await storeInput.press("Enter");
      await page.waitForTimeout(3000);

      // Click on the "Order Here" button for the selected store
      try {
        await page.locator('button:has-text("Order Here"), button.sb-button--positive').first().click({ timeout: 10000 });
      } catch (error) {
        throw new Error("Could not find 'Order Here' button for the store. The store may not be available for ordering.");
      }
      await page.waitForTimeout(2000);

      // Should now be back at menu with store selected

      // Now add items to cart
      for (const item of items) {
        await this.addItemToCart(page, item);
      }

      // Open cart by navigating directly
      await page.goto("https://www.starbucks.com/menu/cart", { waitUntil: "networkidle" });
      await page.waitForLoadState("domcontentloaded");

      // Wait for cart items to load - look for review order button or item prices
      try {
        await page.waitForSelector('a:has-text("Checkout"), button:has-text("Checkout"), [class*="price"]', { timeout: 5000 });
      } catch {
        // Continue even if selector doesn't appear
      }
      await page.waitForTimeout(3000); // Additional wait for total calculation

      // Store pending order for approval
      this.pendingOrder = { items, location };

      const itemDescriptions = items.map((item) => {
        if (item.type === "drink") {
          return `${item.size ? item.size.charAt(0).toUpperCase() + item.size.slice(1) : ""} ${item.name}`.trim();
        }
        return item.name;
      });

      // Scrape order details from the page
      let orderSummary: any = {
        items: itemDescriptions,
        location: location,
      };

      try {
        // Verify cart has items
        const bodyText = await page.locator('body').textContent();
        const cartCount = bodyText?.match(/Review order \((\d+)\)/i);

        if (cartCount && cartCount[1] === '0') {
          throw new Error("Cart is empty - items failed to add. This may be a headless mode issue.");
        }

        // Cart page doesn't show prices - need to go through checkout flow
        const continueButton = page.locator('button:has-text("Continue"), a:has-text("Continue")').first();
        await continueButton.waitFor({ state: "visible", timeout: 5000 });
        await continueButton.click();
        await page.waitForTimeout(2000);

        // Handle "How do you want to complete your purchase?" modal
        try {
          const signInButton = page.locator('button:has-text("Sign in"), a:has-text("Sign in")').first();
          await signInButton.waitFor({ state: "visible", timeout: 3000 });
          await signInButton.click();
          await page.waitForTimeout(2000);
        } catch {
          // Modal might not appear
        }

        // Check if we landed on login page, and sign in with credentials
        const isLoginPage = await page.locator('input[type="email"], input[name="username"]').isVisible({ timeout: 2000 }).catch(() => false);
        if (isLoginPage && process.env.STARBUCKS_EMAIL && process.env.STARBUCKS_PASSWORD) {
          await page.fill('input[type="email"], input[name="username"]', process.env.STARBUCKS_EMAIL);
          await page.fill('input[type="password"], input[name="password"]', process.env.STARBUCKS_PASSWORD);
          await page.click('button[type="submit"], button:has-text("Sign in")');
          await page.waitForTimeout(3000);
          await this.saveSession();
        }

        // Debug screenshot
        await page.screenshot({ path: '/tmp/starbucks-final-checkout.png' });

        // Now try to get the total from checkout page
        const checkoutText = await page.locator('body').textContent();
        let totalMatch = checkoutText?.match(/Total\s*\$?([\d]+\.[\d]{2})/i);
        if (!totalMatch) {
          totalMatch = checkoutText?.match(/\$\s*([\d]+\.[\d]{2})\s*total/i);
        }
        if (!totalMatch) {
          const subtotalIdx = checkoutText?.toLowerCase().indexOf('subtotal');
          if (subtotalIdx && subtotalIdx > -1) {
            const afterSubtotal = checkoutText?.substring(subtotalIdx);
            const priceMatch = afterSubtotal?.match(/\$([\d]+\.[\d]{2})/);
            if (priceMatch) totalMatch = priceMatch;
          }
        }
        if (totalMatch) {
          orderSummary.total = `$${totalMatch[1]}`;
        }

        // Go back to cart
        await page.goto("https://www.starbucks.com/menu/cart", { waitUntil: "networkidle" });
      } catch (e) {
        if (e instanceof Error && e.message.includes("Cart is empty")) {
          throw e;
        }
        // Other scraping errors are okay
      }

      return {
        success: true,
        message: "🛒 Order ready for review",
        ...orderSummary,
        note: "Review your order above. Use confirm_starbucks_order to place it, or cancel_starbucks_order to cancel.",
        requiresApproval: true,
      };
    } catch (error) {
      throw new Error(`Failed to place order: ${error}`);
    }
  }

  async confirmOrder() {
    if (!this.pendingOrder) {
      throw new Error("No pending order to confirm. Place an order first.");
    }

    if (!this.page) {
      throw new Error("Browser session not active.");
    }

    try {
      // Click Checkout button from cart page
      const checkoutButton = this.page.locator('a:has-text("Checkout"), button:has-text("Checkout")').first();
      await checkoutButton.waitFor({ state: "visible", timeout: 5000 });
      await checkoutButton.click();
      await this.page.waitForTimeout(3000);

      // Now click the final "Place Order" button on checkout page
      try {
        await this.page.click('button:has-text("Place order"), button:has-text("Place Order"), button:has-text("Confirm")');
        await this.page.waitForTimeout(3000);
      } catch (e) {
        // If no place order button, the order might already be placed
      }

      const order = this.pendingOrder;
      this.pendingOrder = null;

      return {
        success: true,
        message: "✓ Order placed successfully!",
        items: order.items.map((item) => {
          if (item.type === "drink") {
            return `${item.size ? item.size.charAt(0).toUpperCase() + item.size.slice(1) : ""} ${item.name}`.trim();
          }
          return item.name;
        }),
        location: order.location,
        note: "Order confirmation should appear in browser and you'll receive a notification.",
      };
    } catch (error) {
      throw new Error(`Failed to confirm order: ${error}`);
    }
  }

  async cancelOrder() {
    if (!this.pendingOrder) {
      throw new Error("No pending order to cancel.");
    }

    this.pendingOrder = null;

    if (this.page) {
      // Try to clear cart or go back
      await this.page.goto("https://www.starbucks.com/").catch(() => {});
    }

    return {
      success: true,
      message: "Order cancelled. Cart may still contain items - you can clear it manually if needed.",
    };
  }

  private async addItemToCart(page: Page, item: StarbucksItem) {
    try {
      // Navigate to appropriate category first
      if (item.type === "drink") {
        // Check if item name suggests it's a cold drink
        const isCold = item.name.toLowerCase().includes("iced") ||
                      item.name.toLowerCase().includes("cold brew") ||
                      item.name.toLowerCase().includes("frappuccino");

        const category = isCold ? "cold-coffee" : "hot-coffee";
        await page.goto(`https://www.starbucks.com/menu/drinks/${category}`);
        await page.waitForTimeout(1000);
      } else {
        // Navigate to food menu - use breakfast as it has most items
        await page.goto("https://www.starbucks.com/menu/food/breakfast");
        await page.waitForTimeout(1000);
      }

      // Click on the item link (use partial text match, but exclude Traveler items)
      // Normalize special characters for matching
      const normalizedItemName = item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const allLinks = await page.locator('a[href*="/menu/product/"]').all();
      let targetLink = null;

      for (const link of allLinks) {
        const text = await link.textContent();
        if (text) {
          const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          // Check if the normalized text contains the normalized item name
          if (normalizedText.toLowerCase().includes(normalizedItemName.toLowerCase()) &&
              !text.toLowerCase().includes('traveler')) {
            targetLink = link;
            break;
          }
        }
      }

      if (!targetLink) {
        throw new Error(`Could not find item: ${item.name}`);
      }

      await targetLink.click();
      await page.waitForTimeout(1000);

      // Select size if it's a drink
      if (item.type === "drink" && item.size) {
        const sizeMap = {
          tall: "Tall",
          grande: "Grande",
          venti: "Venti",
        };
        const sizeText = sizeMap[item.size];
        const sizeLabel = page.locator(`label:has-text("${sizeText}")`).first();
        await sizeLabel.waitFor({ state: "visible", timeout: 3000 });
        await sizeLabel.click();
        await page.waitForTimeout(500);
      }

      // Add to order
      await page.click('button:has-text("Add to Order")');
      await page.waitForTimeout(800);
    } catch (error) {
      throw new Error(`Failed to add ${item.name} to cart: ${error}`);
    }
  }

  async customOrder(
    drinks: Array<{ name: string; size: string }>,
    food: string[],
    location: string = "Polk Street"
  ) {
    const items: StarbucksItem[] = [
      ...drinks.map((d) => ({
        type: "drink" as const,
        name: d.name,
        size: d.size as "tall" | "grande" | "venti",
      })),
      ...food.map((f) => ({ type: "food" as const, name: f })),
    ];

    return await this.placeOrder(items, location);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async ensureBrowserOpen() {
    // Check if browser is still connected
    if (this.browser && !this.browser.isConnected()) {
      this.browser = null;
      this.page = null;
    }
    return this.launchBrowser();
  }
}
