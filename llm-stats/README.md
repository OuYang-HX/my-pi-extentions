# LLM Stats Extension

Tracks LLM API request counts in pi-coding-agent.

## Features

- **Request Count Tracking**: Counts each LLM API call
- **Status Bar Display**: Shows `Req: N` in status bar (不覆盖原有内容)
- **Session Persistence**: Saves request count across sessions
- **Commands**:
  - `/llm-stats` - Toggle display
  - `/llm-stats-show` - Show detailed statistics

## Display Example

Status bar会显示: `Req: 42`（叠加在原有内容上）

原有的统计信息完全保留：
```
↑1.5M ↓12k R480k W41k $0.991 21.6%/205k (auto)      Req: 42
```

## Installation

### Option 1: Copy Extension (Recommended)

```bash
# Copy the llm-stats folder to your extensions directory
cp -r llm-stats ~/.pi/agent/extensions/
```

### Option 2: Run Install Script

- Windows: Double-click `install.bat`
- Linux/Mac: Run `bash install.sh`

### Option 3: Project-local (Per-project tracking)

```bash
mkdir -p .pi/extensions
cp -r llm-stats .pi/extensions/
```

## Usage

The extension loads automatically. Request counts are:
- Incremented on each assistant message with usage data
- Persisted to session files
- Displayed in status bar as `Req: N`

### Commands

| Command | Description |
|---------|-------------|
| `/llm-stats` | Toggle the request count display |
| `/llm-stats-show` | Show detailed stats in a notification |

## Sharing

To share this extension:
1. Share the `llm-stats-package` folder
2. Recipient runs `install.bat` or `install.sh`
3. Restart pi or run `/reload`

## How It Works

- Uses `message_end` event to track assistant messages
- Only counts messages with valid usage data
- Uses `ctx.ui.setStatus()` to display without overriding footer

## Files

- `index.ts` - Main extension code
- `README.md` - This file
- `install.bat` - Windows installer
- `install.sh` - Unix installer
