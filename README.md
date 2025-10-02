# Starbucks MCP Server

The first MCP server for ordering Starbucks coffee using AI! Built with Playwright automation and the Model Context Protocol.

## ⚠️ Important Disclaimers

**UNOFFICIAL & EDUCATIONAL USE ONLY**

- This project is **NOT affiliated with, endorsed by, or connected to Starbucks Corporation** in any way
- **Use at your own risk** - This tool may violate Starbucks Terms of Service
- **For educational and personal use only** - Not intended for commercial use
- **You are financially responsible** for all orders placed through this tool
- **No warranty** - Provided "AS IS" without warranty of any kind (see LICENSE)
- Your Starbucks account may be banned for using automated tools
- Starbucks may request this repository be taken down at any time

**FINANCIAL SAFETY:**
- ✅ **Every order requires manual confirmation** - Orders are NOT automatically placed
- ✅ **Review flow built-in** - You see the order details before confirming
- ⚠️ **Always verify** order details, prices, and totals before confirming
- ⚠️ **Monitor your account** - Check your bank statements regularly
- 🚨 **Emergency stop** - Close the browser immediately if something goes wrong

By using this software, you acknowledge these risks and agree to use it responsibly.

## Features

- 🔐 **Browser-based authentication** - Log in once, order anytime
- ⭐ **Favorite orders** - Save and reorder your go-to drinks and food
- 🎯 **Custom orders** - Order any combination of drinks and food
- 📍 **Location support** - Select your pickup location
- ✅ **Order approval** - Review before placing your order

## Installation

```bash
cd ~/code/starbucks-mcp-server
npm install
npm run build
```

## Configuration

Add to your Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "starbucks": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/starbucks-mcp-server/dist/server.js"],
      "env": {},
      "cwd": "/path/to/starbucks-mcp-server"
    }
  }
}
```

## Usage

### First Time Setup

```
# Log in to Starbucks
> login_starbucks

# Complete the login in the browser, then:
> complete_starbucks_login
```

### Ordering

```
# Order a favorite
> Order my "Morning Coffee Run"

# Custom order
> Order a grande Pike Place Roast and a Bacon Gouda sandwich

# List favorites
> What are my Starbucks favorites?

# Add a new favorite
> Save a new favorite called "Afternoon Pick-Me-Up" with a venti cold brew
```

### Example Commands

- "Order me a tall iced cold brew from Polk Street"
- "Place my usual morning coffee order"
- "What Starbucks favorites do I have saved?"
- "Order breakfast - grande pike place and a breakfast sandwich"

## Tools

- `login_starbucks` - Open browser for authentication
- `complete_starbucks_login` - Complete login after manual sign-in
- `check_starbucks_auth` - Check authentication status
- `list_starbucks_favorites` - List saved favorite orders
- `order_starbucks_favorite` - Order a saved favorite
- `order_starbucks_custom` - Place a custom order
- `add_starbucks_favorite` - Save a new favorite
- `confirm_starbucks_order` - Confirm and place pending order
- `cancel_starbucks_order` - Cancel pending order

## How It Works

This MCP server uses Playwright to automate the Starbucks website:

1. **Authentication**: Opens a browser for you to log in manually
2. **Session Management**: Saves cookies for future orders
3. **Order Automation**: Navigates the menu, selects items, and adds to cart
4. **Review Flow**: Shows you the order before placing it
5. **Confirmation**: Places the order **ONLY when you explicitly approve**

### Safety Features

- **No automatic ordering** - Every order stops at the cart for your review
- **Explicit confirmation required** - You must run `confirm_starbucks_order` to place the order
- **Cancel anytime** - Use `cancel_starbucks_order` to abort before confirmation
- **Order details shown** - See items, prices (when available), and location before confirming
- **Session-based** - You control when the browser opens and closes

### Troubleshooting

**If something goes wrong:**
1. Close the browser window immediately
2. Check your Starbucks app/account for pending orders
3. Cancel any unwanted orders in the Starbucks app
4. Delete `starbucks-session.json` to force re-authentication
5. Use `cancel_starbucks_order` before confirming to abort

**Common issues:**
- Orders fail to add items → Website may have changed, headless mode issues
- Session expired → Run `login_starbucks` again
- Wrong location → Specify location explicitly in order commands

## Requirements

- Node.js 18+
- Playwright (automatically installs browsers)
- Active Starbucks account

## Contributing

This is the first Starbucks MCP server! Contributions welcome:

- Add support for customizations (milk, sweeteners, etc.)
- Improve location detection
- Add order history
- Support for gift cards and rewards

## License

MIT

## Author

Dean Wenstrand

---

☕ Built with Claude Code and caffeine
