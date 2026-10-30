---
title: Pay on Schedule
company: Jenius / PT Bank SMBC Indonesia
role: Backend Tech Lead
released: August 2026
summary: Scheduled bill and virtual-account payments, with a choice between automatic payment and a reminder one day before the due date.
image: /work/pay-on-schedule.webp
imageAlt: Jenius product page for Pay on Schedule, showing the automatic payment and reminder options
reference: https://www.jenius.com/article/detail/pay-on-schedule
referenceLabel: Public product reference
playStore:
  name: Jenius
  url: https://play.google.com/store/apps/details?id=com.btpn.dc
order: 1
---

## Problem

Paying recurring bills means keeping track of a different due date for each one. As public Jenius material notes, a missed date leads to a late fee. Users also have different preferences: some want payments to run automatically, while others want to stay in control and receive a timely reminder.

## Approach

When scheduling a bill, users choose between automatic payment on a selected date or a reminder one day before (H-1) so they can pay manually. Scheduled payments are grouped by due date, so the next payment is easy to see. Supported categories cover the existing bill and virtual-account options, including utilities, credit cards, phone, transport, and government services.

## Key trade-offs

- **Automatic and manual payments are separate flows.** Automatic payment must be correct without user involvement, while reminders must arrive early enough to be useful.
- **Reminder timing is part of the feature.** A reminder only helps if it arrives before the due date, so delivery timing and reliability are core requirements.
- **Payments must be idempotent.** Retries are normal in payment systems, and a payment instruction must never be applied twice.
- **Scheduled actions must be auditable.** Payments run without the user present, so scheduled, paid, and skipped states must all be traceable afterwards.

## Role

Backend Tech Lead responsible for delivery and release coordination. I owned backend scope, review, and release readiness on a backend serving roughly 500,000 active Jenius users at p99 latency under 500 ms and an unexpected error rate under 2.5%.

## Public outcome

Jenius publicly documents Pay on Schedule for bill and virtual-account payments, with automatic payment or an H-1 reminder, and shows upcoming scheduled payments within a 30-day window.

## Reference

All product facts above come from the [public Jenius product page](https://www.jenius.com/article/detail/pay-on-schedule). The Jenius app is available on [Google Play](https://play.google.com/store/apps/details?id=com.btpn.dc).
