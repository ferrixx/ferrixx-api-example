# ferrixx API – Example: User Auth + Posts Demo

A minimal example showing how to build **user registration, login, and a shared post feed**
using [ferrixx API](https://api.ferrixx.de) Custom Collections as the backend.

No server, no database setup, no backend code — just an API key and a few `fetch()` calls.

---

## What this demo does

- **Register** a new user (email + username + password stored in the `users` collection)
- **Login** by filtering the collection by email (client-side password check in this demo)
- **Dashboard** — two-column layout showing user profile + API status
- **Posts feed** — any logged-in user can post, and can delete their own posts

All data lives in two Custom Collections (`users` and `posts`) on ferrixx API.

---

## Setup (5 minutes)

### 1. Get an API key

Sign up or log in at [api.ferrixx.de/cp](https://api.ferrixx.de/cp) and create an API key
with the `custom` permission.

### 2. Create the `users` collection

In the Control Panel → **Collections → New Collection**:

| Setting | Value |
|---|---|
| Name | Users |
| Slug | `users` |

Then go to **Manage → Fields → Add Field**:

| Field | Type | Required | Unique |
|---|---|---|---|
| `username` | text | ✅ | ✅ |
| `email` | text | ✅ | ✅ |
| `password` | text | ✅ | – |

> **Note:** This demo stores passwords in plain text to stay simple and dependency-free.  
> In a real app use bcrypt / Argon2 on a server-side layer.

### 3. Create the `posts` collection

| Setting | Value |
|---|---|
| Name | Posts |
| Slug | `posts` |

Fields:

| Field | Type | Required |
|---|---|---|
| `title` | text | ✅ |
| `content` | longtext | ✅ |
| `user_id` | integer | ✅ |

### 4. Configure the demo

Edit the top of `api_script.js`:

```js
const API_BASE = 'https://api.ferrixx.de/v1';
const API_KEY  = 'apk_YOUR_KEY_HERE';   // ← paste your key
const USERNAME = 'YOUR_CP_USERNAME';    // ← your ferrixx username
```

### 5. Open `index.html` in a browser

No build step, no npm install. Works from `file://` or any static host.

---

## API calls used

```http
# Register
POST /v1/{username}/users
X-API-Key: apk_...
Content-Type: application/json
{"username":"alice","email":"alice@example.com","password":"secret"}

# Login — filter by email (correct syntax: filter_field + filter_value)
GET /v1/{username}/users?filter_field=email&filter_value=alice@example.com
X-API-Key: apk_...

# List all posts (newest first, limit 20)
GET /v1/{username}/posts?limit=20
X-API-Key: apk_...

# Create a post
POST /v1/{username}/posts
X-API-Key: apk_...
Content-Type: application/json
{"title":"Hello world","content":"My first post!","user_id":3}

# Delete a post
DELETE /v1/{username}/posts?id=7
X-API-Key: apk_...

# API status / uptime
GET /v1/status
```

---

## Project structure

```
github-example/
├── index.html      — UI (auth card + two-column dashboard)
├── api_script.js   — All JS logic (auth, posts, uptime)
├── style.css       — Dark theme matching ferrixx brand
└── README.md       — This file
```

---

## Security note

This demo intentionally stores and compares passwords in plain text so it stays
dependency-free and easy to read. **Do not use this pattern in production.**  
For a real app, hash passwords with bcrypt or Argon2 on a backend and never
expose the raw password in API responses.

---

Powered by [ferrixx API](https://api.ferrixx.de) — Free to use, API key protected.
