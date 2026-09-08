/** Import this FIRST in CLI entry points: loads .env before any other module reads process.env. */
process.loadEnvFile?.(".env");
export {};
