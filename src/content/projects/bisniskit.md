---
title: Jenius Bisniskit
company: Jenius / PT Bank SMBC Indonesia
role: Backend Tech Lead
released: "2025"
summary: A merchant app for QRIS payments, fund disbursement, and outlet and cashier management, designed for use at the point of sale.
image: /work/bisniskit.webp
imageAlt: Jenius Bisniskit landing page for the merchant QRIS payment app
reference: https://www.jenius.com/bisniskit
referenceLabel: Public product reference
playStore:
  name: Jenius Bisniskit
  url: https://play.google.com/store/apps/details?id=com.btpn.db
order: 2
---

## Problem

Merchants accept payments on a phone at the counter, not at a desk. According to public Jenius material, they need to display a QR code, confirm that a payment has arrived, give staff and outlets the right level of access, and withdraw funds when they need to restock. A process that requires a laptop or a branch visit does not work at the point of sale.

## Approach

Bisniskit is the merchant app that supports this workflow. Its public features include static and dynamic QRIS, a linked Jenius Bisnis account for disbursements, audio payment notifications so cashiers do not need to watch the screen, and in-app outlet and cashier management with limited employee access.

## Key trade-offs

- **Speed at the counter over feature depth.** Audio notifications let cashiers confirm payments without stopping to check the screen.
- **Clear ownership of money movement.** Incoming customer payments and outgoing disbursements are separate flows with different failure modes, and both must reconcile.
- **Access control as a core feature.** Letting a cashier accept payments without seeing the whole business is an authorization design problem, not a simple setting.
- **Self-service growth.** Merchants can add outlets in the app without visiting a branch.

## Role

Backend Tech Lead responsible for delivery and release coordination across the merchant backend, which serves about 2,000 active merchant businesses on QRIS.

## Public outcome

Jenius publicly describes Bisniskit as its merchant app for QRIS payments, flexible disbursement, outlet and cashier management, and audio payment notifications.

## Reference

All product facts above come from the [public Jenius Bisniskit page](https://www.jenius.com/bisniskit). The app is available on [Google Play](https://play.google.com/store/apps/details?id=com.btpn.db).
