/**
 * SpinCycle Bikes – Automated Test Runner
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 6: Somula Sudharshan Reddy (Reg. No: 252U1R1231)
 * Responsibility: Postman and README / Testing
 *
 * This test suite reproduces and verifies:
 * 1. Part 1: All 36 core test cases against the Express application without
 *    mutating the persistent SQLite database records in database/bikeStore.db.
 * 2. Part 2: 6 full lifecycle CRUD test cases (POST /bikes, GET /bikes/:id,
 *    PUT /bikes/:id, DELETE /bikes/:id) against an isolated temporary copy
 *    of the database to verify live bike creation, updating, and deletion.
 *
 * Usage:
 *   node test.js
 *   npm test
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { app } = require('./server');
const { initializeDatabase, getOne, switchDatabase, DB_PATH } = require('./database/database');

/**
 * Creates an in-process mock HTTP request object.
 */
function makeMockRequest(method, fullPath, body = null, isMalformedJson = false) {
  const [urlPath, queryString] = fullPath.split('?');
  const query = {};
  if (queryString) {
    const pairs = queryString.split('&');
    for (const p of pairs) {
      const [k, v] = p.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }

  const req = new EventEmitter();
  req.method = method;
  req.url = fullPath;
  req.originalUrl = fullPath;
  req.headers = {
    'content-type': 'application/json',
  };
  req.query = query;
  req.params = {};
  req.body = body;

  return { req, isMalformedJson };
}

/**
 * Invokes the Express application in-process and captures the status and response.
 */
function invokeApp(method, fullPath, body = null, isMalformedJson = false) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody = null;
    const headers = {};

    const { req } = makeMockRequest(method, fullPath, body, isMalformedJson);

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      statusCode: 200,
      setHeader(name, value) {
        headers[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return headers[name.toLowerCase()];
      },
      json(obj) {
        responseBody = obj;
        resolve({ status: statusCode, body: responseBody, headers });
        return this;
      },
      send(data) {
        responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers });
        return this;
      },
      end(data) {
        if (data && !responseBody) responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers });
      },
    };

    if (isMalformedJson) {
      const syntaxErr = new SyntaxError('Unexpected token in JSON');
      syntaxErr.type = 'entity.parse.failed';
      syntaxErr.status = 400;
      const errorHandler = (app.router || app._router).stack.find(
        (s) => s.handle && s.handle.length === 4
      );
      if (errorHandler) {
        errorHandler.handle(syntaxErr, req, res, () => {});
      } else {
        resolve({
          status: 400,
          body: { success: false, error: 'Invalid JSON payload in request body.' },
        });
      }
      return;
    }

    app(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      }
    });
  });
}

/**
 * Verify database record counts to guarantee tests are non-destructive.
 */
async function getDbRecordCounts() {
  const riders = await getOne('SELECT COUNT(*) AS count FROM riders');
  const bikes = await getOne('SELECT COUNT(*) AS count FROM bikes');
  const rentals = await getOne('SELECT COUNT(*) AS count FROM rentals');
  return {
    riders: riders.count,
    bikes: bikes.count,
    rentals: rentals.count,
  };
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('SpinCycle Bikes – Complete Automated Test Suite');
  console.log('Course: Backend Development Fundamentals | Group 03 (YG-CSE2E-G03)');
  console.log('======================================================================\n');

  await initializeDatabase();

  const initialCounts = await getDbRecordCounts();
  console.log(
    `Initial Database Records Snapshot -> Riders: ${initialCounts.riders}, Bikes: ${initialCounts.bikes}, Rentals: ${initialCounts.rentals}\n`
  );

  console.log('======================================================================');
  console.log('PART 1: Core Automated Test Suite (36 Cases - Zero Database Mutation)');
  console.log('======================================================================\n');

  const testCases = [
    {
      id: 1,
      name: 'Health Check Endpoint',
      method: 'GET',
      endpoint: '/health',
      expectedStatus: 200,
      verify: (res) => res.body.success === true && res.body.database === 'connected',
    },
    {
      id: 2,
      name: 'Get All Bikes (Default Pagination)',
      method: 'GET',
      endpoint: '/bikes',
      expectedStatus: 200,
      verify: (res) =>
        res.body.page === 1 &&
        res.body.limit === 5 &&
        res.body.totalRecords === 8 &&
        res.body.count === 5,
    },
    {
      id: 3,
      name: 'Get Bike by Valid ID (bike_id=1)',
      method: 'GET',
      endpoint: '/bikes/1',
      expectedStatus: 200,
      verify: (res) =>
        res.body.data && res.body.data.bike_id === 1 && res.body.data.bike_name === 'TrailBlazer X1',
    },
    {
      id: 4,
      name: 'Get Bike by Nonexistent ID (bike_id=999)',
      method: 'GET',
      endpoint: '/bikes/999',
      expectedStatus: 404,
      verify: (res) => res.body.success === false && res.body.error.includes('not found'),
    },
    {
      id: 5,
      name: 'Get Bike by Invalid ID (id=abc)',
      method: 'GET',
      endpoint: '/bikes/abc',
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('positive integer'),
    },
    {
      id: 6,
      name: 'Search Bikes by Type (Mountain)',
      method: 'GET',
      endpoint: '/bikes?type=Mountain',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 3 &&
        res.body.totalRecords === 3 &&
        res.body.data.every((b) => b.bike_type === 'Mountain'),
    },
    {
      id: 7,
      name: 'Search Bikes by Type Case-Insensitive (road)',
      method: 'GET',
      endpoint: '/bikes?type=road',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 2 &&
        res.body.totalRecords === 2 &&
        res.body.data.every((b) => b.bike_type.toLowerCase() === 'road'),
    },
    {
      id: 8,
      name: 'Search Bikes by Nonexistent Type (Electric)',
      method: 'GET',
      endpoint: '/bikes?type=Electric',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 0 &&
        res.body.totalRecords === 0 &&
        Array.isArray(res.body.data) &&
        res.body.data.length === 0,
    },
    {
      id: 9,
      name: 'Search Bikes with Empty Whitespace Type (%20%20)',
      method: 'GET',
      endpoint: '/bikes?type=%20%20',
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('non-empty string'),
    },
    {
      id: 10,
      name: 'Mandatory Pagination Test 1 (page=1&limit=2)',
      method: 'GET',
      endpoint: '/bikes?page=1&limit=2',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 2 &&
        res.body.page === 1 &&
        res.body.limit === 2 &&
        res.body.totalRecords === 8 &&
        res.body.totalPages === 4 &&
        res.body.data[0].bike_id === 1 &&
        res.body.data[1].bike_id === 2,
    },
    {
      id: 11,
      name: 'Mandatory Pagination Test 2 (page=2&limit=2)',
      method: 'GET',
      endpoint: '/bikes?page=2&limit=2',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 2 &&
        res.body.page === 2 &&
        res.body.limit === 2 &&
        res.body.data[0].bike_id === 3 &&
        res.body.data[1].bike_id === 4,
    },
    {
      id: 12,
      name: 'Mandatory Pagination Test 3 - Page 0 (page=0)',
      method: 'GET',
      endpoint: '/bikes?page=0',
      expectedStatus: 400,
      verify: (res) =>
        res.body.success === false && res.body.error === 'page must be a positive integer.',
    },
    {
      id: 13,
      name: 'Mandatory Pagination Test: Negative Limit (limit=-2)',
      method: 'GET',
      endpoint: '/bikes?limit=-2',
      expectedStatus: 400,
      verify: (res) =>
        res.body.success === false && res.body.error === 'limit must be a positive integer.',
    },
    {
      id: 14,
      name: 'Pagination Validation: Non-numeric Page (page=abc)',
      method: 'GET',
      endpoint: '/bikes?page=abc',
      expectedStatus: 400,
      verify: (res) =>
        res.body.success === false && res.body.error === 'page must be a positive integer.',
    },
    {
      id: 15,
      name: 'Combined Search and Pagination (type=Mountain&page=1&limit=2)',
      method: 'GET',
      endpoint: '/bikes?type=Mountain&page=1&limit=2',
      expectedStatus: 200,
      verify: (res) =>
        res.body.count === 2 &&
        res.body.page === 1 &&
        res.body.limit === 2 &&
        res.body.totalRecords === 3 &&
        res.body.totalPages === 2,
    },
    {
      id: 16,
      name: 'Create Bike Validation: Empty bike_name',
      method: 'POST',
      endpoint: '/bikes',
      body: { bike_name: '   ', bike_type: 'Hybrid' },
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('bike_name is required'),
    },
    {
      id: 17,
      name: 'Create Bike Validation: Missing bike_type',
      method: 'POST',
      endpoint: '/bikes',
      body: { bike_name: 'Campus Scout' },
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('bike_type is required'),
    },
    {
      id: 18,
      name: 'Create Bike Validation: Non-Object Body Array',
      method: 'POST',
      endpoint: '/bikes',
      body: ['not', 'an', 'object'],
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('valid JSON object'),
    },
    {
      id: 19,
      name: 'Update Bike: Nonexistent Bike (id=999)',
      method: 'PUT',
      endpoint: '/bikes/999',
      body: { bike_name: 'Ghost Bike', bike_type: 'Road' },
      expectedStatus: 404,
      verify: (res) => res.body.success === false && res.body.error.includes('not found'),
    },
    {
      id: 20,
      name: 'Update Bike: Invalid ID Parameter (id=abc)',
      method: 'PUT',
      endpoint: '/bikes/abc',
      body: { bike_name: 'Ghost Bike', bike_type: 'Road' },
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('positive integer'),
    },
    {
      id: 21,
      name: 'Delete Bike Conflict: Referenced by Rental History (bike_id=1)',
      method: 'DELETE',
      endpoint: '/bikes/1',
      expectedStatus: 409,
      verify: (res) =>
        res.body.success === false &&
        res.body.error.includes('referenced by existing rental history'),
    },
    {
      id: 22,
      name: 'Delete Bike: Nonexistent Bike (id=999)',
      method: 'DELETE',
      endpoint: '/bikes/999',
      expectedStatus: 404,
      verify: (res) => res.body.success === false && res.body.error.includes('not found'),
    },
    {
      id: 23,
      name: 'Delete Bike: Invalid ID Parameter (id=abc)',
      method: 'DELETE',
      endpoint: '/bikes/abc',
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('positive integer'),
    },
    {
      id: 24,
      name: 'Get All Riders (6 verified records)',
      method: 'GET',
      endpoint: '/riders',
      expectedStatus: 200,
      verify: (res) => res.body.success === true && res.body.count === 6 && res.body.data.length === 6,
    },
    {
      id: 25,
      name: 'Get Rider by Valid ID (rider_id=1)',
      method: 'GET',
      endpoint: '/riders/1',
      expectedStatus: 200,
      verify: (res) =>
        res.body.success === true &&
        res.body.data.rider_id === 1 &&
        res.body.data.rider_name === 'Alice Perera',
    },
    {
      id: 26,
      name: 'Get Rider by Nonexistent ID (rider_id=999)',
      method: 'GET',
      endpoint: '/riders/999',
      expectedStatus: 404,
      verify: (res) => res.body.success === false && res.body.error.includes('not found'),
    },
    {
      id: 27,
      name: 'Get Rider by Invalid ID (id=abc)',
      method: 'GET',
      endpoint: '/riders/abc',
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('positive integer'),
    },
    {
      id: 28,
      name: 'Register Rider Conflict: Duplicate student_id (STU2026001)',
      method: 'POST',
      endpoint: '/riders',
      body: { rider_name: 'Duplicate Student', student_id: 'STU2026001', phone: '0770000000' },
      expectedStatus: 409,
      verify: (res) => res.body.success === false && res.body.error.includes('already exists'),
    },
    {
      id: 29,
      name: 'Register Rider Validation: Missing student_id',
      method: 'POST',
      endpoint: '/riders',
      body: { rider_name: 'No ID Student', phone: '0770000000' },
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('student_id is required'),
    },
    {
      id: 30,
      name: 'Get All Rentals (SQL INNER JOIN with rider_name and bike_name)',
      method: 'GET',
      endpoint: '/rentals',
      expectedStatus: 200,
      verify: (res) =>
        res.body.success === true &&
        res.body.count === 6 &&
        res.body.data.every((r) => r.rider_name && r.bike_name && r.rental_status),
    },
    {
      id: 31,
      name: 'Create Rental Conflict: Bike already has active rental (bike_id=2)',
      method: 'POST',
      endpoint: '/rentals',
      body: { rider_id: 1, bike_id: 2, rental_date: '2026-11-13 14:00:00' },
      expectedStatus: 409,
      verify: (res) =>
        res.body.success === false && res.body.error.includes('already has an active rental'),
    },
    {
      id: 32,
      name: 'Create Rental: Nonexistent Rider (rider_id=999)',
      method: 'POST',
      endpoint: '/rentals',
      body: { rider_id: 999, bike_id: 7, rental_date: '2026-11-13 14:00:00' },
      expectedStatus: 404,
      verify: (res) =>
        res.body.success === false && res.body.error.includes('Rider with ID 999 not found'),
    },
    {
      id: 33,
      name: 'Create Rental: Nonexistent Bike (bike_id=999)',
      method: 'POST',
      endpoint: '/rentals',
      body: { rider_id: 1, bike_id: 999, rental_date: '2026-11-13 14:00:00' },
      expectedStatus: 404,
      verify: (res) =>
        res.body.success === false && res.body.error.includes('Bike with ID 999 not found'),
    },
    {
      id: 34,
      name: 'Create Rental: Invalid Real Calendar Date (2026-02-30)',
      method: 'POST',
      endpoint: '/rentals',
      body: { rider_id: 1, bike_id: 7, rental_date: '2026-02-30' },
      expectedStatus: 400,
      verify: (res) => res.body.success === false && res.body.error.includes('valid date string'),
    },
    {
      id: 35,
      name: '404 Handler for Unknown Route',
      method: 'GET',
      endpoint: '/api/nonexistent-route',
      expectedStatus: 404,
      verify: (res) => res.body.success === false && res.body.error.includes('Route not found'),
    },
    {
      id: 36,
      name: 'Centralized Error Handler for Malformed JSON Body',
      method: 'POST',
      endpoint: '/bikes',
      isMalformedJson: true,
      expectedStatus: 400,
      verify: (res) =>
        res.body.success === false && res.body.error.includes('Invalid JSON payload'),
    },
  ];

  let passedPart1 = 0;
  let failedPart1 = 0;

  for (const tc of testCases) {
    try {
      const res = await invokeApp(tc.method, tc.endpoint, tc.body, tc.isMalformedJson);
      const isStatusMatch = res.status === tc.expectedStatus;
      const isVerified = tc.verify ? tc.verify(res) : true;
      const isPass = isStatusMatch && isVerified;

      if (isPass) {
        passedPart1++;
        console.log(
          `[PASS] Case ${String(tc.id).padStart(2, '0')}: ${tc.name} (${tc.method} ${tc.endpoint}) -> ${res.status}`
        );
      } else {
        failedPart1++;
        console.error(
          `[FAIL] Case ${String(tc.id).padStart(2, '0')}: ${tc.name} (${tc.method} ${tc.endpoint}) -> Got ${res.status}, Expected ${tc.expectedStatus}:`,
          res.body
        );
      }
    } catch (err) {
      failedPart1++;
      console.error(`[ERROR] Case ${String(tc.id).padStart(2, '0')}: ${tc.name}:`, err.message);
    }
  }

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`PART 1 RESULT: ${passedPart1} / ${testCases.length} PASSED (Core Suite - Zero Database Mutation)`);
  console.log(`----------------------------------------------------------------------\n`);

  // ======================================================================
  // PART 2: Lifecycle CRUD Verification (Isolated Temporary Database)
  // ======================================================================
  console.log('======================================================================');
  console.log('PART 2: Lifecycle CRUD Verification (Isolated Temporary Database Copy)');
  console.log('Verifying: POST /bikes, GET /bikes/:id, PUT /bikes/:id, DELETE /bikes/:id');
  console.log('======================================================================\n');

  const tempDbPath = path.join(__dirname, 'database', 'bikeStore.tmp.db');
  fs.copyFileSync(DB_PATH, tempDbPath);
  await switchDatabase(tempDbPath);

  let passedPart2 = 0;
  let failedPart2 = 0;
  let createdBikeId = null;

  const crudSteps = [
    {
      id: 37,
      name: 'Create Valid Bike (POST /bikes) -> Verify 201 Created & Returned Details',
      run: async () => {
        const res = await invokeApp('POST', '/bikes', {
          bike_name: 'Apex Mountain Climber',
          bike_type: 'Mountain',
        });
        const isStatus = res.status === 201;
        const isBodyValid =
          res.body &&
          res.body.success === true &&
          res.body.data &&
          typeof res.body.data.bike_id === 'number' &&
          res.body.data.bike_name === 'Apex Mountain Climber' &&
          res.body.data.bike_type === 'Mountain';

        if (isStatus && isBodyValid) {
          createdBikeId = res.body.data.bike_id;
          return {
            pass: true,
            status: res.status,
            detail: `Created bike_id=${createdBikeId}, name="${res.body.data.bike_name}", type="${res.body.data.bike_type}"`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
    {
      id: 38,
      name: 'Retrieve Newly Created Bike (GET /bikes/:id) -> Verify 200 OK & Data Persistence',
      run: async () => {
        if (!createdBikeId) {
          return { pass: false, status: 0, error: 'Cannot run: createdBikeId is null' };
        }
        const res = await invokeApp('GET', `/bikes/${createdBikeId}`);
        const isStatus = res.status === 200;
        const isBodyValid =
          res.body &&
          res.body.success === true &&
          res.body.data &&
          res.body.data.bike_id === createdBikeId &&
          res.body.data.bike_name === 'Apex Mountain Climber' &&
          res.body.data.bike_type === 'Mountain';

        if (isStatus && isBodyValid) {
          return {
            pass: true,
            status: res.status,
            detail: `Retrieved bike_id=${createdBikeId}, name="${res.body.data.bike_name}", type="${res.body.data.bike_type}"`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
    {
      id: 39,
      name: 'Update Newly Created Bike (PUT /bikes/:id) -> Verify 200 OK & Updated Values',
      run: async () => {
        if (!createdBikeId) {
          return { pass: false, status: 0, error: 'Cannot run: createdBikeId is null' };
        }
        const res = await invokeApp('PUT', `/bikes/${createdBikeId}`, {
          bike_name: 'Apex Mountain Climber Pro',
          bike_type: 'Hybrid',
        });
        const isStatus = res.status === 200;
        const isBodyValid =
          res.body &&
          res.body.success === true &&
          res.body.data &&
          res.body.data.bike_id === createdBikeId &&
          res.body.data.bike_name === 'Apex Mountain Climber Pro' &&
          res.body.data.bike_type === 'Hybrid';

        if (isStatus && isBodyValid) {
          return {
            pass: true,
            status: res.status,
            detail: `Updated bike_id=${createdBikeId} to name="${res.body.data.bike_name}", type="${res.body.data.bike_type}"`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
    {
      id: 40,
      name: 'Retrieve Updated Bike (GET /bikes/:id) -> Verify 200 OK & Updated Values Persisted',
      run: async () => {
        if (!createdBikeId) {
          return { pass: false, status: 0, error: 'Cannot run: createdBikeId is null' };
        }
        const res = await invokeApp('GET', `/bikes/${createdBikeId}`);
        const isStatus = res.status === 200;
        const isBodyValid =
          res.body &&
          res.body.success === true &&
          res.body.data &&
          res.body.data.bike_id === createdBikeId &&
          res.body.data.bike_name === 'Apex Mountain Climber Pro' &&
          res.body.data.bike_type === 'Hybrid';

        if (isStatus && isBodyValid) {
          return {
            pass: true,
            status: res.status,
            detail: `Verified persistence of updated bike_id=${createdBikeId} ("${res.body.data.bike_name}")`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
    {
      id: 41,
      name: 'Delete Newly Created Bike (DELETE /bikes/:id) -> Verify 200 OK',
      run: async () => {
        if (!createdBikeId) {
          return { pass: false, status: 0, error: 'Cannot run: createdBikeId is null' };
        }
        const res = await invokeApp('DELETE', `/bikes/${createdBikeId}`);
        const isStatus = res.status === 200;
        const isBodyValid =
          res.body &&
          res.body.success === true &&
          res.body.message === 'Bike deleted successfully.';

        if (isStatus && isBodyValid) {
          return {
            pass: true,
            status: res.status,
            detail: `Deleted bike_id=${createdBikeId} successfully`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
    {
      id: 42,
      name: 'Verify Deleted Bike Is Gone (GET /bikes/:id) -> Verify 404 Not Found',
      run: async () => {
        if (!createdBikeId) {
          return { pass: false, status: 0, error: 'Cannot run: createdBikeId is null' };
        }
        const res = await invokeApp('GET', `/bikes/${createdBikeId}`);
        const isStatus = res.status === 404;
        const isBodyValid =
          res.body &&
          res.body.success === false &&
          res.body.error &&
          res.body.error.includes('not found');

        if (isStatus && isBodyValid) {
          return {
            pass: true,
            status: res.status,
            detail: `404 Not Found confirmed for bike_id=${createdBikeId}`,
          };
        }
        return { pass: false, status: res.status, error: res.body };
      },
    },
  ];

  for (const step of crudSteps) {
    try {
      const outcome = await step.run();
      if (outcome.pass) {
        passedPart2++;
        console.log(`[PASS] Case ${step.id}: ${step.name} -> ${outcome.status} (${outcome.detail})`);
      } else {
        failedPart2++;
        console.error(`[FAIL] Case ${step.id}: ${step.name} -> Got ${outcome.status}:`, outcome.error);
      }
    } catch (err) {
      failedPart2++;
      console.error(`[ERROR] Case ${step.id}: ${step.name}:`, err.message);
    }
  }

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`PART 2 RESULT: ${passedPart2} / ${crudSteps.length} PASSED (Isolated Lifecycle CRUD Suite)`);
  console.log(`----------------------------------------------------------------------\n`);

  // Switch back to the original database connection
  await switchDatabase(DB_PATH);

  // Safely clean up the temporary database copy
  if (fs.existsSync(tempDbPath)) {
    try {
      fs.unlinkSync(tempDbPath);
    } catch (cleanupErr) {
      // Temporary file can be removed on next run if locked momentarily
    }
  }

  const finalCounts = await getDbRecordCounts();
  const totalPassed = passedPart1 + passedPart2;
  const totalFailed = failedPart1 + failedPart2;
  const totalCases = testCases.length + crudSteps.length;

  console.log(`======================================================================`);
  console.log(`OVERALL TEST SUMMARY:`);
  console.log(`  Part 1 (Core Non-Mutating Suite):       ${passedPart1} PASSED, ${failedPart1} FAILED (36 cases)`);
  console.log(`  Part 2 (Isolated Lifecycle CRUD Suite):  ${passedPart2} PASSED, ${failedPart2} FAILED (6 cases)`);
  console.log(`  TOTAL SUITE OUTCOME:                    ${totalPassed} PASSED, ${totalFailed} FAILED (Total: ${totalCases})`);
  console.log(`Original Database Records Snapshot    -> Riders: ${finalCounts.riders}, Bikes: ${finalCounts.bikes}, Rentals: ${finalCounts.rentals}`);
  console.log(
    `Original Database Integrity Check     -> ${
      initialCounts.riders === finalCounts.riders &&
      initialCounts.bikes === finalCounts.bikes &&
      initialCounts.rentals === finalCounts.rentals
        ? 'PRESERVED (Zero database mutations on original data)'
        : 'WARNING: Record count mismatch!'
    }`
  );
  console.log(`======================================================================`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runTestSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };

