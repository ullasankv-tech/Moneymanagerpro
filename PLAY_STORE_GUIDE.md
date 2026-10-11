# Money Manager Pro — Play Store launch guide

## A. What is already prepared (files in this folder)
| File | Where it goes |
|---|---|
| `index.html` | repo root (replace) — billing, no fake ads, delete-account, accurate privacy text, Android 16 layout fix |
| `main.yml`, `release-aab.yml` | `.github/workflows/` (replace both) — now Capacitor 8 / API 36 / Play Billing |
| `privacy-policy.html`, `delete-account.html` | repo root → live at `https://ullasankv-tech.github.io/Moneymanagerpro/privacy-policy.html` and `.../delete-account.html` |
| `play-feature-graphic-1024x500.png` | Play Console → Store listing → Feature graphic |

## B. Build order
1. Commit the files above. Run **Actions → Build Signed Release AAB**. Read the log: the step "Check Play Billing library version" must print 8.x or higher, and "Check Play requirements" must show targetSdkVersion 36.
2. If `npm install` fails on a plugin version, tell me the exact error line and I'll pin another version.
3. Download `MoneyManagerPro-release.aab`.

## C. Play Console (in this order)
1. **Create app**: name "Money Manager Pro", App, Free, Category **Finance**.
2. **Play App Signing**: accept. Your `MoneyManagerPro.jks` becomes the *upload* key. Keep a safe backup of the jks + passwords.
3. **Internal testing** → upload the AAB → add yourself as tester → install from the Play link.
4. **In-app product** (only possible after an AAB with billing is uploaded): Monetize → Products → In-app products → ID **`remove_ads`** (exact), type one-time, name "Premium", price ₹199 → **Activate**.
5. **License testers**: Settings → License testing → add your Gmail. Buy Premium on the internal build (no real charge), then: kill the app, reopen → still Premium; uninstall/reinstall → **Restore purchases** works.
6. **Order management**: confirm the test order shows as *acknowledged*. Unacknowledged purchases are auto-refunded after 3 days.
7. **App content** (all required):
   - Privacy policy URL: the privacy-policy.html link above
   - Account deletion URL: the delete-account.html link above (and say the app has an in-app option)
   - Ads: **No, my app does not contain ads**
   - App access: "No login credentials needed — users register inside the app with any name/email/phone."
   - Target audience: **18 and over**
   - Content rating (IARC): finance/utility; no violence, sexual content, gambling, user-to-user chat
   - Financial features: **Personal finance / budgeting & expense tracking**. Not a loan app, not a trading platform (Investments tab is record-keeping only).
   - Exact alarms declaration: "User-set daily, bill and EMI reminders must fire at the time the user chose, even when the app is closed."
   - Health / news / government: none
8. **Data safety form** (answer honestly):
   | Data | Collected? | Shared? | Why | Optional? |
   |---|---|---|---|---|
   | Name, email, phone, city, user ID | Yes | No | App functionality, analytics | No (registration) |
   | Financial info (entries) | Yes, only if user uses Cloud Backup | No | App functionality | Yes |
   | Purchase history | Via Google Play | No | App functionality | Yes |
   | Photos, audio | No (processed on device only) | — | — | — |
   - Encrypted in transit: **Yes** (HTTPS). User can request deletion: **Yes**.
9. **Store listing**
   - Short description (80): `Track spending, bills & EMIs with reminders. Investments, bill scan, voice typing.`
   - Full description: start with what it does (income/expense tracking, budgets, goals, bill & EMI reminders that ring even when the app is closed, investment & trading journal, bill photo scan, voice typing, fingerprint lock, backups), then a line that Premium is a one-time optional purchase. Do not claim anything the app doesn't do.
   - Assets: 512×512 icon, the feature graphic above, **at least 2 phone screenshots** (take them from your phone).
   - Contact email: add your own support email (required).

## D. Closed testing gate (if your developer account is a new personal account)
- Need **12 testers opted in for 14 continuous days**, then apply for production access. Plan about 3 weeks.
- Create a Closed testing track, add testers by Gmail, share the opt-in link, tell them to stay opted in and open the app now and then.

## E. Before you press "Publish" — test on a real phone (installed from Play, not sideloaded)
- Layout looks right at the top (status bar) and bottom (nav bar) on Android 14/15/16
- Register, log in, add transaction, fingerprint unlock
- Daily Reminder, a Bill alarm, EMI undo; voice typing mic; Bill scan (camera + gallery)
- Premium purchase, restore after reinstall
- Settings → Delete My Account & Data (use a throw-away account!)

## F. Known risks to decide on
1. **Firebase security**: the app reads/writes `users/` and `backups/` without sign-in. Check your Firebase Realtime Database *Rules* — do not leave them open (`".read": true`). Cloud backup contains financial data. Safest: add Firebase Authentication, or remove cloud backup from the store build.
2. **Premium only removes ads, and ads are now switched off** (placeholder ads are not allowed). The Premium offer is honestly worded as a supporter upgrade. Better: put real features behind `isPremium()` (for example Bill Scan or Trading analytics) before launch, or add real AdMob ads and set `MM_ADS_ENABLED=true`.
3. **Voice typing plugin**: Capacitor 8 builds use `@capacitor-community/speech-recognition@^7`. If the mic stops working after the upgrade, tell me — I'll switch to the Capgo version.
4. **Bill scan** downloads its reading engine from a public CDN on first use (needs internet once).
5. Android 15/16 forces edge-to-edge. I added the safe-area fix, but check every screen on a real phone.
