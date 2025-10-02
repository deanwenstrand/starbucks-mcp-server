# Starbucks MCP Server

The first MCP server for ordering Starbucks coffee using AI! Built with Playwright automation and the Model Context Protocol.

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
5. **Confirmation**: Places the order when you approve

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
