# CLI Output Logging Example

The logging system now displays the actual pandoc CLI output instead of custom structured messages. Here's what you'll see:

## Terminal-Style Log Display

```
12:34:56  ➜ pandocx pandoc "/path/to/input.md" -o "/path/to/output.pdf"
12:34:56  Executing pandoc...
12:34:57  [WARNING] Could not convert TeX math \alpha, rendering as TeX
12:34:57  [INFO] Running xelatex on output.tex...
12:34:58  This is XeTeX, Version 3.141592653-2.6-0.999995 (TeX Live 2023)
12:34:58  restricted \write18 enabled.
12:34:58  entering extended mode
12:34:59  Successfully created: /path/to/output.pdf
```

## Features

### 1. **Command Display**
- Shows the exact pandoc command being executed
- Terminal-style prompt: `➜ pandocx command`
- Green text for commands

### 2. **Real Output**
- Displays actual stdout/stderr from pandoc
- Preserves original formatting and line breaks
- Shows warnings, errors, and info messages as they appear

### 3. **Terminal Styling**
- Black background for authentic terminal look
- Monospace font for proper alignment
- Color-coded output:
  - **Green**: Success messages
  - **Red**: Error messages  
  - **Gray**: Regular output and info
  - **Blue**: Command prompts

### 4. **Comprehensive Logging**
- Captures both stdout and stderr
- Shows pandoc warnings even on successful conversion
- Displays the full conversion process output
- Includes LaTeX engine output for PDF generation

### 5. **Timestamp Display**
- Shows exact time for each log entry
- Compact format: `HH:MM:SS`
- Left-aligned for easy scanning

## Example Conversion Outputs

### PDF Generation
```
➜ pandocx pandoc "document.md" -o "document.pdf"
[WARNING] Could not convert TeX math \sum_{i=1}^n, rendering as TeX
[INFO] Running pdflatex on document.tex...
This is pdfTeX, Version 3.141592653-2.6-1.40.24
entering extended mode
LaTeX2e <2022-11-01> patch level 1
Document Class: article 2022/07/02 v1.4n
Successfully created: document.pdf
```

### DOCX Generation  
```
➜ pandocx pandoc "document.md" -o "document.docx"
Successfully created: document.docx
```

### Error Example
```
➜ pandocx pandoc "missing.md" -o "output.pdf"  
pandoc: missing.md: openBinaryFile: does not exist (No such file or directory)
```

This provides full transparency into what pandoc is actually doing during the conversion process.
