import { SERVER_DEFAULTS } from '@chronoscribe/shared';
import { startServer } from './index.js';

const port = process.env['CHRONOSCRIBE_PORT']
    ? parseInt(process.env['CHRONOSCRIBE_PORT'], 10)
    : SERVER_DEFAULTS.WS_PORT;

startServer({ wsPort: port });
