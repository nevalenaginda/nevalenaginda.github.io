---
title: Pay on Schedule
company: Jenius / PT Bank SMBC Indonesia
role: Backend Tech Lead
released: August 2026
summary: Recurring bill and virtual-account payments with a choice between automatic payment and a timely manual reminder.
image: /work/pay-on-schedule.webp
imageAlt: Jenius product page for Pay on Schedule, showing the automatic payment and reminder options
reference: https://www.jenius.com/article/detail/pay-on-schedule
referenceLabel: Public product reference
order: 1
---

## Problem

Paying the same bills every month means tracking a separate due date for each one. Public Jenius material frames the cost plainly: miss a date and a late fee follows, and the work of remembering never really stops. Users also do not all want the same thing — some want the money to move on its own, others want to stay in control and just be told in time.

## Approach

The public product gives users two explicit paths when scheduling a bill: automatic payment on a chosen date, or a manual reminder at H-1 so the user pays themselves. Scheduled payments appear grouped by when they are due, so the next obligation is visible instead of buried in a list. Categories span the existing bill and VA surface, from utilities and credit cards to phone, transport, and government services.

## Trade-offs worth naming

- **Automatic and manual are different products, not a toggle.** Automatic payment has to be correct without a human watching; manual payment needs to arrive early enough to be useful but not so early that it is forgotten again.
- **Notifications are a contract.** The reminder only works if it lands before the user's own deadline, which makes timing and delivery reliability part of the feature rather than a nice-to-have.
- **Payment actions have to be safe to repeat.** Retries happen in real payment systems. A payment instruction that can be applied twice is worse than one that fails loudly.
- **Scheduling changes state without the user present.** Scheduled, paid, and skipped states all have to be inspectable afterwards, which is an audit question before it is a UI question.

## Role

Backend Tech Lead for delivery and release coordination. I owned backend scope, review, and release readiness on a backend currently serving roughly 500,000 active users at p99 latency under 500 ms and an unexpected error rate under 2.5%.

## Public outcome

Jenius publicly documents Pay on Schedule as available for scheduled bill and VA payments with automatic payment or an H-1 reminder, and shows upcoming scheduled payments inside a 30-day window.

## Reference

[Read the public Jenius product reference](https://www.jenius.com/article/detail/pay-on-schedule) — the source for every product fact above.
