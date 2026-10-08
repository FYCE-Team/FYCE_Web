import { createServer } from "node:http";

export const createHttpServer = app => createServer({
  headersTimeout: 15000,
  requestTimeout: 120000,
  keepAliveTimeout: 5000,
  connectionsCheckingInterval: 1000,
  maxHeaderSize: 16 * 1024
}, app);
