---
title: "Switch to Bitwarden Tonight: Export, Import, and Delete Your Old Passwords in 90 Minutes"
description: "Step-by-step guide to choosing Bitwarden, exporting from LastPass or 1Password, importing cleanly, and retiring your old vault in one evening."
pubDate: "2026-04-03T10:09:31.498Z"
category: "Software"
image:
  url: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&auto=format&fit=crop"
  alt: "Laptop on a desk with a padlock icon on screen representing password security"
  license: "Unsplash License (free for commercial use, no attribution required)"
  source: "https://unsplash.com/photos/a-laptop-computer-sitting-on-top-of-a-wooden-desk-OqtafYT5kTw"
tags:
  - "password manager"
  - "Bitwarden"
  - "password security"
  - "LastPass migration"
  - "data privacy"
faq:
  - question: "Is it safe to export my passwords from LastPass or 1Password?"
    answer: "Yes, as long as you do it on a trusted private network, delete the exported CSV file immediately after importing, and never store it in cloud storage or email it to yourself."
  - question: "Will Bitwarden's free tier cover everything I need?"
    answer: "For most individuals, yes. The free tier supports unlimited passwords across unlimited devices, secure notes, and basic two-factor authentication. Paid plans add advanced 2FA options and encrypted file attachments."
  - question: "What should I do with my old password manager account after migrating?"
    answer: "After confirming all entries imported correctly, revoke any trusted devices in the old app, cancel your subscription, and permanently delete the account through its settings to remove your data from their servers."
  - question: "How do I handle passwords that didn't import correctly?"
    answer: "Check Bitwarden's import report for errors, then manually re-enter any missing items. Common issues include special characters in CSV fields or entries with attachments, which must be migrated separately."
  - question: "Should I change all my passwords after switching managers?"
    answer: "Not necessarily all at once, but prioritise changing passwords for critical accounts like email, banking, and work tools within the first week as a good security hygiene practice post-migration."
howToSteps:
  - "Create your free Bitwarden account, set a strong master password, and enable two-factor authentication before touching your old vault."
  - "In your current password manager, navigate to Settings and export your vault as a CSV or JSON file, saving it temporarily to your desktop."
  - "Log in to Bitwarden Web Vault, go to Tools > Import Data, select your old manager as the format, upload the file, and verify the entry count matches."
  - "Confirm all logins, secure notes, and identities transferred correctly, then permanently delete the exported file and cancel or delete your old password manager account."
draft: false
---
# Switch to Bitwarden Tonight: Export, Import, and Delete Your Old Passwords in 90 Minutes

If you have been putting off switching password managers because it sounds like a weekend project, you are not alone. The mental image of manually re-entering hundreds of logins is enough to make anyone delay indefinitely. The good news is that modern password managers handle the heavy lifting through structured export and import files, and the whole migration can realistically be done in a single evening — often in under 90 minutes.

This guide walks you through the entire process: why Bitwarden is a strong choice for most people, how to safely export your existing vault from LastPass or 1Password, how to import cleanly into Bitwarden, and how to verify everything worked before you delete your old account. No technical background is required, just a little patience and a free hour or two.

---

## Quick Answer

- **Bitwarden is free, open-source, and cross-platform** — a strong replacement for LastPass or 1Password for most users.
- **Export your old vault** as a CSV or JSON file, then **import it directly into Bitwarden** using the built-in import tool.
- The whole migration — export, import, verify, and cleanup — takes **60 to 90 minutes** for a typical vault of 100–300 items.
- **Never leave an unencrypted export file on your computer** after the import is confirmed; delete it immediately.
- After migrating, **change your master password** on Bitwarden and enable **two-factor authentication** before retiring your old vault.

---

## Why Bitwarden Is Worth Switching To

Before diving into the steps, it helps to understand why Bitwarden has become the go-to recommendation for security-conscious users who want to leave LastPass or reduce their 1Password subscription cost.

### Open Source and Audited

Bitwarden's source code is publicly available and has undergone independent security audits. This transparency means security researchers can verify the claims the company makes about how your data is stored and encrypted. Closed-source alternatives ask you to trust their word alone.

### Pricing Comparison

| Feature | Bitwarden Free | Bitwarden Premium ($10/yr) | LastPass Free | 1Password Individual ($36/yr) |
|---|---|---|---|---|
| Unlimited passwords | ✅ | ✅ | ✅ (1 device type) | ✅ |
| Sync across devices | ✅ | ✅ | ❌ (limited) | ✅ |
| Two-factor authentication | ✅ | ✅ | ✅ (basic) | ✅ |
| TOTP authenticator built-in | ❌ | ✅ | ❌ | ✅ |
| Emergency access | ❌ | ✅ | ❌ | ✅ |
| Self-hosting option | ✅ | ✅ | ❌ | ❌ |
| Annual cost | $0 | $10 | $0–$36 | $36 |

For most individuals, Bitwarden Free covers everything they need. The $10/year Premium tier adds TOTP generation and encrypted file attachments, which is still dramatically cheaper than competitors.

### Cross-Platform Without Compromise

Bitwarden has native apps for Windows, macOS, Linux, iOS, and Android, plus browser extensions for Chrome, Firefox, Safari, Edge, and Brave. Everything syncs through Bitwarden's servers (end-to-end encrypted) or your own self-hosted instance if you prefer.

---

## What You Need Before You Start

Gather these things before you begin so you are not hunting for them mid-migration:

- **Your old password manager credentials** (master password and any two-factor codes)
- **A Bitwarden account** — create one free at bitwarden.com
- **Bitwarden browser extension installed** on your primary browser
- **15–20 minutes of uninterrupted time** for the export/import steps
- **A secure, temporary folder** on your desktop for the export file (you will delete this within the hour)

---

## Step 1: Export From LastPass

### Using the LastPass Web Vault

1. Log in to your LastPass vault at lastpass.com.
2. Click your email address in the top-right corner and select **Account Options**.
3. Navigate to **Advanced** → **Export**.
4. Enter your master password when prompted.
5. LastPass will either open a new tab with plain-text CSV data or download a `.csv` file directly, depending on your browser.
6. If it opens as a tab, select all the text, paste it into a plain text editor (Notepad on Windows, TextEdit in plain-text mode on Mac), and save it as `lastpass_export.csv`.

### Important Warning

The exported file is **completely unencrypted**. Every username, password, and URL is readable as plain text. Keep this file only as long as it takes to complete the import — ideally less than 30 minutes.

---

## Step 2: Export From 1Password

### Using 1Password 7 or 1Password 8 (Desktop App)

1. Open the 1Password desktop app and unlock your vault.
2. Go to **File** → **Export** → **All Items** (or select a specific vault if you have multiple).
3. Choose **1Password Interchange Format (.1pif)** for 1Password 7, or **CSV** for 1Password 8.
4. Select a save location and confirm with your master password.

### A Note on 1PIF vs. CSV

Bitwarden's import tool supports the 1PIF format natively, which preserves more metadata (notes, custom fields, card details) than a plain CSV export. If you are on 1Password 7, prefer the 1PIF option. If you are on 1Password 8 and only have CSV available, most login items will import correctly; custom fields may need manual cleanup afterward.

---

## Step 3: Import Into Bitwarden

### Using the Bitwarden Web Vault

1. Log in at vault.bitwarden.com.
2. Click **Tools** in the top navigation bar.
3. Select **Import Data**.
4. In the **Select the format of the import file** dropdown, choose:
   - `LastPass (csv)` for LastPass exports
   - `1Password (1pif)` or `1Password (csv)` for 1Password exports
5. Click **Choose File** and select your export file.
6. Click **Import Data**.

Bitwarden will process the file and display a success message with the number of items imported. A vault of 200 items typically imports in under 10 seconds.

### What Gets Imported

- Login credentials (username, password, URL)
- Secure notes
- Credit card details
- Identity records
- Folder/collection structure (from most formats)

### What May Not Import Perfectly

- File attachments (these need to be re-uploaded manually)
- TOTP seeds stored in 1Password (these need to be re-added manually or scanned from the original QR codes)
- Highly customized item templates

---

## Step 4: Verify Your Import

Do not delete your old vault or export file until you have confirmed the import is complete and accurate.

### Verification Checklist

- **Count the items.** Compare the total item count in Bitwarden against your old vault. They should be close (within a few items, since some formats handle duplicates differently).
- **Test 10 random logins.** Open Bitwarden, find 10 sites you use regularly, and confirm the credentials are correct by logging in.
- **Check your most critical accounts.** Email, banking, and work accounts deserve manual verification.
- **Review secure notes.** Open a few secure notes and confirm the content transferred correctly.

This verification step takes about 10–15 minutes and is the most important part of the process. Rushing past it is the only way this migration can go wrong.

---

## Step 5: Secure Your New Bitwarden Vault

Before you retire your old password manager, lock down your Bitwarden account properly.

### Set a Strong Master Password

Your Bitwarden master password should be:
- At least 16 characters long
- A passphrase (four or more random words) rather than a complex string you will forget
- Unique — not used anywhere else, ever

### Enable Two-Factor Authentication

1. In the Bitwarden web vault, go to **Account Settings** → **Security** → **Two-step Login**.
2. Enable an authenticator app (Google Authenticator, Authy, or the built-in TOTP if you are on Premium).
3. Save your recovery code in a secure physical location (printed paper in a safe, for example).

### Install Apps on All Your Devices

Install Bitwarden on your phone, tablet, and any other browsers you use before you close your old vault. Confirm that sync is working by checking that your imported items appear on each device.

---

## Step 6: Delete Your Export File and Retire Your Old Vault

### Delete the Export File Immediately

- On Windows: Delete the file and empty the Recycle Bin. For extra security, use a tool like Eraser or simply overwrite the file before deleting.
- On macOS: Move to Trash and empty it. Use `rm -P filename.csv` in Terminal for a secure delete on older macOS versions.
- On Linux: Use `shred -u filename.csv` in the terminal.

### Cancel or Delete Your Old Account

Once you are confident in your Bitwarden vault:
- **LastPass:** Go to Account Settings → Delete or Reset Account. Cancel any paid subscription first.
- **1Password:** Go to 1password.com → My Profile → Delete Account. Cancel your subscription in the billing section.

There is no rush to delete immediately — keeping your old account active but unused for a week while you settle into Bitwarden is perfectly reasonable.

---

## Pro Tip

**Use Bitwarden's built-in password health reports** (available under Tools → Reports on the web vault, or with a Premium account) immediately after migrating. These reports flag reused passwords, weak passwords, and accounts that have appeared in known data breaches. Running this report right after migration turns your one-evening project into a genuine security upgrade, not just a platform switch.

---

## FAQ

### Is Bitwarden actually safe to use?

Yes. Bitwarden uses AES-256 encryption, salted hashing, and PBKDF2 SHA-256 (or Argon2id) for key derivation. Your master password never leaves your device in a usable form. The platform has passed independent security audits, and its open-source codebase allows ongoing public scrutiny. No password manager is 100% risk-free, but Bitwarden's security model is considered strong by the security community.

### What if my import has duplicate entries?

Bitwarden does not automatically deduplicate on import. If you previously imported a partial vault and are now importing again, you may end up with duplicates. The easiest fix is to delete your Bitwarden vault contents before re-importing, or to use the web vault's search to find and manually delete duplicates after the fact.

### Can I import from password managers other than LastPass and 1Password?

Yes. Bitwarden supports over 50 import formats, including Dashlane, KeePass, RoboForm, Keeper, Chrome's built-in password manager, Firefox Lockwise, and many others. The process is identical — export from your source, select the correct format in Bitwarden's import tool, and upload the file.

### What happens to my old passwords if I just stop using LastPass without deleting my account?

Your data remains stored on LastPass's servers indefinitely. If LastPass experiences a breach (as it has in the past), your encrypted vault data could be exposed. It is better practice to delete your account and remove the data from their servers once you have confirmed your migration is complete.

### Do I need to pay for Bitwarden to get the same features I had with LastPass Premium?

For most users, Bitwarden Free covers everything LastPass Premium offered, including unlimited passwords and multi-device sync. If you relied on LastPass's emergency access or advanced MFA options, Bitwarden Premium at $10/year replicates those features at a fraction of the cost.

---

## Conclusion

Migrating to Bitwarden is one of those tasks that feels intimidating until you actually start, at which point it becomes straightforward. The export-import workflow is well-supported, the import tool handles the heavy lifting, and the verification step gives you confidence before you close the door on your old vault. By the time you finish your evening coffee, you can have a more secure, more affordable, and fully open-source password manager running across all your devices.

The single most important thing to remember: delete that export file the moment your import is confirmed. Everything else is just clicking through menus.

---

## Internal Links

- [How to Create a Strong Master Password You Will Actually Remember](/blog/strong-master-password-guide/)
- [Setting Up Two-Factor Authentication on Every Account That Matters](/blog/two-factor-authentication-setup-guide/)
- [Bitwarden vs. KeePass: Which Password Manager Is Right for You?](/blog/bitwarden-vs-keepass-comparison/)
