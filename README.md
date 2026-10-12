# BridgC

BridgC connects event customers with vendors. The repository is split into a Vite client and an Express/Mongoose API so each service can be deployed independently.

## Project structure

```text
BridgC/
├── client/
│   ├── src/
│   │   ├── components/       # Shared layout, login, comparison, RFP, CRM
│   │   ├── lib/              # API helpers
│   │   ├── pages/            # Marketplace, profile, quotes, event form, vendor hub
│   │   ├── store/            # Zustand session state
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── pages.css         # Shared responsive page design
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   ├── app.js
    │   └── server.js
    ├── .env.example
    └── package.json
```

## Run locally

1. Use Node.js 20 or later and MongoDB Atlas (or a local MongoDB).
2. Copy `server/.env.example` to `server/.env`, set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL`.
3. Copy `client/.env.example` to `client/.env`. Leave `VITE_API_URL` blank for local development; Vite proxies API and Socket.IO requests to `localhost:5000`.
4. In one PowerShell terminal, start the API:

   ```bash
   Set-Location .\server
   npm install
   npm run dev
   ```

   In another PowerShell terminal, start the client:

   ```bash
   Set-Location .\client
   npm install
   npm run dev
   ```

The API listens on port 5000 by default; Vite listens on port 5173.

## API contract

- `POST /api/rfps` — authenticated customer; creates an RFP and matches vendors.
- `PATCH /api/crm/leads/:id/status` — authenticated vendor; moves a lead through the CRM pipeline.
- `POST /api/reviews` — authenticated customer; accepts a review only when the linked lead/deal is completed (and the RFP and accepted pitch are completed when the review references an RFP).
- `POST /api/auth/login` — signs in an existing active account and returns a JWT.
- `GET /api/vendors` and `GET /api/vendors/suggest?q=...` — public vendor search and keyword suggestions.
- `POST /api/uploads` — authenticated multipart upload (`file` field; image, PDF, or video; 50 MB maximum) to Cloudinary.
- `GET /api/health` — health check.

The authenticated frontend connects with `socket.io-client` and joins its own `user:<user-id>` room. The API emits `lead:matched` alerts to matched vendors; message delivery over Socket.IO is not implemented in this starter.

## Client pages

- `/login` — enterprise login with buyer/vendor role selection and e-KYC messaging.
- `/` — marketplace discovery, categories, search, vendor cards, and comparison selection.
- `/vendors/:slug` — vendor storefront with packages, portfolio, reviews, and availability calendar.
- `/quotes` — side-by-side quote comparison, difference filter, print-to-PDF, and vendor actions.
- `/rfp/new` — dynamic event request form.
- `/vendor` — vendor portal dashboard with metrics, matching opportunities, and CRM Kanban.

The login screen signs in existing active accounts; account registration/profile onboarding, chat delivery, pitch applications, credits/boosts, live analytics, server-backed availability management, and the customer review form remain to be implemented. Featured vendor cards, comparison data, and initial CRM cards are presentation fixtures; vendor search, RFP submission, lead updates, login, and uploads use the API.

## Deployment

### MongoDB Atlas

1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/) and create a project and a free M0 cluster. Choose a region close to your Render service.
2. Under **Database Access**, create a database user with a strong password and the **Read and write to any database** role. This user is for the app; it is different from your Atlas website login.
3. Under **Network Access**, add `0.0.0.0/0`. Render's outbound IPs can change, so this allows the hosted API to reach Atlas. Keep the database user password strong, never expose the URI to the browser, and tighten the network rule later if you use a Render plan with static outbound IPs.
4. Select **Connect → Drivers → Node.js**, copy the connection string and replace `<password>` and the database name, for example:

   ```text
   mongodb+srv://bridgc_app:<URL-encoded-password>@cluster0.xxxxx.mongodb.net/bridgc?retryWrites=true&w=majority
   ```

   URL-encode reserved characters in the database password. Do not commit this URI or put it in a `VITE_*` variable.

### Render (API)

1. Push the project to a GitHub repository. In Render, choose **New → Blueprint** and connect that repository. Render finds the root [render.yaml](./render.yaml) and creates the `bridgc-api` web service with root directory `server`, `npm ci`, `npm start`, and `/api/health` health checks.
2. In the service's **Environment** settings, set:
   - `MONGODB_URI`: the Atlas connection string from above.
   - `CLIENT_URL`: temporarily use `http://localhost:5173` if the Vercel site is not deployed yet. After Vercel deploys, replace it with the exact production origin. Multiple origins can be comma-separated; surrounding whitespace and trailing slashes are removed.
   - `JWT_SECRET`: let Render generate it from `render.yaml`; use a random value of at least 32 characters if setting it manually.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: only if you need file uploads.
3. Deploy. Wait for the service to report **Live**. Copy its URL, such as `https://bridgc-api.onrender.com`, and test:

   ```powershell
   Invoke-RestMethod https://bridgc-api.onrender.com/api/health
   Invoke-RestMethod https://bridgc-api.onrender.com/api/vendors
   ```

   Health must return `status: ok` and `database: connected`. The vendor endpoint may return an empty list if the database has no profiles yet.

### Vercel (client)

1. In Vercel, import the same repository and set **Root Directory** to `client`. Build command is `npm run build`, output directory is `dist`; the Vite framework preset detects these automatically.
2. Add `VITE_API_URL` with the Render API origin, e.g. `https://bridgc-api.onrender.com` (no `/api` suffix and no trailing slash). This is required in production and is shared by HTTP API requests and Socket.IO. Vite embeds this value at build time, so redeploy the frontend after changing it.
3. Deploy the frontend and copy its production origin. Add that exact origin to Render's `CLIENT_URL`, then redeploy/restart the backend. For multiple frontends/custom domains, separate origins with commas and no trailing slashes.
4. The client includes [client/vercel.json](./client/vercel.json) so direct loads and refreshes on paths such as `/quotes` and `/vendors/danang-media` resolve to the React app.

### Create the first login account

The starter intentionally does not expose public account registration. Create an initial account from your computer; the command connects directly to Atlas and stores the password using the same Mongoose hashing hook as the app. In PowerShell:

```powershell
Set-Location .\server
$secureUri = Read-Host "Paste the Atlas connection string" -AsSecureString
$env:MONGODB_URI = [Net.NetworkCredential]::new("", $secureUri).Password
$env:BOOTSTRAP_EMAIL = Read-Host "Account email"
$env:BOOTSTRAP_FULL_NAME = Read-Host "Account full name"
$securePassword = Read-Host "Use a strong password (12+ characters)" -AsSecureString
$env:BOOTSTRAP_PASSWORD = [Net.NetworkCredential]::new("", $securePassword).Password
$env:BOOTSTRAP_ROLE = "customer"
npm run bootstrap:user
```

For a vendor account, set `BOOTSTRAP_ROLE` to `vendor` and also set `BOOTSTRAP_STORE_NAME`, `BOOTSTRAP_STORE_SLUG`, and `BOOTSTRAP_CATEGORY` (comma-separated). The script does not overwrite an existing account. Remove the session variables after use:

```powershell
Remove-Item Env:MONGODB_URI, Env:BOOTSTRAP_EMAIL, Env:BOOTSTRAP_FULL_NAME, Env:BOOTSTRAP_PASSWORD, Env:BOOTSTRAP_ROLE -ErrorAction SilentlyContinue
```

### Verify the deployed frontend is connected to the backend

1. Open the Vercel site, sign in with the account created above, then use the vendor search or submit an RFP. The requests should reach the Render API; the API log should not report CORS, DNS, or MongoDB errors.
2. In browser Developer Tools → **Network**, check the request URL begins with the Render URL and that `/api/vendors` returns HTTP 200. A login returns HTTP 401 only for incorrect credentials; successful login returns a token.
3. If the browser reports a CORS error, compare `window.location.origin` in the browser with Render's `CLIENT_URL` exactly, update `CLIENT_URL`, and redeploy the backend.
4. If `/api/health` fails, check Render's startup logs and verify the Atlas database user, URL-encoded password, cluster network access, and `MONGODB_URI`.
5. Render's free web service may sleep when idle; the first request after inactivity can take a short while. Keep the tab open and retry after it wakes.

Do not expose Atlas credentials, JWT secrets, or Cloudinary API secrets as `VITE_*` variables.
