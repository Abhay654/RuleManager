// 🛠️ CRITICAL VERCEL FIX: Explicitly force dotenv config to load before any execution
require('dotenv').config();

const express = require('express');
const jsforce = require('jsforce');
const cors = require('cors');
const crypto = require('crypto'); 

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://rule-manager-mbka.vercel.app',
  'https://sf-switch-dashboard.vercel.app' 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// HELPER FUNCTION TO GET OAUTH INSTANCE DYNAMICALLY
const getOAuth2 = () => {
  console.log("Vercel Runtime Key Resolution:", {
    ID_LENGTH: process.env.SF_CLIENT_ID ? process.env.SF_CLIENT_ID.length : 0,
    URI_VALUE: process.env.SF_REDIRECT_URI
  });

  return new jsforce.OAuth2({
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    redirectUri: process.env.SF_REDIRECT_URI, 
    loginUrl: 'https://login.salesforce.com' 
  });
};

// STANDARD ROUTE HANDLERS
app.get('/auth/login', (req, res) => {
  try {
    const oauth2 = getOAuth2();
    const authUrl = oauth2.getAuthorizationUrl({ 
      scope: 'api refresh_token' 
    });
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send("Initialization Failed: " + error.message);
  }
});

// 🔑 NEW DEMO BYPASS ROUTE
// This takes your credentials stored in Vercel and pushes them straight to the frontend link
app.get('/auth/demo', (req, res) => {
  try {
    const token = process.env.SF_DEMO_TOKEN; 
    const instance = process.env.SF_DEMO_INSTANCE || 'https://login.salesforce.com';
    const username = process.env.SF_DEMO_USERNAME || 'Demo User';

    if (!token) {
      return res.status(500).send("Demo setup failed: SF_DEMO_TOKEN is missing from Vercel settings.");
    }

    const frontendRedirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://rule-manager-mbka.vercel.app' 
      : 'http://localhost:5173';                

    // Instantly routes them to the dashboard as a pre-authenticated user
    res.redirect(`${frontendRedirectUrl}?token=${token}&instance=${instance}&username=${username}`);
  } catch (error) {
    res.status(500).send("Demo Routing Failed: " + error.message);
  }
});

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code missing from callback parameters.");
  }
  
  try {
    const oauth2 = getOAuth2();
    const conn = new jsforce.Connection({ oauth2: oauth2 });
    
    await conn.authorize(code);
    const identity = await conn.identity();
    
    const frontendRedirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://rule-manager-mbka.vercel.app' 
      : 'http://localhost:5173';                

    res.redirect(`${frontendRedirectUrl}?token=${conn.accessToken}&instance=${conn.instanceUrl}&username=${identity.username}`);
  } catch (err) {
    console.error("Callback Handshake Failed:", err.message);
    res.status(500).send("Callback Handshake Failed: " + err.message);
  }
});

app.post('/api/validation-rules', async (req, res) => {
  const { accessToken, instanceUrl } = req.body;
  const conn = new jsforce.Connection({ instanceUrl, accessToken });
  try {
    const query = "SELECT Id, ValidationName, Active, Description, ErrorMessage FROM ValidationRule WHERE EntityDefinition.DeveloperName = 'Account'";
    const result = await conn.tooling.query(query);
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deploy-rules', async (req, res) => {
  const { accessToken, instanceUrl, rules } = req.body;
  const conn = new jsforce.Connection({ instanceUrl, accessToken });
  
  try {
    for (const rule of rules) {
      const liveRecord = await conn.tooling.sobject('ValidationRule').retrieve(rule.Id);
      
      await conn.tooling.sobject('ValidationRule').update({
        Id: rule.Id,
        FullName: `Account.${liveRecord.ValidationName}`,
        Metadata: {
          ...liveRecord.Metadata, 
          active: rule.Active     
        }
      });
    }
    res.json({ success: true, message: 'Deployment processed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;