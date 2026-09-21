# NotYourAverageMail — Agent Guidelines & Automation Rules

## macOS Desktop Companion (`mail-desktop`) Guidelines

### ⚠️ Always Install & Restart After Changing `mail-desktop`
After **any** change to `mail-desktop` code, do not stop at a successful build. **ALWAYS install the new build and restart the app without asking**, so the developer can test it immediately:
```bash
cd mail-desktop
xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' CODE_SIGN_IDENTITY="-" build
# Product is named NotYourAverageMail.app; install it as NotYourAverageMail.app
P=$(xcodebuild -scheme leanring-buddy -configuration Debug -destination 'platform=macOS' -showBuildSettings 2>/dev/null | awk '/ BUILT_PRODUCTS_DIR =/{print $3}')/NotYourAverageMail.app
pkill -f "NotYourAverageMail" || pkill -f "ModernMail" || pkill -f "Clicky" || true; sleep 1
rm -rf /Applications/NotYourAverageMail.app && cp -R "$P" /Applications/NotYourAverageMail.app
codesign --force --deep --sign - /Applications/NotYourAverageMail.app
```
Then run the permission reset below and relaunch. Backend (`mail-web/convex`) changes must also be deployed with `npx convex dev --once` in `mail-web`.

### ⚠️ Mandatory Permission Cache Reset on Every App Rebuild
Whenever `mail-desktop` (`leanring-buddy`) is rebuilt, recompiled, or reinstalled to `/Applications/NotYourAverageMail.app`, **YOU MUST ALWAYS RESET THE macOS TCC PERMISSION CACHE AND USERDEFAULTS** so the developer can cleanly test and regrant permissions.

#### Required Commands to Run After Every Rebuild:
```bash
# 1. Kill any existing instances
pkill -f "NotYourAverageMail" || pkill -f "ModernMail" || pkill -f "Clicky" || true

# 2. Reset macOS TCC privacy database permissions for the companion bundle ID
tccutil reset Accessibility com.notyouraveragemail.companion || true
tccutil reset ScreenCapture com.notyouraveragemail.companion || true
tccutil reset Microphone com.notyouraveragemail.companion || true
tccutil reset SpeechRecognition com.notyouraveragemail.companion || true
tccutil reset AppleEvents com.notyouraveragemail.companion || true
tccutil reset All com.notyouraveragemail.companion || true

# 3. Clear application user preferences cache
defaults delete com.notyouraveragemail.companion || true

# 4. Relaunch the application
open /Applications/NotYourAverageMail.app
```

---

### App Architecture & Key Shortcuts Reference
- **Bundle ID**: `com.notyouraveragemail.companion`
- **Application Path**: `/Applications/NotYourAverageMail.app`
- **Voice Push-To-Talk**: `Control + Option` (`⌃⌥`)
- **File Selection & Email Prompt Drafting**: `Command + Shift + M` (`⌘⇧M`)
- **Deep Link Scheme**: `notyouraveragemail://connect?inboxId=<inboxId>` (alias: `modernmail://`)
- **Backend Deployment**: Convex (`https://steady-ram-494.convex.cloud`)
- **Web Frontend Deployment (`siteURL`)**:
  - **Local Testing**: `http://localhost:3000`
  - **Distribution / Production**: `https://steady-ram-494.convex.site`

---

### 🌐 Web URL Environment Rule (Testing vs. Distribution)
- **When Testing Locally**: Use `http://localhost:3000` for all companion web link openings (companion auth link, Figma OAuth connect, Figma settings).
- **When Building for Distribution**: Use `https://steady-ram-494.convex.site` (`ConvexService.shared.siteURL`).
- **Figma OAuth Callback URLs**:
  The Figma Developer Console app (`FIGMA_CLIENT_ID`) MUST have the appropriate redirect URI registered:
  - **Live Distribution**: `https://steady-ram-494.convex.site/api/auth/figma/callback`
  - **Local Testing**: `http://localhost:3000/api/auth/figma/callback`
  *(Both URLs should be registered in the Figma developer dashboard so authentication works in both testing and live distribution).*

---

### 📦 Building & Packaging for Distribution (Path A: Free / Ad-Hoc)

To build and package standalone distribution artifacts (`.dmg` and `.zip`):
```bash
./mail-desktop/scripts/package-release.sh
```
This automated script:
1. Compiles `mail-desktop` in **Release** configuration (stripped and optimized).
2. Stages `NotYourAverageMail.app` in `mail-desktop/dist/`.
3. Performs deep ad-hoc code-signing with entitlements.
4. Generates `mail-desktop/dist/NotYourAverageMail.dmg` (drag-and-drop disk image with `/Applications` link).
5. Generates `mail-desktop/dist/NotYourAverageMail-macOS.zip` (standalone compressed archive).

#### Gatekeeper Instructions for End Users:
Because ad-hoc builds are not notarized by a paid Apple Developer ID, downloaded copies will have the macOS quarantine attribute set by the browser. Instruct users to either:
1. **Right-click** `NotYourAverageMail.app` ➔ select **Open** ➔ click **Open Anyway** (in System Settings ➔ Privacy & Security).
2. Or run this one-line command in Terminal:
   ```bash
   xattr -cr /Applications/NotYourAverageMail.app
   ```

