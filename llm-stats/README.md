# LLM Stats Extension

Tracks LLM API request counts in pi-coding-agent footer, while preserving all original token statistics.

## Features

- **Request Count Tracking**: Counts each LLM API call
- **Preserves Original Stats**: Shows full token stats (↑ ↓ R W $ context%)
- **Inline Footer Display**: Shows `Req:N` appended to existing stats
- **Session Persistence**: Saves request count across sessions
- **Commands**:
  - `/llm-stats` - Toggle display
  - `/llm-stats-show` - Show detailed statistics

## Display Example

```
~/project (main) • my-session
↑98k ↓1.9k R78k W4.3k $0.070 9.1%/205k (auto) Req:12  model-name (main)
```

The `Req:N` counter is appended to the right of the original stats line, replacing nothing.
When no tokens exist yet (session just started), shows `?/205k (auto) Req:0`.

## Installation

### Option 1: Copy Extension

```bash
cp -r llm-stats ~/.pi/agent/extensions/
```

### Option 2: Run Install Script

- Windows: `install.bat`
- Linux/Mac: `bash install.sh`

## Usage

Request counts are:
- Incremented on each assistant message with usage data
- Persisted to session files
- Displayed in footer as `Req:N`

### Commands

| Command | Description |
|---------|-------------|
| `/llm-stats` | Toggle the request count display |
| `/llm-stats-show` | Show detailed stats |
