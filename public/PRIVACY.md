#---
title: 'Privacy Policy'
#---

## Privacy Policy

**Last updated:** November 24, 2026

This page explains, in plain language, exactly what leaves your 
browser when you use this website, what stays
on your own device, and which third parties are involved.

If you only read one section, read [the summary](#summary) below.

---

## Summary

- You do **not** need an account to read the story, and there is no database of
  readers on our side.
- **Google Analytics 4** runs on every page and is the only tracking that is
  active by default. See [how to opt out](#4-google-analytics).
- Everything else (bookmarks, preferences, AI keys, chat sessions) is stored
  **locally in your browser** and never reaches us.
- Signing in with Google is **optional** and only used for the age gate.
- The AI features are **bring your own key**. Your messages go straight from your
  browser to the provider you configured, never through us.

---

## 1. Who is responsible

This website is maintained by **Yasmin Seidel (JasminDreasond)**.

- Contact: [tiny@ponydriland.com](mailto:tiny@ponydriland.com)
- Source code: [github.com/Pony-Driland/Website](https://github.com/Pony-Driland/Website)

---

## 2. Data we do not collect

To be explicit, this website does **not**:

- Ask you to create an account, and does not have a user database of its own.
- Sell, rent or trade any data. There is no advertising network here.
- Use session recording, heatmaps, fingerprinting or cross-site advertising
  pixels.
- Read the content of the roleplay conversations you have on the Roleplay page.

---

## 3. Data stored on your own device

Most of the website state never leaves your browser. It is kept in
`localStorage` and in IndexedDB, and it is deleted when you clear your browser
storage.

| What | Purpose |
| --- | --- |
| `bookmark*` | The last line you read in each chapter. |
| `NSFW*` | Which mature content filters you enabled. |
| `musicDisabled` | Whether you turned the soundtrack off. |
| `user-country` | Country code used by the age gate (see below). |
| `userBirthday` | The birthday returned by Google, when you sign in. |
| `firstTime` | Whether the welcome message was already shown. |
| `tiny-ai-storage*` | The AI provider you selected and the API key you typed. |
| `total-time-using-ai` | How long you used the AI page, shown in the header. |
| IndexedDB `pony-driland` | AI roleplay sessions, messages and settings. |
| Service worker cache | Static assets, so the site loads offline. |

None of the entries above are transmitted to us. They are readable by this
website only, and only from your own browser.

---

## 4. Google Analytics

This website uses **Google Analytics 4** to understand which parts of the 
project are actually used. It is loaded on every
page and it is the only tracking that runs without you doing anything.

**What is collected:** pages and chapters you open, reading progress milestones
(25%, 50%, 75% and 100% of a chapter), outbound link clicks, file downloads,
broken links (404) and JavaScript errors. Google may also collect the usual
request metadata, such as your IP address, approximate location, browser and
device.

**What is not collected:** we do not send your name, e-mail, API keys, chat
messages or roleplay conversations to Google Analytics. The custom events only carry
identifiers such as the chapter number.

Google Analytics uses cookies and similar technologies. For more information,
see the [Google Privacy Policy](https://policies.google.com/privacy) and the
[Google Analytics opt-out browser add-on](https://tools.google.com/dlpage/gaoptout).

**How to opt out:** install the opt-out add-on above, use a content blocker, or
enable "Do Not Track"/tracking protection in your browser. The website works
normally without analytics.

---

## 5. Signing in with Google (optional)

Some features (currently the age gate for mature content) require knowing your
age. For that, the website offers an **optional** Google sign-in powered by
**Firebase Authentication**.

- Authentication is handled entirely by **Google**. We never see or store your
  Google password.
- The website requests the `user.birthday.read` scope, so it can read your
  **birthday** from the Google People API and check whether you are old enough.
  Only the date is read, and only for that check.
- The returned birthday is stored **locally** in your browser. It is not sent to
  us.
- Signing out removes the locally stored birthday.

If you never sign in, nothing changes: the rest of the website keeps working.

See [Firebase Privacy and Security](https://firebase.google.com/support/privacy).

---

## 6. Country detection

The first time you open the website, the browser requests
[api.country.is](https://api.country.is) to find out which country you are in.
The result is a two-letter code stored in `localStorage` and used only to decide
whether the age gate must be shown. Your IP address is visible to that service
as part of any HTTP request; nothing else is sent.

---

## 7. AI features (bring your own key)

Artificial intelligence is **completely optional** and disabled by default. There
is no AI model hosted here: this website is only a client.

When you configure a provider, you choose where your data goes:

- **Google AI Studio** — your API key is stored in your browser and the requests
  go directly from your browser to Google. Your messages are subject to the
  [Google APIs Terms of Service](https://developers.google.com/terms) and the
  [Google Privacy Policy](https://policies.google.com/privacy).
- **Multiplayer / self-hosted server** — you can point the website at a
  [TinyChat server](https://github.com/Pony-Driland/TinyChat-Server), including
  one you host yourself. In that case the server operator (not us) processes the
  messages.
- **No AI** — the website works without any provider.

API keys are stored unencrypted in your browser `localStorage`. Do not use a key
on a shared computer, and revoke it with the provider if you think it leaked.

---

## 8. Multiplayer rooms

When you join a multiplayer room, the nickname, the room name and the messages
you send are transmitted to the server you connected to, so the other people in
the room can see them. Passwords are sent to that server for authentication.
Avoid sharing personal information in public rooms.

---

## 9. Embedded third-party content

The soundtrack player can embed videos from **YouTube** (Google). Loading an
embedded player allows YouTube to set its own cookies and to see your IP
address, even if you do not press play. See the
[YouTube Terms of Service](https://www.youtube.com/t/terms).

---

## 10. Third-party services

| Service | Purpose | Privacy policy |
| --- | --- | --- |
| Google Analytics 4 | Traffic statistics | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Firebase Authentication | Optional Google sign-in | [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy) |
| Google People API | Birthday, for the age gate | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Google AI Studio | Optional AI provider | [policies.google.com/privacy](https://policies.google.com/privacy) |
| YouTube | Soundtrack playback | [policies.google.com/privacy](https://policies.google.com/privacy) |
| api.country.is | Country detection | [country.is](https://api.country.is) |
| GitHub Pages | Website hosting | [docs.github.com/site-policy](https://docs.github.com/site-policy) |

We are not responsible for how these providers handle your data. Please read
their own policies.

---

## 11. Legal basis and your rights

Depending on where you live (LGPD, GDPR and similar laws), you have the right
to:

- **Access** the personal data processed about you.
- **Correct** data that is wrong.
- **Delete** data, by clearing your browser storage and, for analytics, using
  the Google opt-out above.
- **Object** to analytics at any time, using a content blocker or the Google
  opt-out add-on.
- **Lodge a complaint** with your local data protection authority.

Because almost everything is stored locally, you can exercise most of these
rights yourself by clearing your browser data. For anything else, use the
contact below.

---

## 12. Data retention

We do not run a database of visitors, so there is nothing for us to retain.
Locally stored data stays until you delete it. Analytics data is retained by
Google according to the retention setting of the property.

---

## 13. Changes to this policy

This policy may be updated whenever the website starts or stops using a service.
The date at the top of the page always reflects the current version. Continuing
to use the website after a change means you accept the updated policy.

---

## 14. Contact

Questions, requests or complaints about privacy:

- E-mail: [tiny@ponydriland.com](mailto:tiny@ponydriland.com)
- Open an issue: [github.com/Pony-Driland/Website/issues](https://github.com/Pony-Driland/Website/issues)

By using this website you agree to the practices described in this policy.
