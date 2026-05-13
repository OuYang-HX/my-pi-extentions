# LLM Stats Extension

Tracks LLM API request counts in pi-coding-agent footer.

## Features

- **Request Count Tracking**: Counts each LLM API call
- **Inline Footer Display**: Shows `Req:N` on the same line as token stats
- **Session Persistence**: Saves request count across sessions
- **Commands**:
  - `/llm-stats` - Toggle display
  - `/llm-stats-show` - Show detailed statistics

## Display Example

```
↑12 ↓104 R6.9k W6 $0.001 Req:42  model-name
```

Req count is displayed inline with token statistics.

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
