# 🌱 ESG Advisor Chatbot

A React-based decision support tool for evaluating ESG initiatives through a structured 4-gate screening process.

## What It Does

Guides organizations through evaluating sustainability initiatives (solar PV, energy efficiency, etc.) from initial screening to final verification.

### The 4 Gates

| Gate | Purpose | Outcome |
|------|---------|---------|
| **Gate 0** | Strategic Screening — 5 criteria evaluation | ADOPT / RE-TEST / REJECT |
| **Gate 1** | Business Case — NPV, payback, IRR analysis | ADOPT / RE-TEST / REJECT |
| **Gate 2** | Commercial Lock-In — Secure 4 enablers | All Locked / Pending |
| **Gate 3** | Delivery & M&V — 5-phase execution tracking | Complete / In Progress |

## Features

- ✅ Dynamic questionnaires based on user role and project type
- ✅ Real-time scoring with visual pass/fail indicators
- ✅ Financial calculations (NPV, payback, IRR)
- ✅ IPMVP-aligned M&V route selection
- ✅ PDF report generation
- ✅ Re-test workflows for addressing gaps

## Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm start
```

## Usage

1. Enter your initiative (e.g., "Install 200kWp solar PV system")
2. Click "Start Strategic Screening"
3. Complete each gate's questionnaire
4. Download your PDF report from Final Summary

## Tech Stack

- React 18
- Single-component architecture
- No external dependencies (except React)

## License

MIT

---

Built for a sustainable future 🌍
