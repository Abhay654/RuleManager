import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [session, setSession] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Validation Rules');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const instanceParam = params.get('instance');
    const userParam = params.get('username');

    if (tokenParam && instanceParam && userParam) {
      localStorage.setItem('sf_token', tokenParam);
      localStorage.setItem('sf_instance', instanceParam);
      localStorage.setItem('sf_username', userParam);
      setSession({ accessToken: tokenParam, instanceUrl: instanceParam, username: userParam });
      window.history.replaceState({}, document.title, window.location.pathname); // clear tokens from URL bar
    } else {
      const savedToken = localStorage.getItem('sf_token');
      const savedInstance = localStorage.getItem('sf_instance');
      const savedUser = localStorage.getItem('sf_username');
      if (savedToken && savedInstance && savedUser) {
        setSession({ accessToken: savedToken, instanceUrl: savedInstance, username: savedUser });
      }
    }
  }, []);

  // 🛠️ 1. OPTIMIZED LOGIN HANDLER: Routes straight to your auto-login backend bypass
  const handleLogin = () => {
    window.location.href = '/auth/demo';
  };

  const fetchValidationRules = async () => {
    if (!session) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post('/api/validation-rules', {
        accessToken: session.accessToken,
        instanceUrl: session.instanceUrl
      });
      setRules(response.data);
    } catch (err) {
      setMessage('Error reading metadata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAll = (status) => {
    setRules(prev => prev.map(r => ({ ...r, Active: status })));
  };

  const handleToggleSingle = (id) => {
    setRules(prev => prev.map(r => r.Id === id ? { ...r, Active: !r.Active } : r));
  };

  const deployChanges = async () => {
    setLoading(true);
    setMessage('');
    try {
      await axios.post('/api/deploy-rules', { 
        accessToken: session.accessToken,
        instanceUrl: session.instanceUrl,
        rules: rules
      });
      setMessage('All changes have been successfully deployed.');
    } catch (err) {
      setMessage('Error deploying changes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setSession(null);
    setRules([]);
    setMessage('');
  };

  const styles = {
    container: { maxWidth: '1000px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' },
    title: { fontSize: '32px', color: '#e25c24', margin: '0 0 10px 0' },
    subtitle: { color: '#555', fontSize: '14px', marginBottom: '25px', lineHeight: '1.4' },
    banner: { padding: '12px 20px', borderRadius: '4px', margin: '15px 0', fontSize: '14px' },
    loginBox: { textAlign: 'center', padding: '40px 20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fdfdfd' },
    loginBtn: { padding: '10px 25px', fontSize: '14px', background: '#f05a28', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    sessionInfo: { background: '#fcf2ed', padding: '15px', borderRadius: '4px', fontSize: '14px', color: '#b3471e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    btn: { padding: '8px 16px', background: '#f05a28', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', marginRight: '10px' },
    tabBar: { display: 'flex', borderBottom: '1px solid #ddd', marginTop: '25px', marginBottom: '20px' },
    tab: (isActive) => ({ padding: '10px 20px', cursor: 'pointer', borderBottom: isActive ? '3px solid #f05a28' : 'none', color: isActive ? '#f05a28' : '#555', fontWeight: isActive ? 'bold' : 'normal' }),
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    th: { background: '#f4f4f4', padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontSize: '13px', color: '#666' },
    td: { padding: '12px 10px', border: '1px solid #ddd', fontSize: '14px' },
    toggleLabel: (isOn) => ({ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', color: 'white', background: isOn ? '#4cd964' : '#ff3b30', marginLeft: '8px' })
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Salesforce Switch</h1>
      <p style={styles.subtitle}>
        This tool provides an interface to easily enable and disable components in your Salesforce Org - Workflows, Triggers and Validation Rules.
      </p>

      {/* 🛠️ 2. FIXED SUCCESS BANNER STYLING: Dynamically swaps to green background for successful deployments */}
      {message && (
        <div style={{ 
          ...styles.banner, 
          background: message.includes('Error') || message.includes('failed') ? '#fdf2f2' : '#edfbf2', 
          color: message.includes('Error') || message.includes('failed') ? '#9c1c1c' : '#1c7a3c', 
          border: message.includes('Error') || message.includes('failed') ? '1px solid #f5c6c6' : '1px solid #d6e9c6' 
        }}>
          {message}
        </div>
      )}

      {!session ? (
        <div style={styles.loginBox}>
          <p style={{ marginBottom: '20px', color: '#666' }}>Please login to fetch and manage your Salesforce environment components:</p>
          <button style={styles.loginBtn} onClick={handleLogin}>LOGIN</button>
        </div>
      ) : (
        <div>
          <div style={styles.sessionInfo}>
            <div>
              <strong>Logged in as:</strong> <span style={{ marginLeft: '10px', color: '#333' }}>{session.username}</span>
            </div>
            <div>
              <button style={{ ...styles.btn, background: '#666' }} onClick={logout}>LOGOUT</button>
              <button style={styles.btn} onClick={fetchValidationRules}>GET ME DATA</button>
            </div>
          </div>

          {loading && <div style={{ color: '#f05a28', fontWeight: 'bold', margin: '15px 0' }}>Processing data stream...</div>}

          <div style={styles.tabBar}>
            {['Validation Rules', 'Workflows', 'Process Flows', 'Triggers'].map(tab => (
              <div key={tab} style={styles.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                {tab}
              </div>
            ))}
          </div>

          {activeTab === 'Validation Rules' && rules.length > 0 && (
            <div>
              <div style={{ margin: '20px 0', display: 'flex', gap: '5px' }}>
                <button style={{ ...styles.btn, background: '#4cd964' }} onClick={() => handleToggleAll(true)}>ENABLE ALL</button>
                <button style={{ ...styles.btn, background: '#ff3b30' }} onClick={() => handleToggleAll(false)}>DISABLE ALL</button>
                <button style={{ ...styles.btn, background: '#0070d2' }} onClick={deployChanges}>DEPLOY CHANGES</button>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: '25%' }}>Object</th>
                    <th style={{ ...styles.th, width: '50%' }}>Validation Rule Name</th>
                    <th style={{ ...styles.th, width: '25%' }}>Active State</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.Id}>
                      <td style={styles.td}>Account</td>
                      <td style={styles.td}><strong>{rule.ValidationName}</strong></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={rule.Active} 
                            onChange={() => handleToggleSingle(rule.Id)} 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={styles.toggleLabel(rule.Active)}>{rule.Active ? 'ON' : 'OFF'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;