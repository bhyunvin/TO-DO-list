import 'reflect-metadata';
import { config } from 'dotenv';
import path from 'node:path';

// Load environment variables from specific test file
// This ensures env vars are available before any app code imports
config({ path: path.join(import.meta.dir, '../../.env.test') });
