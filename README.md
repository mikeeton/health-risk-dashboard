# Repository Structure

This section provides a detailed overview of the project structure and the purpose of each major file and directory.

---

## Backend

### Core Files

#### backend/main.py

Application entry point.

Responsibilities:

* Creates FastAPI application
* Registers all API routers
* Configures middleware
* Handles startup and shutdown events
* Exposes API endpoints

---

#### backend/database.py

Database configuration layer.

Responsibilities:

* Creates SQLAlchemy engine
* Manages database sessions
* Provides dependency injection through get_db()
* Handles database connectivity

---

#### backend/models.py

Contains all SQLAlchemy database models.

Models include:

* User
* Patient
* Vital
* Medication
* ReviewCase
* AuditLog
* Notification
* RegistrationRequest
* PatientEvent

These models define the structure of the database tables.

---

#### backend/schemas.py

Contains all Pydantic validation schemas.

Responsibilities:

* Request validation
* Response serialization
* Data transfer objects
* API contract definitions

---

#### backend/auth_utils.py

Authentication helper module.

Responsibilities:

* Password hashing
* Password verification
* JWT handling
* Authentication validation
* Authorization utilities

---

#### backend/seed_demo_data.py

Development helper script.

Responsibilities:

* Creates demo users
* Creates demo patients
* Creates sample vitals
* Creates review cases
* Creates medications

Used for testing and demonstrations.

---

## API Routes

### Authentication

#### routes/auth.py

Handles:

* Login
* Logout
* Password verification
* Session validation

---

### Patient Management

#### routes/patients.py

Handles:

* Create patient
* Update patient
* Delete patient
* Retrieve patient records

---

### Vitals

#### routes/vitals.py

Handles:

* Vital sign ingestion
* Vital sign retrieval
* Patient monitoring data

Examples:

* Heart Rate
* Blood Pressure
* SpO2
* Activity Data

---

### Medications

#### routes/medications.py

Handles:

* Medication records
* Adherence tracking
* Schedule management

---

### Reviews

#### routes/reviews.py

Handles:

* Clinical reviews
* Escalations
* Risk assessment workflows

---

### Analytics

#### routes/analytics.py

Handles:

* Dashboard analytics
* Trends
* Aggregated health metrics
* Statistical analysis

---

### Machine Learning

#### routes/ml.py

Handles:

* Predictive scoring
* Risk prediction
* AI-supported health analysis

Future smartwatch integrations will connect through this layer.

---

### Notifications

#### routes/notifications.py

Handles:

* User notifications
* Alert generation
* System messaging

---

### Admin Users

#### routes/admin_users.py

Handles:

* User management
* Role updates
* User activation
* User suspension

---

### Registration Requests

#### routes/registration_requests.py

Handles:

* New user requests
* Approval workflows
* Rejection workflows

---

### Audit Logs

#### routes/audit.py

Handles:

* Compliance tracking
* User activity logging
* Administrative monitoring

---

### AI Assistant

#### routes/assistant.py

Handles:

* AI requests
* Clinical summaries
* AI-generated recommendations
* Healthcare explanations

---

# Frontend Architecture

The frontend was developed using React, TypeScript, and Vite.

The architecture follows a component-driven approach with centralized state management.

---

## Entry Files

### src/main.tsx

Application entry point.

Responsibilities:

* Mount React application
* Configure providers
* Initialize routing

---

### src/app/App.tsx

Root application component.

Responsibilities:

* Global layout
* Shared providers
* Theme integration

---

### src/app/routes.tsx

Application routing system.

Responsibilities:

* Route definitions
* Protected routes
* Role-based access

---

# Context Management

## AuthContext.tsx

Controls:

* Login
* Logout
* User state
* Role management
* Session persistence

---

## HealthDataContext.tsx

Controls:

* Patient data
* Vital records
* Dashboard information
* Shared health state

---

# Services

## api.ts

Central API communication layer.

Responsibilities:

* HTTP requests
* Authentication headers
* Error handling

---

## healthService.ts

Provides:

* Patient APIs
* Vital APIs
* Medication APIs

---

## liveSocket.ts

Prepared for:

* Real-time monitoring
* Smartwatch integrations
* Live healthcare events

This module will become critical during wearable integration.

---

# AI and Analytics Modules

## parseAIResponse.ts

Converts raw AI output into structured content.

---

## predictiveRisk.ts

Generates patient risk scores.

---

## baseline.ts

Calculates patient baseline metrics.

---

## alertEngine.ts

Generates alerts when abnormal health patterns are detected.

---

## clinicianPdfReport.ts

Creates downloadable clinician reports.

---

# Role-Based Pages

## Administrator Pages

AdminDashboard.tsx

Provides:

* User management
* Audit monitoring
* Registration approvals
* Analytics access

---

## Doctor Pages

DoctorDashboard.tsx

Provides:

* Patient review
* Escalations
* AI summaries
* Clinical reporting

---

## Nurse Pages

NurseDashboard.tsx

Provides:

* Medication tracking
* Vital recording
* Alert monitoring
* Patient observation

---

## Patient Pages

PatientDashboard.tsx

Provides:

* Personal health information
* Medication schedule
* Reports
* AI health summaries

---

# Major Development Challenges

## Challenge 1: Multi-Role Authentication

Problem:

Different user types required completely different permissions.

Solution:

Implemented role-based routing and ProtectedRoute validation.

Result:

Users only access pages authorized for their role.

---

## Challenge 2: Registration Approval Workflow

Problem:

Users needed administrator approval before accessing the platform.

Solution:

Created RegistrationRequest workflow and approval system.

Result:

Controlled onboarding process.

---

## Challenge 3: Backend Synchronization

Problem:

Frontend requests failed whenever backend services were unavailable.

Solution:

Improved API handling and backend restart procedures.

Result:

More reliable development workflow.

---

## Challenge 4: AI Integration

Problem:

AI outputs were inconsistent.

Solution:

Created parsing utilities and structured prompt engineering.

Result:

Consistent healthcare summaries.

---

## Challenge 5: Dashboard Architecture

Problem:

Multiple dashboards shared common functionality while requiring role-specific features.

Solution:

Built reusable components with role-based rendering.

Result:

Reduced duplication and improved maintainability.

---

# Future Roadmap

Phase 2 (Upcoming)

* Smartwatch Integration
* Live Health Monitoring
* Bluetooth Connectivity
* Real-Time Vital Streaming
* Advanced Predictive Analytics
* Personalized AI Risk Scoring

The next stage of development focuses on connecting real wearable devices to replace simulated patient data and transform the platform into a live healthcare monitoring system.
