<p align="center">
  <img src="herma.png" alt="Herma logo" width="160" />
</p>

<h1 align="center">Herma</h1>

<p align="center">
  Desktop app for consolidating spreadsheet data into template-based Excel workbooks.
</p>

---

**Herma** helps you assemble Excel outputs from many source files without manual copy-paste. Define a template workbook, map rules that pull columns, rows, blocks, or entire sheets from your sources, and generate the result in one step—or run batch automations from an iteration sheet.

Built with **Electron**, **React**, and **TypeScript**.

## Features

### Configuration

- **Template workbook** — Choose an `.xlsx` file as the destination layout.
- **Source files** — Import `.xlsx`, `.xls`, and `.csv` spreadsheets.
- **Copy rules** — Copy data into the template using flexible selections:
  - **Columns** — By column number or header name, with optional row filters and **inverted selection** (copy all columns *except* the pattern).
  - **Rows** — A contiguous row range.
  - **Cell block** — A rectangular range.
  - **Full sheet** — The entire sheet.
- **Merge sheets** — Combine all imported source sheets into a single output file.
- **Constants** — Reusable named values for filters and automations.
- **Project files** — Export and import your configuration as JSON.

### Automations

- Drive repeated exports from an **iteration spreadsheet**.
- Map columns to constants and output file patterns.
- Validate rows before running and preview resolved filenames.
- Batch-generate multiple workbooks in one run.

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 20.19 or later
- npm

### Development

```bash
git clone https://github.com/herma/herma.git
cd herma
npm install
npm run dev
```

### Build

```bash
npm run build          # Compile the app
npm run build:mac      # macOS installer (.dmg / .zip)
npm run build:win      # Windows installer (.exe)
npm run build:linux    # Linux packages (AppImage / .deb)
npm run package        # All platforms
```

### Icons

After updating `herma.png`, regenerate platform icons:

```bash
npm run icons
```

## Project structure

```
src/
  main/           Electron main process, IPC, spreadsheet engine
  preload/        Secure bridge to the renderer
  renderer/       React UI
  shared/         Types, schemas, validation
```

## License

See repository license file for details.
