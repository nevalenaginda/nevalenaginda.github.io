---
title: Jenius Bisniskit
company: Jenius / PT Bank SMBC Indonesia
role: Backend Tech Lead
released: "2025"
summary: Merchant-side tooling for QRIS acceptance, disbursement, and outlet or cashier access — built for use at a counter, not at a desk.
reference: https://www.jenius.com/bisniskit
referenceLabel: Public product reference
order: 2
---

## Problem

A merchant taking payments on a phone is not sitting at a desk. Public Jenius material describes the operating reality: a business needs to show a QR code, confirm that money arrived, pay staff and branches access, and get funds back out when stock needs buying. Anything that requires a laptop, or a trip to a branch, breaks at the point of sale.

## Approach

Bisniskit is the merchant-facing app for that loop. Publicly documented capabilities include static and dynamic QRIS acceptance, linking to a Jenius Bisnis account so funds can be disbursed, an audible payment confirmation so the operator does not have to watch the screen, and outlet and cashier management that can be driven from the app with limited employee access.

## Trade-offs worth naming

- **Counter speed beats feature depth.** An audible confirmation exists because verifying payment visually costs the operator a transaction's worth of attention.
- **Money movement needs a clear owner.** Funds arriving from a customer and funds leaving to the merchant's account are different flows with different failure modes, and both have to reconcile.
- **Access is the feature, not a setting.** Allowing a cashier to take payments without allowing them to see the whole business is an authorization design problem, not a checkbox.
- **Branch growth should not require a branch visit.** Adding an outlet through the app sounds small until you consider who benefits: the owner, not the bank.

## Role

Backend Tech Lead for delivery and release coordination across the merchant backend scope.

## Public outcome

Jenius publicly documents Bisniskit as the merchant app for QRIS payment acceptance, flexible disbursement, outlet and cashier management, and audio payment notifications.

## Reference

[Read the public Jenius Bisniskit page](https://www.jenius.com/bisniskit) — the source for every product fact above.
