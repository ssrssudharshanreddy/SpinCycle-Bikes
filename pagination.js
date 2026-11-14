/**
 * SpinCycle Bikes – Pagination Helper Module
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 5: Vemula Anshu (Reg. No: 252U1R1254)
 * Responsibility: Pagination
 *
 * This module manages pagination parameters, default values, offset calculations,
 * pagination validation, and response metadata generation for GET /bikes.
 */

const { parsePositiveIntId, validateBikeTypeSearch } = require('./validation');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;

/**
 * Parse and validate an optional positive integer pagination parameter.
 * Returns defaultValue if undefined. Rejects 0, negative, non-numeric, decimal values.
 * @param {*} rawValue - Value from req.query (e.g. req.query.page).
 * @param {number} defaultValue - Default positive integer to use if omitted.
 * @param {string} paramName - Parameter name for error messages ('page' or 'limit').
 * @returns {{ value?: number, error?: string }}
 */
function parsePaginationParam(rawValue, defaultValue, paramName) {
  if (rawValue === undefined) {
    return { value: defaultValue };
  }

  const parsed = parsePositiveIntId(rawValue);
  if (!parsed) {
    return { error: `${paramName} must be a positive integer.` };
  }

  return { value: parsed };
}

/**
 * Calculate the SQL OFFSET based on 1-based page number and limit.
 * Formula: OFFSET = (page - 1) * limit
 * @param {number} page - Current page (1-based).
 * @param {number} limit - Number of records per page.
 * @returns {number} The calculated SQL offset.
 */
function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Build pagination metadata object including totalPages.
 * Formula: totalPages = Math.ceil(totalRecords / limit)
 * @param {number} totalRecords - Total count of records matching filter.
 * @param {number} page - Current page number.
 * @param {number} limit - Current limit.
 * @returns {{ page: number, limit: number, totalRecords: number, totalPages: number }}
 */
function buildPaginationMetadata(totalRecords, page, limit) {
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
  return {
    page,
    limit,
    totalRecords,
    totalPages,
  };
}

/**
 * Parse and validate all query parameters for GET /bikes (search + pagination).
 * @param {object} query - Express req.query object.
 * @returns {{ typeFilter?: string|null, page?: number, limit?: number, offset?: number, error?: string }}
 */
function parseBikeQueryParams(query) {
  // Validate optional bike-type search parameter (Member 4 integration)
  const searchResult = validateBikeTypeSearch(query.type);
  if (searchResult.error) {
    return { error: searchResult.error };
  }

  // Validate optional page parameter (default: 1)
  const pageResult = parsePaginationParam(query.page, DEFAULT_PAGE, 'page');
  if (pageResult.error) {
    return { error: pageResult.error };
  }

  // Validate optional limit parameter (default: 5)
  const limitResult = parsePaginationParam(query.limit, DEFAULT_LIMIT, 'limit');
  if (limitResult.error) {
    return { error: limitResult.error };
  }

  const page = pageResult.value;
  const limit = limitResult.value;
  const offset = calculateOffset(page, limit);

  return {
    typeFilter: searchResult.value,
    page,
    limit,
    offset,
  };
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  parsePaginationParam,
  calculateOffset,
  buildPaginationMetadata,
  parseBikeQueryParams,
};

