import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import formidable from 'formidable'

function localManualSaverPlugin() {
  return {
    name: 'local-manual-saver',
    configureServer(server) {
      server.middlewares.use('/api/list-local-manuals', (req, res) => {
        if (req.method === 'GET') {
          try {
            const manualsDir = path.resolve(process.cwd(), 'local_manuals');
            if (!fs.existsSync(manualsDir)) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, files: [] }));
              return;
            }

            const files = fs.readdirSync(manualsDir).map(name => {
              const fullPath = path.join(manualsDir, name);
              const stats = fs.statSync(fullPath);
              const ext = path.extname(name).replace('.', '').toLowerCase();
              let manualTitle = '';

              if (ext === 'json') {
                try {
                  const raw = fs.readFileSync(fullPath, 'utf-8');
                  const parsed = JSON.parse(raw);
                  manualTitle = parsed?.title || parsed?.content?.title || '';
                } catch {
                  // ignore malformed json and fallback to filename
                }
              }

              return {
                name,
                path: fullPath,
                size: stats.size,
                createdAt: stats.birthtime.toISOString(),
                updatedAt: stats.mtime.toISOString(),
                type: ext,
                manualTitle
              };
            });

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, files }));
          } catch (err) {
            console.error('List manuals error:', err);
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }
      });

      server.middlewares.use('/api/save-manual-local', (req, res) => {
        if (req.method === 'POST') {
          const manualsDir = path.resolve(process.cwd(), 'local_manuals');
          if (!fs.existsSync(manualsDir)) {
            fs.mkdirSync(manualsDir, { recursive: true });
          }

          const readFieldValue = (fieldValue, fallback = '') => {
            if (Array.isArray(fieldValue)) return fieldValue[0] ?? fallback;
            if (fieldValue === undefined || fieldValue === null) return fallback;
            return fieldValue;
          };

          // Handle multipart/form-data (for ZIP/Video/JSON files)
          if (req.headers['content-type']?.includes('multipart/form-data')) {
            const form = formidable({
              uploadDir: manualsDir,
              keepExtensions: true,
              maxFileSize: 10 * 1024 * 1024 * 1024 // 10 GB limits for safety
            });

            form.parse(req, (err, fields, files) => {
              if (err) {
                console.error('Formidable parse err:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
                return;
              }

              try {
                const savedFiles = [];

                let titleFromJsonData = '';
                const incomingJsonData = readFieldValue(fields?.jsonData, null);
                if (incomingJsonData) {
                  try {
                    const parsed = JSON.parse(incomingJsonData);
                    titleFromJsonData = String(parsed?.title || parsed?.content?.title || '').trim();
                  } catch {
                    // ignore
                  }
                }

                // Move and rename all sent files to readable names based on fields.id or original name
                const baseName = titleFromJsonData || readFieldValue(fields?.fileName) || readFieldValue(fields?.id) || `manual_${Date.now()}`;
                const safeBase = String(baseName).replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_json$/, ''); // strip accidental _json suffix

                Object.keys(files || {}).forEach((formField) => {
                  const fileEntry = files[formField];
                  const fileList = Array.isArray(fileEntry) ? fileEntry : [fileEntry];

                  fileList.filter(Boolean).forEach(f => {
                    const ext = path.extname(f.originalFilename || f.newFilename || '');
                    const isZip = ext === '.zip';
                    const isVideo = ext === '.mp4' || ext === '.webm' || ext === '.mov';
                    const isJson = formField === 'jsonData' || ext === '.json';

                    let finalExt = ext;
                    if (isJson && !ext) finalExt = '.json';

                    const finalName = `${safeBase}${isVideo ? '_video' : isZip ? '_package' : ''}${finalExt}`;
                    const targetPath = path.join(manualsDir, finalName);

                    fs.renameSync(f.filepath, targetPath);
                    savedFiles.push(targetPath);
                  });
                });

                // Also save JSON data string if provided in fields
                const jsonDataField = incomingJsonData;
                if (jsonDataField) {
                  const jsonFileTarget = path.join(manualsDir, `${safeBase}.json`);
                  fs.writeFileSync(jsonFileTarget, jsonDataField, 'utf-8');
                  savedFiles.push(jsonFileTarget);
                }

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, message: `Saved locally`, files: savedFiles }));
              } catch (processingError) {
                console.error('Local manual save processing error:', processingError);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: processingError?.message || 'Failed to process local save request' }));
              }
            });
            return;
          }

          // Fallback for simple JSON POST as before
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const titleBase = String(parsed?.data?.title || parsed?.title || '').trim();
              const normalizedTitle = titleBase
                ? titleBase.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_json$/, '')
                : null;
              const fileName = parsed.fileName || (normalizedTitle ? `${normalizedTitle}.json` : `manual_${Date.now()}.json`);
              const fileContent = parsed.data ? JSON.stringify(parsed.data, null, 2) : JSON.stringify(parsed, null, 2);
              const filePath = path.join(manualsDir, fileName);

              fs.writeFileSync(filePath, fileContent, 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: `Saved locally to ${filePath}`, path: filePath }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
        }
      });

      server.middlewares.use('/api/delete-local-manual', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const { fileName } = JSON.parse(body);
              if (fileName) {
                const filePath = path.join(path.resolve(process.cwd(), 'local_manuals'), fileName);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Deleted' }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        }
      });

      server.middlewares.use('/local_manuals', (req, res, next) => {
        const filePath = path.join(path.resolve(process.cwd(), 'local_manuals'), req.url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        } else {
          next();
        }
      });
    }
  }
}

const enableCrossOriginIsolation = process.env.VITE_ENABLE_OPFS === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localManualSaverPlugin()],
  // Tauri-specific configuration
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    headers: enableCrossOriginIsolation
      ? {
        // Required for SharedArrayBuffer/Atomics and OPFS in sqlite-wasm.
        // Enable with: VITE_ENABLE_OPFS=true npm run dev
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
      : {
        // Jitsi iframe (meet.jit.si) can fail/blank when dev server is
        // cross-origin isolated. Keep COOP/COEP relaxed in dev so external
        // conferencing iframe can be embedded reliably.
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
  },
  optimizeDeps: {
    // Keep sqlite wasm out of pre-bundling due worker/runtime specifics.
    exclude: ['@sqlite.org/sqlite-wasm', '@tauri-apps/api', '@tauri-apps/api/core'],
    // Explicitly pre-bundle packages that benefit from optimization,
    // including MediaPipe modules required by tfjs pose-detection.
    include: [
      'reactflow',
      'html2canvas',
      'zustand',
      'use-sync-external-store/shim/with-selector',
      'driver.js',
      'peerjs',
      // ManualCreation uses both static and dynamic imports for QR utilities.
      // Pin these in optimized deps to avoid stale/outdated dep artifacts
      // such as: qrcode__react.js 504 (Outdated Optimize Dep).
      'qrcode.react',
      'qrcode',
      '@mediapipe/hands',
      '@mediapipe/pose',
      // Studio Model state machine dependencies; pre-bundle to prevent
      // transient "Outdated Optimize Dep" fetch errors in dev.
      'xstate',
      '@xstate/react',
    ],
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
