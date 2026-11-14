/**
 * SpinCycle Bikes – Express Router Module
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 1: Sirigineedi Venkata Rama Kishore (Reg. No: 252U1R1230)
 * Responsibility: Server and Routes
 *
 * This module defines and registers all application routes, mapping HTTP methods
 * and paths to their corresponding endpoint handler functions in endpoints.js.
 */

const express = require('express');
const router = express.Router();
const endpoints = require('./endpoints');

// ==========================================
// 1. Health-Check Route
// ==========================================
router.get('/health', endpoints.getHealth);

// ==========================================
// 2. Bikes CRUD Routes (with Search & Pagination)
// ==========================================
router.get('/bikes', endpoints.getBikes);
router.get('/bikes/:id', endpoints.getBikeById);
router.post('/bikes', endpoints.createBike);
router.put('/bikes/:id', endpoints.updateBike);
router.delete('/bikes/:id', endpoints.deleteBike);

// ==========================================
// 3. Riders Routes
// ==========================================
router.get('/riders', endpoints.getRiders);
router.get('/riders/:id', endpoints.getRiderById);
router.post('/riders', endpoints.createRider);

// ==========================================
// 4. Rentals Routes (SQL INNER JOIN)
// ==========================================
router.get('/rentals', endpoints.getRentals);
router.post('/rentals', endpoints.createRental);

module.exports = router;

