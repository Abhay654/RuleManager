const express = require('express');
const jsforce = require('jsforce');
const cors = require('cors');
require('dotenv').config();

const app = express();


app.use(cors({
  origin: 'http://localhost:5173', // Your React frontend port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 2. Make sure your server can parse JSON data payloads sent by axios
app.use(express.json());

const oauth2 = new jsforce.OAuth2({
  clientId: process.env.SF_CLIENT_ID,
  clientSecret: process.env.SF_CLIENT_SECRET,
  redirectUri: process.env.SF_REDIRECT_URI,
  loginUrl: 'https://login.salesforce.com' 
});

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

let globalCodeVerifier = '';


app.get('/auth/login', (req, res) => {
  const authUrl = oauth2.getAuthorizationUrl({ 
    scope: 'api refresh_token' // Removed 'tooling' from the request scope parameter
  });
  res.redirect(authUrl);
});


app.get('/oauth/callback', async (req, res) => {
  const conn = new jsforce.Connection({ oauth2: oauth2 });
  const code = req.query.code;
  
  if (!code) {
    return res.status(400).send("Authorization code missing from callback parameters.");
  }
  
  try {
    // Authorize using the standard verification token code directly
    await conn.authorize(code);
    
    // Fetch identity metadata details to render logged-in user context fields
    const identity = await conn.identity();
   
    res.redirect(`http://localhost:5173?token=${conn.accessToken}&instance=${conn.instanceUrl}&username=${identity.username}`);
  } catch (err) {
    console.error("Callback Handshake Failed:", err.message);
    res.status(500).send("Callback Handshake Failed: " + err.message);
  }
});

// ROUTE 3: Fetch Rules
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
      // 1. Fetches the complete, raw structural metadata definition from Salesforce
      const liveRecord = await conn.tooling.sobject('ValidationRule').retrieve(rule.Id);
      
    
      await conn.tooling.sobject('ValidationRule').update({
        Id: rule.Id,
        FullName: `Account.${liveRecord.ValidationName}`,
        Metadata: {
          ...liveRecord.Metadata, // Preserves the condition formula, description, and error message
          active: rule.Active     // Toggles it to true (ON) or false (OFF) based on your checkbox
        }
      });
    }
    res.json({ success: true, message: 'Deployment processed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


 


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});