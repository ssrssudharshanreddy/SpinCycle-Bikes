/**
 * SpinCycle Bikes – Express Application Server
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 1: Sirigineedi Venkata Rama Kishore (Reg. No: 252U1R1230)
 * Responsibility: Server and Routes
 *
 * This module initializes the Express server, configures JSON middleware,
 * mounts the application routes, registers 404 and centralized error handlers,
 * and starts the server with SQLite database verification.
 */

const express = require('express');
const apiRoutes = require('./routes');
const { initializeDatabase, getOne } = require('./database/database');

const app = express();
const PORT = 3000;

// ==========================================
// 1. Middleware Configuration
// ==========================================
app.use(express.json());

// ==========================================
// 2. Application Route Mounting
// ==========================================
app.use(apiRoutes);

// ==========================================
// 3. 404 Not Found Handler
// ==========================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// 4. Centralized Error Handling Middleware
// ==========================================
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload in request body.',
    });
  }

  console.error('Unhandled server error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const safeMessage =
    statusCode >= 500 ? 'Internal server error.' : err.message || 'Request failed.';

  return res.status(statusCode).json({
    success: false,
    error: safeMessage,
  });
});

// ==========================================
// 5. Database Verification & Server Startup
// ==========================================
async function startServer() {
  try {
    await initializeDatabase();
    await getOne('SELECT 1 AS ok');
    console.log('SQLite database connection verified.');

    const server = app.listen(PORT, () => {
      console.log(`SpinCycle Bikes server listening on http://localhost:${PORT}`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start SpinCycle Bikes server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
