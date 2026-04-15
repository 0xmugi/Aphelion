<div align="center">

# Pacifica — Margin Intelligence Dashboard

**Real-time perpetual futures portfolio management with orbital visualization, smart margin optimization, and one-click execution.**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-Wallet_Adapter-9945FF?style=flat-square&logo=solana&logoColor=white)

</div>

---

## Overview

Pacifica reimagines how traders interact with leveraged positions. Built on top of **Pacifica's official REST API and WebSocket protocol** (`wss://ws.pacifica.fi/ws`), the dashboard pulls live account data, market prices, orderbook depth, and funding rates directly from Pacifica's infrastructure — no third-party data providers, no delays.

Each open position orbits a central equity core — its distance, size, and color encoding leverage, margin utilization, and PnL at a glance. This isn't just a dashboard; it's a **spatial interface for risk**.

---

## Features

### 🌐 Orbital Portfolio View
Positions rendered as orbiting nodes around your equity center. Size = notional value, distance = leverage, color = PnL direction. Click any node to drill into position details.

### ⚡ One-Click Trade Execution
Market and limit orders with built-in leverage slider (1x–50x), Take Profit / Stop Loss inputs, and USD/token quantity toggle. Execute directly from the dashboard.

### 📊 Multi-View Analytics
Switch between five visualization modes:

| View | Description |
|------|-------------|
| **Orbit** | Spatial portfolio overview |
| **Timeline** | Equity curve over time |
| **Funding** | Funding rate heatmap across symbols |
| **Depth** | Live orderbook depth chart |
| **PnL** | Breakdown by position with win rate analysis |

### 🔔 Intelligent Alerts
Auto-generated risk alerts for high leverage, margin utilization thresholds, and funding rate anomalies. Actionable alerts with one-click position adjustments.

### 📋 Order Management
View open orders with cancel functionality. Full order history with timestamps, execution prices, and status tracking.

### 🔗 Wallet Integration
Connect any Solana wallet (Phantom, Solflare, etc.) to pull live positions from supported DEXs. Works in demo mode without a wallet.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling | Tailwind CSS v3, custom design system |
| Data | Pacifica REST API + WebSocket (`wss://ws.pacifica.fi/ws`), 30s heartbeat |
| Wallet | Solana Wallet Adapter |
| Charts | Recharts, custom SVG visualizations |
| State | React hooks, TanStack Query |

---

## Architecture

- **Design System** — HSL-based semantic tokens (`energy-green`, `risk-red`, `idle-amber`) with dark-first palette. Custom `font-grotesk` and `font-mono-system` typography.
- **Real-time Data Pipeline** — Direct WebSocket connection to `wss://ws.pacifica.fi/ws` with subscribe/unsubscribe flow, 30-second heartbeat, automatic reconnection, and graceful fallback to Pacifica REST API.
- **Mock Data Layer** — Full demo mode with realistic simulated positions, prices, and alerts for development and showcasing.
- **Modular Components** — Each widget (`OrbitalField`, `EquityCurve`, `FundingHeatmap`, `OrderbookDepth`, etc.) is self-contained and reusable.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Demo Mode

> **No wallet required.** Pacifica runs in full demo mode with simulated positions, live-updating prices, and mock alerts. Connect a Solana wallet to switch to live data.

---

<div align="center">

Developed by 0xmugi

</div>
