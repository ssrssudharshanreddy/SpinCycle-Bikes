# SpinCycle Bikes – Postman & Automated API Test Report

**Project:** SpinCycle Bikes – Campus Bike-Sharing REST API  
**Course:** Backend Development Fundamentals (Group Assignment – 01)  
**Group Number:** Group 03  
**Group Code:** `YG-CSE2E-G03`  
**Prepared by Member 6:** Somula Sudharshan Reddy (Reg. No: `252U1R1231`, Section: `CSE-CORE-2E`)  
**Date:** 13 November 2026  
**Test Environment:** Node.js `26.8.2`, Express `5.3.0`, SQLite3 `6.0.1`, Windows PowerShell  
**Collection File:** [`postman/SpinCycle-Bikes.postman_collection.json`](SpinCycle-Bikes.postman_collection.json)  
**Base URL:** `http://localhost:3000` (`{{baseUrl}}`)

---

## 1. Executive Summary

A comprehensive automated test suite of **42 test cases** divided into two dedicated verification suites was executed using the project's reproducible test runner script ([`test.js`](../test.js)) against the modular architecture of the SpinCycle Bikes application:

1. **Part 1 — Core Non-Mutating Test Suite (36 Cases):** Covers all 10 endpoint categories, including the health check, bike lookup, search, mandatory pagination, riders, rentals (relational `INNER JOIN`), and error handling without mutating persistent database records.
2. **Part 2 — Lifecycle CRUD Verification Suite (6 Cases):** Executes real `POST`, `GET`, `PUT`, `GET`, `DELETE`, and `GET` operations against an **isolated temporary copy of the SQLite database** (`database/bikeStore.tmp.db`), verifying successful bike creation (`201`), updating (`200`), and deletion (`200`) end-to-end without touching the original production database.

| Suite Category | Total Cases | Passed | Failed | Verification Method | Overall Result |
|---|:---:|:---:|:---:|---|:---:|
| **Part 1: Core Test Suite** | 36 | 36 | 0 | In-Memory Runner on `bikeStore.db` (Zero Mutation) | **100% PASS** |
| **Part 2: Lifecycle CRUD Suite** | 6 | 6 | 0 | In-Memory Runner on Temporary Copy (`bikeStore.tmp.db`) | **100% PASS** |
| **Combined Test Suite Total** | **42** | **42** | **0** | Reproducible Node.js Test Runner (`test.js`) | **100% PASS** |

> **Verification Method & Postman Desktop Notice:**
> - The reported **42 test outcomes were executed and verified via the project's test runner ([`test.js`](../test.js))** running in Node.js against the Express app and SQLite database, ensuring complete zero-mutation safety for the original records.
> - **Postman Desktop UI execution was not performed in this headless terminal environment.** Instead, the 40-request collection file ([`SpinCycle-Bikes.postman_collection.json`](SpinCycle-Bikes.postman_collection.json)) is provided pre-configured with collection variables and automated test assertions (`pm.test`) for evaluators and students to import and run directly in the Postman desktop client.
> - **Original Database Integrity:** Before and after running all 42 tests, the persistent database file (`database/bikeStore.db`) was inspected and verified to contain exactly **6 riders, 8 bikes, and 6 rentals** (100% preserved).

### Reproducing the Test Results

You can independently execute and reproduce all 42 test cases at any time from the project root (`SpinCycle-Bikes/`) using Windows PowerShell:

```powershell
node test.js
```
or
```powershell
npm test
```

---

## 2. Part 1: Core Automated Test Results (Cases 01–36)

The following 36 core test cases verify all endpoint routes, query parameters, input validation, and conflict preservation rules against `database/bikeStore.db` with zero mutations:

| # | Test Case Name | Method | Endpoint / Query | Expected Status | Actual Status | Result | Response Summary |
|---|---|---|---|:---:|:---:|:---:|---|
| 01 | Health Check Endpoint | `GET` | `/health` | `200` | `200` | **PASS** | `{"success":true,"database":"connected"}` |
| 02 | Get All Bikes (Default Pagination) | `GET` | `/bikes` | `200` | `200` | **PASS** | Default `page=1`, `limit=5`, `totalRecords=8`, `count=5` |
| 03 | Get Bike by Valid ID | `GET` | `/bikes/1` | `200` | `200` | **PASS** | Returned `bike_id=1`, `bike_name="TrailBlazer X1"` |
| 04 | Get Bike by Nonexistent ID | `GET` | `/bikes/999` | `404` | `404` | **PASS** | `{"success":false,"error":"Bike with ID 999 not found."}` |
| 05 | Get Bike by Invalid ID String | `GET` | `/bikes/abc` | `400` | `400` | **PASS** | `{"success":false,"error":"Invalid bike ID..."}` |
| 06 | Search Bikes by Type (Mountain) | `GET` | `/bikes?type=Mountain` | `200` | `200` | **PASS** | `count=3`, all `bike_type="Mountain"` |
| 07 | Search Bikes by Type (Case-Insensitive) | `GET` | `/bikes?type=road` | `200` | `200` | **PASS** | `count=2`, matched `Road` bikes using `LOWER()` |
| 08 | Search Bikes by Nonexistent Type | `GET` | `/bikes?type=Electric` | `200` | `200` | **PASS** | `count=0`, `totalRecords=0`, `data=[]` |
| 09 | Search Bikes with Empty/Whitespace Type | `GET` | `/bikes?type=%20%20` | `400` | `400` | **PASS** | `{"success":false,"error":"type query parameter must be a non-empty string."}` |
| 10 | **Mandatory Pagination Test 1** | `GET` | `/bikes?page=1&limit=2` | `200` | `200` | **PASS** | Page 1 returned first 2 bikes (`bike_id` 1 and 2, `totalPages=4`) |
| 11 | **Mandatory Pagination Test 2** | `GET` | `/bikes?page=2&limit=2` | `200` | `200` | **PASS** | Page 2 returned next 2 bikes (`bike_id` 3 and 4 without duplicates) |
| 12 | **Mandatory Pagination Test 3 (page=0)** | `GET` | `/bikes?page=0` | `400` | `400` | **PASS** | `{"success":false,"error":"page must be a positive integer."}` |
| 13 | **Mandatory Pagination Test (limit=-2)** | `GET` | `/bikes?limit=-2` | `400` | `400` | **PASS** | `{"success":false,"error":"limit must be a positive integer."}` |
| 14 | Pagination Validation (Non-numeric page) | `GET` | `/bikes?page=abc` | `400` | `400` | **PASS** | `{"success":false,"error":"page must be a positive integer."}` |
| 15 | Combined Search and Pagination | `GET` | `/bikes?type=Mountain&page=1&limit=2` | `200` | `200` | **PASS** | `count=2`, `totalRecords=3`, `totalPages=2` |
| 16 | Create Bike Validation (Empty name) | `POST` | `/bikes` | `400` | `400` | **PASS** | `{"error":"bike_name is required and must be a non-empty string."}` |
| 17 | Create Bike Validation (Missing type) | `POST` | `/bikes` | `400` | `400` | **PASS** | `{"error":"bike_type is required and must be a non-empty string."}` |
| 18 | Create Bike Validation (Non-object body) | `POST` | `/bikes` | `400` | `400` | **PASS** | `{"error":"Request body must be a valid JSON object."}` |
| 19 | Update Bike (Nonexistent bike ID) | `PUT` | `/bikes/999` | `404` | `404` | **PASS** | `{"success":false,"error":"Bike with ID 999 not found."}` |
| 20 | Update Bike (Invalid ID string) | `PUT` | `/bikes/abc` | `400` | `400` | **PASS** | `{"success":false,"error":"Invalid bike ID..."}` |
| 21 | Delete Bike Conflict (Rental History) | `DELETE` | `/bikes/1` | `409` | `409` | **PASS** | Blocked deletion because `bike_id=1` is referenced in `rentals` |
| 22 | Delete Bike (Nonexistent bike ID) | `DELETE` | `/bikes/999` | `404` | `404` | **PASS** | `{"success":false,"error":"Bike with ID 999 not found."}` |
| 23 | Delete Bike (Invalid ID string) | `DELETE` | `/bikes/abc` | `400` | `400` | **PASS** | `{"success":false,"error":"Invalid bike ID..."}` |
| 24 | Get All Riders | `GET` | `/riders` | `200` | `200` | **PASS** | Returned all 6 verified registered student riders |
| 25 | Get Rider by Valid ID | `GET` | `/riders/1` | `200` | `200` | **PASS** | Returned `rider_id=1`, `rider_name="Alice Perera"` |
| 26 | Get Rider by Nonexistent ID | `GET` | `/riders/999` | `404` | `404` | **PASS** | `{"success":false,"error":"Rider with ID 999 not found."}` |
| 27 | Get Rider by Invalid ID String | `GET` | `/riders/abc` | `400` | `400` | **PASS** | `{"success":false,"error":"Invalid rider ID..."}` |
| 28 | Register Rider Conflict (Duplicate student_id) | `POST` | `/riders` | `409` | `409` | **PASS** | Blocked duplicate registration for `STU2026001` |
| 29 | Register Rider Validation (Missing field) | `POST` | `/riders` | `400` | `400` | **PASS** | `{"error":"student_id is required and must be a non-empty string."}` |
| 30 | Get All Rentals (SQL INNER JOIN) | `GET` | `/rentals` | `200` | `200` | **PASS** | Returned all 6 rentals enriched with `rider_name` & `bike_name` |
| 31 | Create Rental Conflict (Active Bike) | `POST` | `/rentals` | `409` | `409` | **PASS** | `{"error":"Bike with ID 2 already has an active rental."}` |
| 32 | Create Rental (Nonexistent Rider) | `POST` | `/rentals` | `404` | `404` | **PASS** | `{"error":"Rider with ID 999 not found."}` |
| 33 | Create Rental (Nonexistent Bike) | `POST` | `/rentals` | `404` | `404` | **PASS** | `{"error":"Bike with ID 999 not found."}` |
| 34 | Create Rental (Invalid Calendar Date) | `POST` | `/rentals` | `400` | `400` | **PASS** | Rejected nonexistent date `2026-02-30` |
| 35 | Unknown Route Handling (404 Fallback) | `GET` | `/api/nonexistent-route` | `404` | `404` | **PASS** | `{"success":false,"error":"Route not found: GET /api/nonexistent-route"}` |
| 36 | Centralized Error Handling (Malformed JSON) | `POST` | `/bikes` | `400` | `400` | **PASS** | `{"success":false,"error":"Invalid JSON payload in request body."}` |

---

## 3. Part 2: Lifecycle CRUD Test Results (Cases 37–42)

The following 6 test cases verify successful bike creation, retrieval, updating, persistence verification, deletion, and 404 confirmation. They are executed against an **isolated temporary copy of the SQLite database** (`database/bikeStore.tmp.db`), ensuring zero mutations occur on the original production data (`database/bikeStore.db`):

| # | Test Case Name | Method | Endpoint / Query | Expected Status | Actual Status | Result | Response Summary |
|---|---|---|---|:---:|:---:|:---:|---|
| 37 | Create Valid Bike (Successful Creation) | `POST` | `/bikes` | `201` | `201` | **PASS** | Created temporary bike (`bike_id=12`, `bike_name="Apex Mountain Climber"`, `bike_type="Mountain"`) |
| 38 | Retrieve Newly Created Bike | `GET` | `/bikes/:id` | `200` | `200` | **PASS** | Successfully retrieved newly created bike (`bike_id=12`) matching inserted fields |
| 39 | Update Newly Created Bike (Successful Update) | `PUT` | `/bikes/:id` | `200` | `200` | **PASS** | Successfully updated fields to `bike_name="Apex Mountain Climber Pro"`, `bike_type="Hybrid"` |
| 40 | Verify Updated Bike Persistence | `GET` | `/bikes/:id` | `200` | `200` | **PASS** | Confirmed updated values (`"Apex Mountain Climber Pro"`, `"Hybrid"`) persisted |
| 41 | Delete Newly Created Bike (Successful Deletion) | `DELETE` | `/bikes/:id` | `200` | `200` | **PASS** | `{"success":true,"message":"Bike deleted successfully."}` |
| 42 | Verify Deleted Bike Returns 404 | `GET` | `/bikes/:id` | `404` | `404` | **PASS** | Confirmed deleted bike is removed: `{"success":false,"error":"Bike with ID 12 not found."}` |

---

## 4. Mandatory Pagination Verification Summary

The assignment specifically requires testing pagination on `GET /bikes`:

1. **Test 1 — `GET /bikes?page=1&limit=2`**
   - **Status:** `200 OK`
   - **Verification:** Slices first 2 records sorted by `bike_id ASC` (`bike_id`: 1, 2).
   - **Metadata:** `count: 2`, `page: 1`, `limit: 2`, `totalRecords: 8`, `totalPages: 4`.
   - **Result:** **PASS**

2. **Test 2 — `GET /bikes?page=2&limit=2`**
   - **Status:** `200 OK`
   - **Verification:** Slices next 2 records (`bike_id`: 3, 4). There are zero duplicates from page 1.
   - **Metadata:** `count: 2`, `page: 2`, `limit: 2`, `totalRecords: 8`, `totalPages: 4`.
   - **Result:** **PASS**

3. **Test 3 — `GET /bikes?page=0`**
   - **Status:** `400 Bad Request`
   - **Verification:** Rejects page zero with error `"page must be a positive integer."`.
   - **Result:** **PASS**

4. **Negative Limit Test — `GET /bikes?limit=-2`**
   - **Status:** `400 Bad Request`
   - **Verification:** Rejects negative limit with error `"limit must be a positive integer."`.
   - **Result:** **PASS**

---

## 5. How to Import and Run the Postman Collection

1. Open **Postman Desktop** (or Postman Web).
2. Click **Import** in the top left corner of the workspace.
3. Select the file located at:
   ```text
   SpinCycle-Bikes/postman/SpinCycle-Bikes.postman_collection.json
   ```
4. Verify the collection variable `baseUrl` is set to `http://localhost:3000`.
5. Ensure the Express backend server is running in a terminal:
   ```powershell
   npm start
   ```
6. Click on the collection name in Postman and select **Run collection** to execute all folders sequentially, or run individual requests inside any of the 10 folders. All tests will execute their pre-configured test scripts automatically.

