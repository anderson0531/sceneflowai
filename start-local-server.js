#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html for root
    if (pathname === '/') {
        pathname = '/test-local.html';
    }
    
    // Remove leading slash
    const filePath = path.join(__dirname, pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Get file extension
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Read file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Internal server error');
            }
            return;
        }
        
        // Set headers
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': data.length,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 SceneFlow AI Local Test Server running at:`);
    console.log(`   🌐 http://localhost:${PORT}`);
    console.log(`   📁 Test Environment: http://localhost:${PORT}/test-local.html`);
    console.log(`   🔐 Auth Test: http://localhost:${PORT}/test-auth.html`);
    console.log(`   📱 Main App: http://localhost:${PORT}/index.html`);
    console.log(``);
    console.log(`Press Ctrl+C to stop the server`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

// Error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the other server or use a different port.`);
    } else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});

