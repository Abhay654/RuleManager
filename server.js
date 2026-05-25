const express = require('express');
const jsforce = require('jsforce');
const cors = require('cors');
const crypto = require('crypto'); 

const app = express();


const allowedOrigins = [
  'http://localhost:5173',
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


const oauth2 = new jsforce.OAuth2({
  clientId: process.env.SF_CLIENT_ID,
  clientSecret: process.env.SF_CLIENT_SECRET,
  redirectUri: process.env.SF_REDIRECT_URI, 
  loginUrl: 'https://login.salesforce.com' 
});




app.get('/auth/login', (req, res) => {
  const authUrl = oauth2.getAuthorizationUrl({ 
    scope: 'api refresh_token' 
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
    
    await conn.authorize(code);
    
    
    const identity = await conn.identity();
    
    
    const frontendRedirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://sf-switch-dashboard.vercel.app' // Production URL
      : 'http://localhost:5173';                 // Local Fallback

    
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


const PORT = process.env.PORT || 10000;

// Adding '0.0.0.0' tells the app to listen to external network requests from Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running smoothly on port ${PORT}`);
});