# nogodey

Zero-boilerplate localization toolkit for React Native and JavaScript/TypeScript projects

## 🏗️ Architecture

nogodey is built as a **hybrid Go/JavaScript toolkit** with two main components:

### 🔧 **Go CLI** (`cmd/nogodey/`)
- **Purpose**: Build orchestration and process management
- **Features**: 
  - Structured logging with timing metrics
  - TypeScript build coordination
  - Cross-platform binary distribution

### 🔌 **JavaScript Plugin** (`js/`)
- **Purpose**: AST transformation and string extraction
- **Technology**: esbuild plugin with Babel AST parsing
- **Features**:
  - Automatic detection of localizable strings in JSX
  - Smart key generation using file context
  - Support for `Text` components and common attributes (`placeholder`, `label`, `title`)
  - Translation manifest generation

## 🚀 Quick Start

### Prerequisites
- **Go** 1.24.3+
- **Node.js** 18+
- **npm** or **yarn**

## 📁 Project Structure

```
nogodey/
├── cmd/nogodey/           # Go CLI application
│   ├── main.go           # CLI entry point & build orchestration
│   ├── logger/           # Structured logging utilities
│   └── testdata/         # Test fixtures
├── js/                   # JavaScript/TypeScript plugin
│   ├── src/              # Source code
│   │   ├── index.tsx     # React Native demo component
│   │   └── logger.ts     # Logging utilities
│   ├── tests/            # Test suites
│   ├── plugin.ts         # Main esbuild plugin
│   ├── build.ts          # Build configuration
│   └── package.json      # Dependencies & scripts
├── bin/                  # Built Go binaries
├── Makefile             # Build automation
└── README.md            # This file
```

## 🔄 How It Works

1. **AST Analysis**: The esbuild plugin parses your JSX/TSX files using Babel
2. **String Detection**: Identifies localizable strings in:
   - `<Text>` component children
   - Common attributes (`placeholder`, `label`, `title`)
3. **Key Generation**: Creates semantic keys based on file context and content
4. **Code Transformation**: Replaces strings with `__NOGO__(key)` calls
5. **Manifest Generation**: Builds translation manifest for your localization workflow

### Example Transformation

**Before:**
```tsx
<Text>Welcome to nogodey</Text>
<TextInput placeholder="Enter your name" />
```

**After:**
```tsx
<Text>{__NOGO__('app-welcome-to-nogodey')}</Text>
<TextInput placeholder={__NOGO__('app-enter-your-name')} />
```

## 🛠️ Available Commands

Run `make help` to see all available commands:

### Setup & Installation
- `make setup` - Complete project setup
- `make install` - Install all dependencies
- `make install-go` - Install Go dependencies only
- `make install-js` - Install JavaScript dependencies only

### Build Commands
- `make build` - Build both Go CLI and JS plugin
- `make build-go` - Build Go CLI application
- `make build-js` - Build JavaScript plugin
- `make build-plugin` - Build esbuild plugin specifically

## 🔧 Development Workflow

1. **Setup**: `make setup` (first time only)
2. **Development**: `make test-watch` for TDD
3. **Quality**: `make check` before committing
4. **Build**: `make build` to create distributables
5. **CI**: `make ci` runs the full pipeline

## 🤝 Contributing

1. Clone the repository
2. Create a feature/fix branch
3. Run `make setup` to install dependencies
4. Make your changes
5. Run `make check` to ensure quality
6. Submit a pull request
