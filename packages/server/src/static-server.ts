
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/**
 * MIME types for common web files.
 */
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

/**
 * Start a static file server.
 * 
 * @param rootPath Path to the static files directory
 * @param port Port to listen on
 */
export function startStaticServer(rootPath: string, port: number): http.Server {
    const server = http.createServer((req, res) => {
        // Handle only GET requests
        if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
        }

        // Parse URL
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        let filePath = path.join(rootPath, url.pathname);

        // Prevent directory traversal
        if (!filePath.startsWith(rootPath)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
        }

        // Default to index.html for root
        if (filePath === rootPath || filePath.endsWith('/')) {
            filePath = path.join(filePath, 'index.html');
        }

        // Check if file exists
        fs.stat(filePath, (err, stats) => {
            if (err) {
                // If file not found, try serving index.html (SPA fallback)
                // But only if it's not looking for a specific file extension (like .js or .css)
                if (err.code === 'ENOENT' && !path.extname(url.pathname)) {
                    const indexPath = path.join(rootPath, 'index.html');
                    fs.stat(indexPath, (err2, stats2) => {
                        if (err2) {
                            res.statusCode = 404;
                            res.end('Not Found');
                        } else {
                            serveFile(res, indexPath);
                        }
                    });
                } else {
                    res.statusCode = 404;
                    res.end('Not Found');
                }
                return;
            }

            if (stats.isDirectory()) {
                // Try index.html in subdirectories
                const indexPath = path.join(filePath, 'index.html');
                fs.stat(indexPath, (err2, stats2) => {
                    if (err2) {
                        res.statusCode = 403;
                        res.end('Directory Listing Forbidden');
                    } else {
                        serveFile(res, indexPath);
                    }
                });
                return;
            }

            serveFile(res, filePath);
        });
    });

    server.listen(port, () => {
        console.log(`[Server] Dashboard available at http://localhost:${port}`);
    });

    return server;
}

/**
 * Serve a file to the response.
 */
function serveFile(res: http.ServerResponse, filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);

    // Set cache headers - no cache for html, long cache for hashed assets
    if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
}
