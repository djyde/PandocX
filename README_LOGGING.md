# Enhanced Logging System

This project now includes a comprehensive logging system with an animated status bar that can expand to show detailed conversion logs.

## Features

### 1. Detailed Rust Logging
- **Timestamped logs**: Each log entry includes an ISO timestamp
- **Multiple log levels**: `info`, `success`, `error`
- **Detailed context**: Optional details field for command output, error messages, etc.
- **Progress tracking**: Real-time progress updates with percentage completion

### 2. Animated Status Bar
- **Auto-show/hide**: Appears during conversion, disappears when complete
- **Smooth animations**: Uses Framer Motion for fluid transitions
- **Progress visualization**: Animated progress bar with percentage
- **Quick access**: Shows current status and progress at a glance

### 3. Expandable Log Viewer
- **Full-screen expansion**: Click "See Log" to expand to full screen height
- **Detailed log view**: Shows all log entries with timestamps, levels, and details
- **Color-coded levels**: Different colors for info (blue), success (green), error (red)
- **Collapsible**: Click "Collapse" to return to compact status bar
- **Clear functionality**: Clear logs button to start fresh

## How It Works

### Rust Side (commands.rs)
```rust
// Emits both progress and detailed log entries
emit_progress_and_log(
    &app,
    "processing",
    "Converting to PDF...",
    50.0,
    "info",
    Some("Command: pandoc input.md -o output.pdf")
);
```

### Frontend Side
The logging system uses React Context to manage state:

1. **LogStoreProvider**: Wraps the app to provide logging context
2. **StatusBar**: Animated status bar component that shows/hides automatically
3. **LogViewer**: Full-screen log viewer with detailed entries

### Usage
The system works automatically:
1. Start a conversion
2. Status bar appears at bottom with progress
3. Click "See Log" to expand and view detailed logs
4. Click "Collapse" to return to compact view
5. Status bar disappears when conversion completes

## Animation Details
- **Entry/Exit**: Status bar slides up from bottom with spring animation
- **Expansion**: Smooth height transition to full screen
- **Progress bar**: Animated width changes with easing
- **Log entries**: Staggered fade-in animation for new entries

## Log Levels
- **info**: General information (blue)
- **success**: Successful operations (green)  
- **error**: Error messages (red)

The system provides comprehensive visibility into the conversion process while maintaining a clean, unobtrusive interface when not needed.
