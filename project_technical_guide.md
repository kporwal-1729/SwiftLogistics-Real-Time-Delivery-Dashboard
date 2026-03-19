Project Overview & Architecture

**Project Title:** SwiftLogistics: Real-Time Delivery Dashboard & Simulator
**Description:** A full-stack, real-time logistics tracking platform designed to map, manage, and simulate active delivery drivers. It features a custom "Simulation Mode" to demonstrate system capability under load without requiring live user data.

#### The "Simulation Mode" Feature
Since a tracking app is static without moving drivers, this app includes a dedicated **Simulation Mode**. 
* **How it works:** Tapping the "Start Simulation" toggle acts as the single User, instantly generating multiple "Ghost Delivery Partners" and assigning them mock orders. 
* **The Visuals:** The UI populates with active map markers moving toward destinations in real-time, allowing viewers to see the WebSocket engine in action.

#### UI & View Modals
The frontend is split into two distinct, role-based views.

**1. The User View (The Customer):**
* A clean, mobile-first interface.
* Features a "Create Order" button.
* Displays a live, zoomed-in map tracking the assigned driver's approach.
* Shows an estimated time of arrival (ETA) and a dynamic progress bar (Order Placed -> Picked Up -> On the Way -> Delivered).

**2. The Partner View (The Driver/Dispatcher):**
* A data-dense, desktop-first dashboard.
* Displays a wide-area map showing all active Ghost Delivery Partners simultaneously.
* Includes a live feed sidebar logging system events ("Driver A picked up Order 123").
* Allows manual override of order statuses for testing.

#### Authentication Strategy
* Uses **JWT (JSON Web Tokens)** stored in HttpOnly cookies for security.
* Implements **Role-Based Access Control (RBAC)**. Users have the `customer` role, while the dispatcher dashboard requires the `admin` role.



#### Database Schema Overview (PostgreSQL)
* **Users:** Stores customer credentials and profiles.
* **Drivers:** Stores partner details and current status (Available, Busy, Offline).
* **Orders:** Links a User and a Driver. Stores pickup coordinates, drop-off coordinates, and current status.
* **LocationHistory:** A time-series log of driver coordinates for auditing and route-playback.

#### REST API & WebSocket Design
The system uses standard HTTP for permanent actions and WebSockets for ephemeral, high-frequency data.

| Endpoint / Event | Type | Purpose |
| :--- | :--- | :--- |
| `POST /api/auth/login` | REST | Authenticates users/admins and sets JWT. |
| `POST /api/orders` | REST | Creates a new delivery request. |
| `GET /api/orders/active` | REST | Fetches initial state of all ongoing deliveries. |
| `location_update` | WebSocket | Server pushes new `(lat, lng)` to connected clients. |
| `status_change` | WebSocket | Emits when an order goes from "In Transit" to "Delivered". |

---

### TECHNICAL_GUIDE.md: Implementation Deep Dive

**Overview:** This document outlines the technical design decisions, performance optimizations, and mathematical logic used to build the real-time engine of SwiftLogistics.



#### 1. State Management & Caching (The Redis Decision)
**The Problem:** Writing driver GPS coordinates to a PostgreSQL database every 2 seconds for 50 drivers would cause massive I/O bottlenecks and database locks.
**The Solution:** * **Redis for "Hot Data":** Current driver locations are stored entirely in Redis using key-value pairs (`driver:104:location`). Redis handles high-frequency read/writes entirely in memory.
* **PostgreSQL for "Cold Data":** The permanent DB only receives updates when an order's status changes (e.g., "Delivered") or via a background cron job that batches location history every 5 minutes.

#### 2. The WebSocket Architecture (Socket.io)
To prevent the frontend from being overwhelmed by irrelevant data, the WebSocket connections utilize **Rooms**.
* When the User opens their tracking page, their client joins a specific room: `socket.join('order_123')`.
* The server only emits location updates for Driver A to the `order_123` room.
* The Admin Dashboard joins a global `dispatcher` room, receiving a multiplexed stream of all driver coordinates.

#### 3. Simulation Engine Logic (Ghost Entities)
The Simulator is a background Node.js worker that runs an interval loop. When activated, it calculates the movement of Ghost Drivers along a generated route.

To move a Ghost Driver smoothly on the frontend, the backend calculates intermediate waypoints using simple linear interpolation. If $P_{start}$ is the current coordinate, $P_{end}$ is the destination, and $t$ is the fractional progress (from $0$ to $1$) based on speed:

$$P(t) = P_{start} + t \times (P_{end} - P_{start})$$

* The backend increments $t$ slightly every tick and emits the new $P(t)$ over the WebSocket.
* When $t \ge 1$, the simulator triggers the `status_change` event, marking the package as delivered, and frees up the Ghost Driver for the next order.

#### 4. Frontend Map Rendering Optimizations
**The Problem:** Updating map markers in React 5 times a second can cause the entire component tree to re-render, freezing the UI.
**The Solution:**
* **Bypassing React State for Map Markers:** Instead of tying marker coordinates to `useState` (which triggers re-renders), the app uses `useRef` to hold the Leaflet/Google Maps marker instances.
* When a WebSocket event arrives, the app directly mutates the marker's position on the DOM canvas via the map provider's imperative API (e.g., `marker.setLatLng()`). This keeps the UI buttery smooth at 60 FPS regardless of update frequency.

---

You are absolutely right; I gave you the high-level summary in the README but left out the actual blueprints. Let's fix that. 

For a real-time logistics app, your database needs to handle relationships cleanly while leaving the heavy, high-frequency location updates to an in-memory store like Redis. PostgreSQL is the perfect choice for the permanent data.

Here is the detailed Database Design (Entity-Relationship schema) you would use for the **SwiftLogistics** project.



### The Core Tables (PostgreSQL)

#### 1. `users` Table
This table handles authentication and distinguishes between regular customers and your dispatcher/admin.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer', -- 'customer' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `drivers` Table
This represents your delivery partners. Notice that we keep their *status* here, but not their real-time coordinates (we'll discuss that below).

```sql
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    vehicle_type VARCHAR(50), -- e.g., 'Bike', 'Car', 'Van'
    status VARCHAR(20) DEFAULT 'offline', -- 'offline', 'available', 'busy'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `orders` Table (The Single Source of Truth)
This is the most important table. It connects a User to a Driver and tracks the journey of the package. 

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Null until assigned
    
    -- Storing coordinates as decimals (Standard approach)
    -- Alternatively, you could use PostGIS for advanced spatial queries
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    
    status VARCHAR(30) DEFAULT 'pending', 
    -- 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### The "Hot Data" Design (Redis)

If you update the `drivers` table in PostgreSQL every 2 seconds for 50 moving drivers, your database will choke. Instead, you design your system to store the **live coordinates** in Redis. 

Redis stores data in memory as simple Key-Value pairs, which is blazingly fast.

* **The Key format:** `driver:{driver_id}:location`
* **The Value (JSON):** ```json
    {
      "lat": 51.5074,
      "lng": -0.1278,
      "updated_at": 1710842400
    }
    ```

**How they work together:**
When your Node.js "Simulator" moves a driver, it updates the coordinates in **Redis** and emits the WebSocket event to the frontend. PostgreSQL is completely left alone. 
PostgreSQL is only updated when the order *status* changes (e.g., when the simulator decides the driver has arrived, it runs `UPDATE orders SET status = 'delivered' WHERE id = ...`).
