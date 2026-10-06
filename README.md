# Mobileum RenewIQ Platform - Enterprise Renewals Dashboard

Mobileum RenewIQ is an executive-grade renewals management and revenue intelligence platform built for tracking, analyzing, and forecasting enterprise telecom contract renewals.

---

## 🚀 Quick Start Guide

Follow these steps to run Mobileum RenewIQ on any machine.

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/Mobileum/RenewIQ.git
cd Renewal_Website

# Install all npm dependencies
npm install
```

### 3. Environment Setup
Copy the environment variables template file to create `.env`:

```bash
# Copy template to .env
cp .env.example .env
```

Note: All API keys in `.env.example` contain non-sensitive placeholder values. The platform automatically functions in offline/demo mode if external services (Supabase, OpenAI) are unconfigured.

### 4. Running Locally
Start the Vite local development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### 5. Production Build
To verify type safety and generate a production bundle:

```bash
npm run build
```

To preview the built production site:

```bash
npm run preview
```

---

## 🌟 Key Features & Dashboard Modules

1. **Overview Tab**: Executive narrative summary, KPI cards (Total ACV, Closed, Commit, Best Case, Pipeline), interactive category movement table, and quick link cards.
2. **Expiry Heatmap Tab**: Visual matrix of service expiry quarters (Q1 2026 - Q4 2026 and 2027) with today vs. yesterday deltas and slippage insights.
3. **Business Units Tab**: Sorted BU bar chart, BU card selection, opportunity drilldown table, and approval status filters.
4. **Approval Funnel Tab**: Visual funnel & matrix for approval statuses, approval vs. category matrix, and movement analysis toggle.
5. **Data & Reconciliation Tab**: Detailed data validation tables, Q4 FY26 vs 2027 breakdown, and Reconciliation Block with single-click Excel export.
6. **Daily Data Ingestion Flow**: Integrated Date Picker and File Upload modal to upload daily Excel/CSV data files, validate required columns (`Opportunity ID`, `ACV Amount`, `Forecast Category`), preserve yesterday's baseline snapshot, and auto-refresh all dashboard tabs.
7. **Docked AI Assistant**: Natural language querying with read-only database tools, chart rendering, trace logging, and interactive filters.

---

## 🛠 Tech Stack
- **Frontend Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS & Lucide Icons
- **Data Parsing & Export**: SheetJS (`xlsx`)
- **Charts & Visualizations**: Recharts
- **Database & Storage**: Browser LocalStorage engine with in-memory fallback snapshot store (`database.ts`)

---

## 📁 Repository Structure
```
src/
├── components/
│   ├── assistant/          # AI Assistant panel & message history
│   ├── dashboard/          # Specialized charts, tables, & Daily Ingestion modal
│   ├── layout/             # App shell, sidebar navigation, header
│   └── ui/                 # Reusable UI components (DataTable, Modal, Drawer, Badges)
├── lib/
│   ├── database.ts         # In-memory storage & snapshot engine
│   ├── excelExporter.ts    # Excel exporter for Reconciliation Block
│   ├── excelParser.ts      # Excel/CSV parser logic
│   ├── ingestService.ts    # Daily file validator & ingestion pipeline
│   ├── seedScript.ts       # Starter baseline datasets (2026-10-06 & 2026-10-05)
│   └── sharedDataLayer.ts  # Shared dataset calculation & refresh listeners
└── pages/                  # Tab views (Overview, Expiry, BusinessUnits, Approvals, RenewalsSummaryDashboard, etc.)
```

---

## 📝 License & Contact
Confidential & Proprietary to Mobileum Inc. All Rights Reserved.
