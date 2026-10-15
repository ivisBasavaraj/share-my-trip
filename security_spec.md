# Smart Ride Sharing Platform — Security Specification & TDD Matrix

## 1. Data Invariants
1. **User Identity & Verification**: A user can only write to `/users/{userId}` where `request.auth.uid == userId`. Verification status cannot be elevated to "verified" arbitrarily without verified email/admin token.
2. **Trip Ownership & Membership Gate**: A user can create a Trip only if `request.auth.uid == incoming().ownerId` and `request.auth.uid in incoming().memberIds`.
3. **Itinerary Integrity**: Only active members of `/trips/{tripId}` can create, read, update, or delete waypoints in `/trips/{tripId}/itinerary/{itemId}`.
4. **Expense Accountability**: Only trip members can log expenses; an expense's `paidBy` must match the authenticated member or existing trip member.
5. **Memory Uploads**: Only trip members can upload memories to `/trips/{tripId}/memories/{memoryId}`.
6. **E2EE Chat Confidentiality**: Only current members of the trip can read or post encrypted messages to `/trips/{tripId}/messages/{messageId}`.
7. **Companion Matching**: Requests can only be created by authenticated travelers, and can only be updated/accepted by the trip owner or cancelled by the requester.

## 2. The "Dirty Dozen" Attack Payloads
1. **Payload 1 (Impersonate Owner)**: Non-authenticated or mismatched UID attempting to create a trip under `ownerId: "victim123"`. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Ghost Field Injection)**: Creating a trip with rogue key `{"isAdminTrip": true, "hack": 1}`. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Oversized Payload / Denial of Wallet)**: Submitting a title with 10,000 characters. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Unauthenticated Read of Private Notes)**: Anonymous user reading `/trips/{tripId}/messages/{msgId}` without membership. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Non-Member Itinerary Tampering)**: User B (not in `memberIds`) updating waypoints in Trip A. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Self-Elevation of Traveler Verification)**: Unverified user mutating `verificationStatus: "verified"`. Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Path Variable Poisoning)**: Accessing path with junk unicode `../..%00`. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Orphan Itinerary Item)**: Creating an itinerary item referencing a non-existent `tripId`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Expense Payer Forgery)**: Claiming another user paid an expense (`paidBy: "other"`) while authenticated as someone else. Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Terminal State Bypass)**: Reopening a trip when marked `completed`. Expected: `PERMISSION_DENIED`.
11. **Payload 11 (E2EE Chat Spoofing)**: Submitting an encrypted message with `senderId != request.auth.uid`. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Companion Request Hijack)**: Third party updating companion request status from "pending" to "accepted". Expected: `PERMISSION_DENIED`.
