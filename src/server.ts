#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StarbucksClient } from "./starbucks.js";

const server = new Server(
  {
    name: "starbucks-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Starbucks client
const starbucksClient = new StarbucksClient();

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "login_starbucks",
        description: "Open browser for Starbucks login (first-time setup or to refresh expired session)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "complete_starbucks_login",
        description: "Complete Starbucks login after user has logged in manually in the browser",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "check_starbucks_auth",
        description: "Check if Starbucks session is authenticated",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_starbucks_favorites",
        description: "List all saved Starbucks favorite orders",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "order_starbucks_favorite",
        description: "Order a saved Starbucks favorite (e.g., 'Morning Coffee Run', 'Breakfast')",
        inputSchema: {
          type: "object",
          properties: {
            favoriteName: {
              type: "string",
              description: "Name of the favorite order",
            },
            location: {
              type: "string",
              description: "Store location (default: Polk Street)",
              default: "Polk Street",
            },
          },
          required: ["favoriteName"],
        },
      },
      {
        name: "order_starbucks_custom",
        description: "Place a custom Starbucks order with specific drinks and food",
        inputSchema: {
          type: "object",
          properties: {
            drinks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Drink name (e.g., 'Pike Place Roast', 'Iced Cold Brew')",
                  },
                  size: {
                    type: "string",
                    enum: ["tall", "grande", "venti"],
                    description: "Drink size",
                  },
                },
                required: ["name", "size"],
              },
              description: "List of drinks to order",
            },
            food: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of food items (e.g., 'Bacon Gouda Artisan Breakfast Sandwich')",
            },
            location: {
              type: "string",
              description: "Store location (default: Polk Street)",
              default: "Polk Street",
            },
          },
        },
      },
      {
        name: "add_starbucks_favorite",
        description: "Save a new Starbucks favorite order",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name for this favorite",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["drink", "food"],
                  },
                  name: {
                    type: "string",
                  },
                  size: {
                    type: "string",
                    enum: ["tall", "grande", "venti"],
                  },
                },
                required: ["type", "name"],
              },
              description: "Items in this favorite order",
            },
          },
          required: ["name", "items"],
        },
      },
      {
        name: "confirm_starbucks_order",
        description: "Confirm and place a pending Starbucks order after review",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "cancel_starbucks_order",
        description: "Cancel a pending Starbucks order",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "login_starbucks": {
        const result = await starbucksClient.login();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "complete_starbucks_login": {
        const result = await starbucksClient.completeLogin();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "check_starbucks_auth": {
        const result = await starbucksClient.checkAuth();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_starbucks_favorites": {
        const favorites = await starbucksClient.listFavorites();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(favorites, null, 2),
            },
          ],
        };
      }

      case "order_starbucks_favorite": {
        const favoriteName = args?.favoriteName as string;
        const location = (args?.location as string) || "Polk Street";

        if (!favoriteName) {
          throw new Error("favoriteName is required");
        }

        const result = await starbucksClient.orderFavorite(favoriteName, location);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "order_starbucks_custom": {
        const drinks = (args?.drinks as Array<{ name: string; size: string }>) || [];
        const food = (args?.food as string[]) || [];
        const location = (args?.location as string) || "Polk Street";

        const result = await starbucksClient.customOrder(drinks, food, location);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "add_starbucks_favorite": {
        const name = args?.name as string;
        const items = args?.items as Array<{
          type: "drink" | "food";
          name: string;
          size?: "tall" | "grande" | "venti";
        }>;

        if (!name || !items) {
          throw new Error("name and items are required");
        }

        const result = await starbucksClient.addFavorite(name, items);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "confirm_starbucks_order": {
        const result = await starbucksClient.confirmOrder();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "cancel_starbucks_order": {
        const result = await starbucksClient.cancelOrder();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  await starbucksClient.initialize();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Starbucks MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
