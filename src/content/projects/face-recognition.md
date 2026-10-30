---
title: Face Recognition for Registration and Device Unlink
company: Jenius / PT Bank SMBC Indonesia
role: Backend Developer
released: "2023"
summary: Face verification that speeds up new-account activation and lets users move their account to a new phone without contacting support.
image: /work/face-recognition.webp
imageAlt: Jenius article page about face recognition for registration and device unlink
reference: https://www.jenius.com/article/detail/pengenalan-wajah-untuk-registrasi-dan-unlink-device
referenceLabel: Public product reference
stores:
  - store: Google Play
    url: https://play.google.com/store/apps/details?id=com.btpn.dc
  - store: App Store
    url: https://apps.apple.com/id/app/jenius/id1079340119
order: 3
---

## Problem

Two steps in a banking app used to require extra effort from users. New users had to verify their identity through a video call or a branch visit. Existing users who changed phones had to contact support to unlink the old device. Both steps were secure, but slow and inconvenient.

## Approach

According to public Jenius material, face recognition verifies the user profile rather than the device. The captured face is compared with the stored photo or the ID photo held by Dukcapil, and the check is combined with password and OTP. During registration it replaces the extra verification step. For device unlink, it lets verified users remove an old device in the app instead of through support.

## Key trade-offs

- **Verification thresholds are a security decision.** A threshold that is lenient to the user is also lenient to anyone else holding the phone.
- **Registration and recovery fail differently.** Both confirm the account holder, but a false rejection at registration loses a signup, while a false acceptance at unlink can expose an account.
- **Fallbacks are part of the design.** Cameras fail, lighting is poor, and connections drop, so the non-face path must work reliably.
- **Biometric data needs a clear policy.** Storing face data changes the product's privacy and retention requirements, so those decisions come before implementation.

## Role

Backend Developer on the verification and device lifecycle flow.

## Public outcome

Jenius publicly documents face recognition for faster account activation and self-service device unlink. Users must register their face first, and the flow is protected by password and OTP.

## Reference

All product facts above come from the [public Jenius article](https://www.jenius.com/article/detail/pengenalan-wajah-untuk-registrasi-dan-unlink-device). The Jenius app is available on [Google Play](https://play.google.com/store/apps/details?id=com.btpn.dc) and the [App Store](https://apps.apple.com/id/app/jenius/id1079340119).
