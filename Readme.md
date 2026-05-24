Project Documentation: Salesforce Switch Dashboard
1. Project Overview
The Salesforce Switch Dashboard is a full-stack engineering tool designed to view, toggle, and deploy Salesforce environment metadata modifications dynamically.

Built using a decoupled React frontend and an Express Node.js backend, the application leverages the secure Salesforce Tooling API via an OAuth 2.0 web handshake. This allows developers or system administrators to safely activate or deactivate platform automation components—such as Validation Rules—on the fly from an external interface without needing to write custom Apex deployment scripts or change settings manually in the Salesforce Setup UI.

 2. How to Run the Project (Local Execution Guide)
Because the application is built as a distributed full-stack pattern, you must open two separate terminal windows simultaneously to keep both local engines running.

Step 1: Start the Backend Server
Open your terminal and navigate to the root directory of your project:

cd D:\Assingment

2. Start the backend engine using Node:
   ```bash
node server.js
Verify: Look for the confirmation console log: Server running smoothly on port 5000. Keep this terminal window open.

Step 2: Start the Frontend React Client
Open a second, completely separate terminal window.

Navigate into your UI directory folder:

Bash
cd D:\Assingment\RuleManager
3. Launch the Vite local development server:
   ```bash
npm run dev
Verify: The terminal will display a local network link, typically http://localhost:5173.

Step 3: Access and Test the Dashboard
Open your web browser and navigate to:

Plaintext
http://localhost:5173
2. Click the orange **LOGIN** button to complete the secure Salesforce handshake.
3. Once authenticated, click **GET ME DATA** to pull your live validation rules into the UI table!

---

## 3. Core Full-Stack Architecture

The system operates across three core network layers running locally on your workstation:

*   **UI Client Layer (React - Port `5173`):** Renders the user dashboard, holds the active authentication state, maps real-time data arrays into clean UI grids, and sends state mutations back to the backend.
*   **API Orchestration Layer (Express - Port `5000`):** Manages the hidden `.env` configurations, handles OAuth authorization code exchanges with Salesforce security servers, and acts as a middleware router to execute declarative metadata operations.
*   **Cloud Platform Layer (Salesforce Developer Org):** The source of truth containing the live business logic components, data models, and access permissions.

---

## 4. Detailed Route Configurations & Endpoints

Your Node.js background server (`server.js`) utilizes three fundamental API endpoints to safely process the full-stack flow:

### 🔗 Route 1: `GET /auth/login`
*   **Purpose:** Initializes the security handshake.
*   **Behavior:** Directs the user's browser away from localhost and directly onto Salesforce's secure login servers. It passes your environment's client keys alongside requested data access permissions (`api` and `refresh_token`).

### 🔄 Route 2: `GET /oauth/callback`
*   **Purpose:** Processes the temporary security handshake tokens.
*   **Behavior:** Salesforce securely redirects back to this URL parameter after a user clicks "Allow Access." The backend catches the single-use authorization code string (`?code=`), exchanges it with Salesforce for an active `accessToken`, reads the user profile identity handle (`conn.identity()`), and pipes the keys securely back to your dashboard viewport query string.

### 📊 Route 3: `POST /api/deploy-rules`
*   **Purpose:** Executes atomic metadata mutations.
*   **Behavior:** When you click **DEPLOY CHANGES**, the frontend sends a data payload containing modified rule flags to this endpoint. The backend takes the array, loops through the rules, uses the Tooling API to fetch the live underlying core structural XML schema by its unique ID, overwrites the specific `active` boolean state flag, appends the necessary object prefix mapping (`Account.ValidationName`), and pushes the updated definition back to the Salesforce Cloud environment seamlessly.

---

## ⚡ Technical Talking Points (For Your Video Presentation)

When demonstrating this project to your instructor, use these key talking points to score maximum marks on technical implementation:

1.  **On OAuth Token Expiration Security:** 
    > *"During development, we actively managed Salesforce's strict single-use token lifecycle. If an expired authorization code is resubmitted due to a browser page refresh, Salesforce immediately rejects the handshake to protect the environment against replay attacks. We resolved this gracefully by implementing clean page redirection flows from our frontend state contexts."*
2.  **On Overcoming Scope Validation Barriers:**
    > *"When moving to a modern Salesforce Sandbox org framework, explicitly requesting the legacy `tooling` scope keyword via raw OAuth strings can trigger an `invalid_scope` exception. We optimized our architecture by requesting the universal platform `api` scope string instead, which inherently inherits full Tooling API CRUD permissions behind the scenes."*
3.  **On Cross-Origin Resource Sharing (CORS):**
    > *"To safely allow our client-side React code running on port 5173 to speak with our backend infrastructure on port 5000 without hitting browser-level blocking restrictions, we injected explicit CORS middleware headers. This secures our local data tunnels and prevents `Network Error` connection flags during live deployments."*