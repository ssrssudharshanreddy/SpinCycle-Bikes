/**
 * SpinCycle Bikes – REST Endpoint Handlers Module
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 3: Settipalli Dinesh Kumar (Reg. No: 252U1R1227)
 * Responsibility: REST Endpoints
 *
 * This module implements the business logic and database interactions for all
 * REST API endpoints: Health, Bikes (CRUD), Riders, and Rentals (with INNER JOIN).
 */

const { getAll, getOne, runQuery } = require('./database/database');
const {
  parsePositiveIntId,
  parsePositiveIntField,
  validateBikePayload,
  validateRiderPayload,
  validateRentalDate,
  buildBikeTypeSearchClause,
} = require('./validation');
const { parseBikeQueryParams, buildPaginationMetadata } = require('./pagination');

// ==========================================
// 1. Health-Check Endpoint
// ==========================================

/**
 * GET /health - Check server and SQLite database connectivity.
 */
async function getHealth(req, res) {
  try {
    await getOne('SELECT 1 AS ok');
    return res.status(200).json({
      success: true,
      message: 'SpinCycle Bikes API is running',
      database: 'connected',
    });
  } catch (err) {
    console.error('Database health check failed:', err);
    return res.status(503).json({
      success: false,
      message: 'SpinCycle Bikes API is running, but database is unavailable',
      database: 'disconnected',
    });
  }
}

// ==========================================
// 2. Bikes CRUD Endpoints
// ==========================================

/**
 * GET /bikes - Retrieve bikes with search (?type=) and pagination (?page=&limit=).
 */
async function getBikes(req, res, next) {
  try {
    const parsedQuery = parseBikeQueryParams(req.query);
    if (parsedQuery.error) {
      return res.status(400).json({
        success: false,
        error: parsedQuery.error,
      });
    }

    const { typeFilter, page, limit, offset } = parsedQuery;
    const { whereClause, filterParams } = buildBikeTypeSearchClause(typeFilter);

    const countRow = await getOne(
      `SELECT COUNT(*) AS totalRecords FROM bikes ${whereClause}`,
      filterParams
    );
    const totalRecords = countRow ? countRow.totalRecords : 0;
    const paginationMeta = buildPaginationMetadata(totalRecords, page, limit);

    const bikes = await getAll(
      `SELECT bike_id, bike_name, bike_type
       FROM bikes
       ${whereClause}
       ORDER BY bike_id ASC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    return res.status(200).json({
      success: true,
      count: bikes.length,
      page: paginationMeta.page,
      limit: paginationMeta.limit,
      totalRecords: paginationMeta.totalRecords,
      totalPages: paginationMeta.totalPages,
      data: bikes,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /bikes/:id - Retrieve a single bike by bike_id.
 */
async function getBikeById(req, res, next) {
  try {
    const bikeId = parsePositiveIntId(req.params.id);
    if (!bikeId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bike ID. ID must be a positive integer.',
      });
    }

    const bike = await getOne(
      'SELECT bike_id, bike_name, bike_type FROM bikes WHERE bike_id = ?',
      [bikeId]
    );
    if (!bike) {
      return res.status(404).json({
        success: false,
        error: `Bike with ID ${bikeId} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: bike,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /bikes - Add a new bicycle to the inventory.
 */
async function createBike(req, res, next) {
  try {
    const validation = validateBikePayload(req.body);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const result = await runQuery(
      'INSERT INTO bikes (bike_name, bike_type) VALUES (?, ?)',
      [validation.bikeName, validation.bikeType]
    );

    const createdBike = await getOne(
      'SELECT bike_id, bike_name, bike_type FROM bikes WHERE bike_id = ?',
      [result.lastID]
    );

    return res.status(201).json({
      success: true,
      message: 'Bike created successfully.',
      data: createdBike,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /bikes/:id - Update an existing bicycle's details.
 */
async function updateBike(req, res, next) {
  try {
    const bikeId = parsePositiveIntId(req.params.id);
    if (!bikeId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bike ID. ID must be a positive integer.',
      });
    }

    const validation = validateBikePayload(req.body);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const existingBike = await getOne(
      'SELECT bike_id FROM bikes WHERE bike_id = ?',
      [bikeId]
    );
    if (!existingBike) {
      return res.status(404).json({
        success: false,
        error: `Bike with ID ${bikeId} not found.`,
      });
    }

    await runQuery(
      'UPDATE bikes SET bike_name = ?, bike_type = ? WHERE bike_id = ?',
      [validation.bikeName, validation.bikeType, bikeId]
    );

    const updatedBike = await getOne(
      'SELECT bike_id, bike_name, bike_type FROM bikes WHERE bike_id = ?',
      [bikeId]
    );

    return res.status(200).json({
      success: true,
      message: 'Bike updated successfully.',
      data: updatedBike,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /bikes/:id - Delete an unreferenced bicycle (preserves rental history).
 */
async function deleteBike(req, res, next) {
  try {
    const bikeId = parsePositiveIntId(req.params.id);
    if (!bikeId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bike ID. ID must be a positive integer.',
      });
    }

    const existingBike = await getOne(
      'SELECT bike_id, bike_name, bike_type FROM bikes WHERE bike_id = ?',
      [bikeId]
    );
    if (!existingBike) {
      return res.status(404).json({
        success: false,
        error: `Bike with ID ${bikeId} not found.`,
      });
    }

    // Preservation rule: Block deletion if referenced by existing rental history
    const rentalRef = await getOne(
      'SELECT COUNT(*) AS count FROM rentals WHERE bike_id = ?',
      [bikeId]
    );
    if (rentalRef && rentalRef.count > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete bike with ID ${bikeId} because it is referenced by existing rental history.`,
      });
    }

    await runQuery('DELETE FROM bikes WHERE bike_id = ?', [bikeId]);

    return res.status(200).json({
      success: true,
      message: 'Bike deleted successfully.',
      data: existingBike,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete bike because it is referenced by existing rental history.',
      });
    }
    return next(err);
  }
}

// ==========================================
// 3. Riders Endpoints
// ==========================================

/**
 * GET /riders - Retrieve all registered student riders.
 */
async function getRiders(req, res, next) {
  try {
    const riders = await getAll(
      'SELECT rider_id, rider_name, student_id, phone FROM riders ORDER BY rider_id ASC'
    );
    return res.status(200).json({
      success: true,
      count: riders.length,
      data: riders,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /riders/:id - Retrieve a single rider by rider_id.
 */
async function getRiderById(req, res, next) {
  try {
    const riderId = parsePositiveIntId(req.params.id);
    if (!riderId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider ID. ID must be a positive integer.',
      });
    }

    const rider = await getOne(
      'SELECT rider_id, rider_name, student_id, phone FROM riders WHERE rider_id = ?',
      [riderId]
    );
    if (!rider) {
      return res.status(404).json({
        success: false,
        error: `Rider with ID ${riderId} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: rider,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /riders - Register a new rider with unique student_id check.
 */
async function createRider(req, res, next) {
  try {
    const validation = validateRiderPayload(req.body);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const duplicateRider = await getOne(
      'SELECT rider_id FROM riders WHERE student_id = ?',
      [validation.studentId]
    );
    if (duplicateRider) {
      return res.status(409).json({
        success: false,
        error: `Rider with student_id '${validation.studentId}' already exists.`,
      });
    }

    const result = await runQuery(
      'INSERT INTO riders (rider_name, student_id, phone) VALUES (?, ?, ?)',
      [validation.riderName, validation.studentId, validation.phone]
    );

    const createdRider = await getOne(
      'SELECT rider_id, rider_name, student_id, phone FROM riders WHERE rider_id = ?',
      [result.lastID]
    );

    return res.status(201).json({
      success: true,
      message: 'Rider registered successfully.',
      data: createdRider,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({
        success: false,
        error: 'Rider with this student_id already exists.',
      });
    }
    return next(err);
  }
}

// ==========================================
// 4. Rentals Endpoints (SQL INNER JOIN)
// ==========================================

/**
 * GET /rentals - Retrieve all rentals enriched with rider_name and bike_name using SQL INNER JOIN.
 */
async function getRentals(req, res, next) {
  try {
    const rentals = await getAll(`
      SELECT
        r.rental_id,
        r.rider_id,
        ri.rider_name,
        r.bike_id,
        b.bike_name,
        r.rental_date,
        r.return_date,
        r.rental_status
      FROM rentals r
      INNER JOIN riders ri ON r.rider_id = ri.rider_id
      INNER JOIN bikes b ON r.bike_id = b.bike_id
      ORDER BY r.rental_id ASC
    `);

    return res.status(200).json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /rentals - Create a new active rental, checking rider/bike existence and active conflict.
 */
async function createRental(req, res, next) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a valid JSON object.',
      });
    }

    const riderId = parsePositiveIntField(body.rider_id);
    if (!riderId) {
      return res.status(400).json({
        success: false,
        error: 'rider_id is required and must be a positive integer.',
      });
    }

    const bikeId = parsePositiveIntField(body.bike_id);
    if (!bikeId) {
      return res.status(400).json({
        success: false,
        error: 'bike_id is required and must be a positive integer.',
      });
    }

    const rentalDate = validateRentalDate(body.rental_date);
    if (!rentalDate) {
      return res.status(400).json({
        success: false,
        error:
          'rental_date is required and must be a valid date string (e.g., YYYY-MM-DD HH:MM:SS).',
      });
    }

    const existingRider = await getOne(
      'SELECT rider_id FROM riders WHERE rider_id = ?',
      [riderId]
    );
    if (!existingRider) {
      return res.status(404).json({
        success: false,
        error: `Rider with ID ${riderId} not found.`,
      });
    }

    const existingBike = await getOne(
      'SELECT bike_id FROM bikes WHERE bike_id = ?',
      [bikeId]
    );
    if (!existingBike) {
      return res.status(404).json({
        success: false,
        error: `Bike with ID ${bikeId} not found.`,
      });
    }

    // Active conflict rule: Ensure the bike does not already have an active rental
    const activeRental = await getOne(
      "SELECT rental_id FROM rentals WHERE bike_id = ? AND rental_status = 'active' LIMIT 1",
      [bikeId]
    );
    if (activeRental) {
      return res.status(409).json({
        success: false,
        error: `Bike with ID ${bikeId} already has an active rental.`,
      });
    }

    const result = await runQuery(
      `INSERT INTO rentals (rider_id, bike_id, rental_date, return_date, rental_status)
       VALUES (?, ?, ?, ?, ?)`,
      [riderId, bikeId, rentalDate, null, 'active']
    );

    const createdRental = await getOne(
      `SELECT
         r.rental_id,
         r.rider_id,
         ri.rider_name,
         r.bike_id,
         b.bike_name,
         r.rental_date,
         r.return_date,
         r.rental_status
       FROM rentals r
       INNER JOIN riders ri ON r.rider_id = ri.rider_id
       INNER JOIN bikes b ON r.bike_id = b.bike_id
       WHERE r.rental_id = ?`,
      [result.lastID]
    );

    return res.status(201).json({
      success: true,
      message: 'Rental created successfully.',
      data: createdRental,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider_id or bike_id reference.',
      });
    }
    return next(err);
  }
}

module.exports = {
  getHealth,
  getBikes,
  getBikeById,
  createBike,
  updateBike,
  deleteBike,
  getRiders,
  getRiderById,
  createRider,
  getRentals,
  createRental,
};

