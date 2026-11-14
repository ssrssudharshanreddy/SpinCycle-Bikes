/**
 * SpinCycle Bikes – Input Validation and Search Helper Module
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 4: Siddi Lakshmi Prasanna (Reg. No: 252U1R1229)
 * Responsibility: Input Validation and Bike Search
 *
 * This module provides reusable validation routines for IDs, request bodies,
 * dates, and search query parameters.
 */

/**
 * Parse and validate a positive integer ID from route parameters.
 * Accepts strings like "1", "24", rejects "0", "-5", "abc", decimals.
 * @param {string} rawId - The raw ID parameter.
 * @returns {number|null} Safe positive integer or null if invalid.
 */
function parsePositiveIntId(rawId) {
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId.trim())) {
    return null;
  }
  const parsed = Number(rawId.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Parse and validate a positive integer from JSON request body fields.
 * Accepts numbers (e.g. 1) or positive numeric strings (e.g. "1").
 * @param {*} value - The value to validate.
 * @returns {number|null} Safe positive integer or null if invalid.
 */
function parsePositiveIntField(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 1 ? value : null;
  }
  if (typeof value === 'string') {
    return parsePositiveIntId(value);
  }
  return null;
}

/**
 * Validate that a value is a non-empty string and return its trimmed value.
 * @param {*} value - Value to check.
 * @returns {string|null} Trimmed string or null if invalid/empty.
 */
function validateNonEmptyString(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

/**
 * Validate bike payload for POST and PUT requests (requires bike_name and bike_type).
 * @param {object} body - Request body object.
 * @returns {{ bikeName?: string, bikeType?: string, error?: string }}
 */
function validateBikePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a valid JSON object.' };
  }

  const bikeName = validateNonEmptyString(body.bike_name);
  if (!bikeName) {
    return { error: 'bike_name is required and must be a non-empty string.' };
  }

  const bikeType = validateNonEmptyString(body.bike_type);
  if (!bikeType) {
    return { error: 'bike_type is required and must be a non-empty string.' };
  }

  return { bikeName, bikeType };
}

/**
 * Validate rider payload for POST /riders (requires rider_name, student_id, and phone).
 * @param {object} body - Request body object.
 * @returns {{ riderName?: string, studentId?: string, phone?: string, error?: string }}
 */
function validateRiderPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a valid JSON object.' };
  }

  const riderName = validateNonEmptyString(body.rider_name);
  if (!riderName) {
    return { error: 'rider_name is required and must be a non-empty string.' };
  }

  const studentId = validateNonEmptyString(body.student_id);
  if (!studentId) {
    return { error: 'student_id is required and must be a non-empty string.' };
  }

  const phone = validateNonEmptyString(body.phone);
  if (!phone) {
    return { error: 'phone is required and must be a non-empty string.' };
  }

  return { riderName, studentId, phone };
}

/**
 * Validate a rental_date string (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS) and verify real calendar date.
 * Rejects nonexistent dates like 2026-02-30.
 * @param {*} rawDate - Raw date string.
 * @returns {string|null} Valid date string or null.
 */
function validateRentalDate(rawDate) {
  const dateStr = validateNonEmptyString(rawDate);
  if (!dateStr) {
    return null;
  }

  const datePart = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return null;
  }

  if (Number.isNaN(Date.parse(dateStr))) {
    return null;
  }

  const parts = datePart.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const checkDate = new Date(Date.UTC(year, month - 1, day));
  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  return dateStr;
}

/**
 * Validate the optional search query parameter `type` for GET /bikes.
 * When present, it must be a non-empty string.
 * @param {*} typeQuery - Raw query parameter req.query.type.
 * @returns {{ value?: string|null, error?: string }}
 */
function validateBikeTypeSearch(typeQuery) {
  if (typeQuery === undefined) {
    return { value: null };
  }

  const trimmedType = validateNonEmptyString(typeQuery);
  if (!trimmedType) {
    return { error: 'type query parameter must be a non-empty string.' };
  }

  return { value: trimmedType };
}

/**
 * Build SQL WHERE clause and parameter array for bike-type search.
 * Ensures parameterized, case-insensitive comparison using LOWER(bike_type) = LOWER(?).
 * @param {string|null} typeFilter - Validated type filter or null.
 * @returns {{ whereClause: string, filterParams: Array<string> }}
 */
function buildBikeTypeSearchClause(typeFilter) {
  if (typeFilter) {
    return {
      whereClause: 'WHERE LOWER(bike_type) = LOWER(?)',
      filterParams: [typeFilter],
    };
  }
  return {
    whereClause: '',
    filterParams: [],
  };
}

module.exports = {
  parsePositiveIntId,
  parsePositiveIntField,
  validateNonEmptyString,
  validateBikePayload,
  validateRiderPayload,
  validateRentalDate,
  validateBikeTypeSearch,
  buildBikeTypeSearchClause,
};

