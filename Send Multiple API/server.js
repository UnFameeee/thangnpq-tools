const express = require('express');
const path = require('path');
const helmet = require('helmet');
const axios = require('axios');
const fs = require('fs').promises;
const app = express();
const port = 7449;

// Use Helmet middleware with custom CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the different directories
app.use('/main', express.static(path.join(__dirname, 'MainScreen')));
app.use('/api-request-sender', express.static(path.join(__dirname, 'APIRequestSender')));
app.use('/proxy-management', express.static(path.join(__dirname, 'ProxyManagement')));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'MainScreen', 'index.html'));
});

// Route for the API Request Sender page
app.get('/api-request-sender', (req, res) => {
    res.sendFile(path.join(__dirname, 'APIRequestSender', 'index.html'));
});

// Route for the Proxy Management page
app.get('/proxy-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'ProxyManagement', 'index.html'));
});

// API proxy route
app.post('/api-proxy', async (req, res) => {
    const { url, method, headers, data } = req.body;
    try {
        const response = await axios({
            url,
            method,
            headers,
            data
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
    }
});

// Route for saving data
app.post('/save-data', express.json(), async (req, res) => {
    const { filename, data } = req.body;
    try {
        await fs.writeFile(path.join(__dirname, 'Website', `${filename}.txt`), JSON.stringify(data));
        res.json({ message: 'Data saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error saving data' });
    }
});

// Update the load-data route
app.get('/load-data', async (req, res) => {
    const { filename } = req.query;
    try {
        const data = await fs.readFile(path.join(__dirname, 'APIRequestSender', 'data', `${filename}`), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
        } else {
            console.error('Error loading data:', error);
            res.status(500).json({ error: 'Error loading data' });
        }
    }
});

// Update the list-files route
app.get('/list-files', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'APIRequestSender', 'data'));
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        res.json(jsonFiles);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Error listing files' });
    }
});

// Update the save-data route
app.post('/api/save-data', express.json(), async (req, res) => {
    const { filename, data } = req.body;
    try {
        const dataDir = path.join(__dirname, 'APIRequestSender', 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
        res.json({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Error saving data' });
    }
});

// API to load data
app.get('/api/load-data', async (req, res) => {
    const { filename } = req.query;
    try {
        const data = await fs.readFile(path.join(__dirname, 'APIRequestSender', `${filename}.json`), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
        } else {
            res.status(500).json({ error: 'Error loading data' });
        }
    }
});

// API to list files
app.get('/api/list-files', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'APIRequestSender', 'data'));
        const jsonFiles = files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
        res.json(jsonFiles);
    } catch (error) {
        res.status(500).json({ error: 'Error listing files' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
