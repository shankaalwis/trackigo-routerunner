# Bus Turn Scheduler - Project Instructions

Build a web app called **Bus Turn Scheduler** for managing daily bus turn allocation on the **Kaduwela - Colombo** route.

## Goal

The app should automatically decide which bus gets the next turn based on a **fair round-robin queue system with availability checking**.

The logic must ensure:

* all buses get a fair chance according to turn order
* no bus is assigned before it becomes available again
* the system stops once the required number of daily turns is completed
* dispatchers can view, edit, and simulate the daily schedule

## Business Rules

Use these fixed rules:

* **Route:** Kaduwela - Colombo
* **Operational hours:** 04:30 AM to 12:00 AM
* **Peak hours:** 07:00 AM - 09:00 AM and 04:00 PM - 06:00 PM
* **Peak departure interval:** every 5 minutes
* **Off-peak departure interval:** every 15 minutes
* **Peak turn time:** 60 minutes
* **Off-peak turn time:** 90 minutes
* **Required total turns per day:** 44
* Assume the number of buses is greater than the minimum required for both peak and off-peak.

## Core Scheduling Algorithm

Implement this exact logic:

1. Maintain all buses in a fixed queue order.
2. Each bus has:
   * bus ID
   * status
   * next available time
   * total turns assigned
   * last assigned trip time
3. At each departure slot:
   * detect whether the time is peak or off-peak
   * use the correct departure interval and turn duration
   * check the bus queue from the front
   * assign the trip to the first bus whose next available time is less than or equal to the departure time
   * update that bus’s next available time to departure time plus turn duration
   * increment its total turns
   * move that bus to the back of the queue
4. If a bus is not available, skip it temporarily and check the next bus in queue.
5. If no bus is available for a slot, mark it as a missed slot.
6. Continue until either:
   * 44 turns are completed, or
   * operational hours end.
7. Prioritize fairness. Do not always choose the globally earliest available bus. Respect queue turn order first.

## App Features

### 1. Setup / Inputs

A form where the user can configure route name, operational times, peak intervals, turn durations, etc.
Also allow bus entry: add, edit, delete buses with ID, status, and optional driver name.

### 2. Scheduler Engine

A button called **Generate Schedule** that runs the algorithm.

### 3. Daily Schedule Table

Show a table with columns: trip number, departure time, peak/off-peak, assigned bus, trip duration, next available time, total turns for that bus, status. Include search, sorting, and filtering.

### 4. Bus Summary Panel

Show details for each bus: ID, turns, last assigned, next available, utilization.

### 5. Queue Visualization

Show the live current bus queue order visually.

### 6. Flowchart / Logic View

A visual flowchart panel that explains the scheduling decision process.

### 7. Analytics

Summary widgets and charts showing turns per bus and schedule timeline.

## UX Requirements

* Responsive single-page web application
* Professional transport operations dashboard design
* Clear typography, spacious cards, color-coded status badges
* Peak hours visually highlighted
* User-friendly validation and error messages

## Sample Default Data

* Route: Kaduwela - Colombo
* Start: 04:30, End: 00:00
* Peak 1: 07:00-09:00, Peak 2: 16:00-18:00
* Peak interval: 5m, Off-peak interval: 15m
* Peak turn: 60m, Off-peak turn: 90m
* Required: 44 turns
* Buses: B1 to B14 (active, init next-avail 04:30)

## Technical Expectations

* Structured state-driven approach
* Logic separate from UI
* Mock local persistence (or Supabase if needed)
* Realistic sample output immediately
