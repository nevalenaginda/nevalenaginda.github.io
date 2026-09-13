---
title: Face Recognition for Registration and Device Unlink
company: Jenius / PT Bank SMBC Indonesia
role: Backend Developer
released: "2023"
summary: Face-based verification that shortens new-account activation and lets a user move their account to a new phone without calling support.
image: /work/face-recognition.webp
imageAlt: Jenius article page about face recognition for registration and device unlink
reference: https://www.jenius.com/article/detail/pengenalan-wajah-untuk-registrasi-dan-unlink-device
referenceLabel: Public product reference
order: 3
---

## Problem

Two moments in a banking app are expensive by default. A new user proving their identity, which historically meant a video call with a crew member or a visit to a branch. And an existing user switching phones, which meant calling support to unlink the old device. Both are correct-by-default in the security sense and frustrating in the human sense.

## Approach

Public Jenius material describes face recognition as authenticating the profile rather than the device: a face is captured and compared against the stored photo or the ID photo held by Dukcapil, layered with password and OTP. Applied to registration, it replaces the extra verification step for new users. Applied to device unlink, it lets a verified user remove the old device from the app instead of through support.

## Trade-offs worth naming

- **Verification quality is a security boundary, not a UX metric.** A threshold that is generous to the user is generous to whoever is holding the phone.
- **Registration and device recovery are the same problem twice.** Both answer "is this the account holder", but they fail differently — a false reject at registration costs a signup, a false accept at unlink costs an account.
- **Fallbacks have to exist and be boring.** Cameras fail, lighting is bad, and networks drop. The non-face path is part of the design, not an error case.
- **The data question arrives with the feature.** A stored face template changes the privacy and retention surface of the product, so it has to be a deliberate decision before it is a technical one.

## Role

Backend Developer on the verification and device-lifecycle flow.

## Public outcome

Jenius publicly documents face recognition as available for faster new-account activation and for self-service device unlink, with an entry requirement that the face is registered first and protections including password and OTP.

## Reference

[Read the public Jenius article](https://www.jenius.com/article/detail/pengenalan-wajah-untuk-registrasi-dan-unlink-device) — the source for every product fact above.
