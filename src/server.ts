import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const isDev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`[3A Game Master] Starting server...`);
console.log(`[3A Game Master] NODE_ENV=${process.env.NODE_ENV || '(not set)'}`);
console.log(`[3A Game Master] PORT=${port}`);
console.log(`[3A Game Master] DATABASE_URL=${process.env.DATABASE_URL ? '***configured***' : '(not set)'}`);
console.log(`[3A Game Master] R2_BUCKET=${process.env.R2_BUCKET || '(not set)'}`);
console.log(`[3A Game Master] COZE_WORKLOAD_IDENTITY_API_KEY=${process.env.COZE_WORKLOAD_IDENTITY_API_KEY ? '***configured***' : '(not set)'}`);

// Create Next.js app
const app = next({ dev: isDev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`> 3A Game Master ready on http://${hostname}:${port} (${isDev ? 'development' : 'production'})`);
  });
});
