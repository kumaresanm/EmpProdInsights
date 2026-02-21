# Employee Production Output

Track employee production, actual vs target, and shortage. Runs on **Windows** and **Mac** in the browser (or as a desktop app later).

## What you need

- **Node.js** (v18 or v20 recommended) — [nodejs.org](https://nodejs.org)
- A terminal (Command Prompt or PowerShell on Windows; Terminal on Mac)

## Run the app

### 1. Start the backend (API)

Open a terminal in the project folder:

```bash
cd backend
npm install
npm start
```

You should see: `Production API running at http://localhost:3001`. Leave this terminal open.

### 2. Start the frontend (Angular)

Open a **second** terminal in the project folder:

```bash
cd frontend
npm install
npm start
```

Wait until it says something like **"Application bundle generation complete"** and opens the browser, or open:

**http://localhost:4200**

### 3. Use the app

- **Dashboard** — Today’s production summary and shortage by employee.
- **Entries** — List, filter (date, employee, shift, machine), add, edit, delete production entries.
- **Import Excel** — Upload an `.xlsx` file with columns like Date, Name, Shift, Machine, Prg. No., Cycle time Sec, PDN HR (hours worked), PDN Req, Producted Qty, Notes.

Formulas used:

- **Actual hours** = Hours worked × 11/12 (1 hour break per 12-hour day).
- **Actual PDN** = (3600 ÷ Cycle time sec) × Actual hours.
- **Short** = PDN Req − Producted Qty (when both are entered).

## Data storage

- Backend stores data in **`backend/data.json`**. No database setup required. You can copy this folder to another Windows or Mac machine and run the same steps.

## Run on another Windows / Mac machine

1. Copy the whole **EmployeeProductionOutput** folder to that machine.
2. Install Node.js if needed.
3. In the project folder run:
   - Terminal 1: `cd backend && npm install && npm start`
   - Terminal 2: `cd frontend && npm install && npm start`
4. On that machine, open **http://localhost:4200** in the browser.

## Desktop app and cloud later

- **Desktop:** You can later wrap this in **Electron** (or similar) to get a single `.exe` on Windows or an app on Mac. The same backend + frontend will work.
- **Cloud:** For deployment, build the frontend (`cd frontend && npm run build`), serve the `frontend/dist/frontend/browser` folder and the API from a Node host (e.g. Heroku, Railway, or a VPS). Database can be switched to PostgreSQL or keep using the JSON file for small setups.

## Project layout

```
EmployeeProductionOutput/
├── backend/          # Node.js API (Express, data in data.json)
├── frontend/         # Angular app
├── APP_PLAN.md       # Feature plan and future modules
├── exc to app.xlsx   # Your sample Excel
└── README.md         # This file
```
