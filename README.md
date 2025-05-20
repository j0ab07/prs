# Pandemic Resilience System (PRS)

The **Pandemic Resilience System (PRS)** is a web-based platform designed to manage critical activities during pandemics, serving government officials, merchants, and the public. It supports supply chain management, vaccination tracking, and secure data handling with a focus on privacy, scalability, and role-based access control (RBAC). Built using Django, Django REST Framework, and SQLite, it includes a responsive frontend for user interaction.

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Database Schema](#database-schema)
- [Security Features](#security-features)
- [Frontend Dashboard](#frontend-dashboard)
- [Limitations and Future Improvements](#limitations-and-future-improvements)
- [Contributing](#contributing)
- [License](#license)

## Features
- **PRS-Id Generation**: Assigns unique identifiers to individuals, linked to encrypted National Identifiers.
- **Supply Chain Management**: Enforces purchase limits and schedules for critical items (e.g., face masks, milk) based on date of birth.
- **Vaccination Tracking**: Manages vaccination records with JSON support (planned NoSQL integration).
- **Merchant Management**: Allows merchants to enroll, manage stock, and record sales while complying with restrictions.
- **Government Dashboard**: Enables officials to monitor supply chains, vaccination records, and audit access logs.
- **Public Dashboard**: Lets individuals view records, locate supplies, and upload vaccination data.
- **Security**: Uses JWT authentication, RBAC, and AES-256 encryption for sensitive data.
- **Scalability**: Features indexed tables and stateless RESTful APIs for large datasets.

## Technologies
- **Backend**: Django 4.x, Django REST Framework, SQLite
- **Authentication**: Simple JWT (JSON Web Tokens)
- **Encryption**: AES-256 (via `django-encrypted-model-fields`), PBKDF2 hashing
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **API Documentation**: OpenAPI 3.0.3 (via `drf-spectacular`)
- **Dependencies**: See `requirements.txt` (e.g., `django-cors-headers`, `pycryptodome`)

## Setup Instructions

### Prerequisites
- **Python**: 3.8 or higher, I would recommend version 3.11, Download here: [Python](https://www.python.org/downloads/)
- **Git**: To clone the repository, Download Git here: [Git](https://git-scm.com/downloads)
- **Virtualenv**: Recommended for isolated environments
- **Browser**: Chrome, Firefox, or any modern browser

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/j0ab07/prs.git
   cd prs
   ```

2. **Create and Activate a Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply Database Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create a Superuser** (optional, for admin access):
   ```bash
   python manage.py createsuperuser
   ```

### Running the Application
1. **Start the Django Development Server**:
   ```bash
   python manage.py runserver
   ```

2. **Access the Application**:
   - **Frontend Dashboard**: `http://localhost:8000/`
   - **API Documentation (Swagger UI)**: `http://localhost:8000/api/docs/`
   - **Admin Interface**: `http://localhost:8000/admin/` (use superuser credentials)

3. **Register a User**:
   - Via the frontend registration form at `http://localhost:8000/` or API:
     ```bash
     curl -X POST http://localhost:8000/api/v1/register/ \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "pass123", "role": "public"}'
     ```

4. **Obtain a JWT Token**:
   ```bash
   curl -X POST http://localhost:8000/api/token/ \
   -H "Content-Type: application/json" \
   -d '{"username": "testuser", "password": "pass123"}'
   ```

## API Endpoints
The PRS API is available at `http://localhost:8000/api/v1/` and requires JWT authentication (`Authorization: Bearer <token>`). Key endpoints include:

| Endpoint                              | Method | Description                              | Role Access                     |
|---------------------------------------|--------|------------------------------------------|---------------------------------|
| `/api/v1/register/`                   | POST   | Register a new user                     | All (no auth)                  |
| `/api/v1/user-profile/`               | GET    | Get logged-in user’s profile            | Public, Merchant, Government   |
| `/api/v1/individuals/`                | GET, POST | List/create individuals                | Public (own), Government (all) |
| `/api/v1/critical-items/`             | GET, POST | List/create critical items             | Public (read), Government (all)|
| `/api/v1/merchants/`                  | GET, POST | List/create merchants                  | Public (read), Merchant (own), Government |
| `/api/v1/merchant-stock/`             | GET, POST | List/create merchant stock             | Public (read), Merchant (own), Government |
| `/api/v1/purchases/`                  | GET, POST | List/create purchases                  | Public (own), Merchant (own), Government |
| `/api/v1/vaccination-records/`        | GET, POST | List/create vaccination records        | Public (own), Government (all) |
| `/api/v1/vaccination-records/upload/` | POST   | Upload vaccination record              | Public (own), Government       |
| `/api/v1/government-officials/`       | GET, POST | List/create government officials       | Government                     |
| `/api/v1/access-logs/`                | GET, POST | List/create access logs                | Government                     |

View detailed specifications in the Swagger UI at `/api/docs/` or in `prs_schema.json`.

## Role-Based Access Control (RBAC)
Three roles are supported:
- **Public**: View/update own records, check item availability, record purchases, upload vaccination records.
- **Merchant**: Manage own merchant profile, update stock, record sales.
- **Government**: Full CRUD access to all entities, audit access logs.

RBAC is implemented via `RoleBasedPermission` in `views.py`, using `UserProfile` and `GovernmentOfficial` models.

| Entity                  | Public Access                     | Merchant Access                     | Government Access               |
|-------------------------|-----------------------------------|-------------------------------------|---------------------------------|
| Individuals             | Create/Read/Update (own)          | None (indirect via API)             | Full CRUD                       |
| Merchants               | Read                              | Create/Read/Update (own)            | Full CRUD                       |
| Critical Items          | Read                              | Read                                | Full CRUD                       |
| Merchant Stock          | Read                              | Create/Read/Update (own)            | Full CRUD                       |
| Purchases               | Read/Create (own)                 | Create/Read/Update (own)            | Full CRUD                       |
| Vaccination Records     | Read/Create (own)                 | None                                | Full CRUD                       |
| Government Officials    | None                              | None                                | Full CRUD                       |
| Access Logs             | None                              | None                                | Read/Create                     |

## Database Schema
The SQLite database (`db.sqlite3`) includes tables defined in `models.py`:
- **individuals**: PRS-Ids, hashed national identifiers, DOB.
- **user_profiles**: Links users to individuals or merchants.
- **merchants**: Business details with hashed licenses.
- **critical_items**: Item restrictions (limits, allowed days).
- **merchant_stock**: Merchant inventory.
- **purchases**: Transaction logs with restriction checks.
- **vaccination_records**: Vaccination data with JSON support.
- **government_officials**: Official roles.
- **access_logs**: Government action audits.

Sensitive fields (`national_identifier`, `business_license`) use PBKDF2 hashing, with AES-256 encryption via `EncryptedCharField`.

## Security Features
- **JWT Authentication**: Via `rest_framework_simplejwt` with short-lived tokens.
- **Data Protection**:
  - PBKDF2 hashing for sensitive fields (`models.py`).
  - AES-256 encryption via `EncryptedCharField` (`fields.py`).
- **RBAC**: Enforced by `RoleBasedPermission` (`views.py`).
- **CORS**: Configured in `settings.py` (update `CORS_ALLOWED_ORIGINS` for production).
- **HTTPS**: Assumed for production.
- **Auditing**: Government actions logged in `access_logs`.

## Frontend Dashboard
The frontend (`static/index.html`, `styles.css`, `script.js`) is a single-page application with:
- **Login/Registration**: Forms for authentication and account creation.
- **Role-Based UI**: Displays tables/forms based on user role.
- **Responsive Design**: CSS Grid and media queries for mobile support.
- **API Integration**: JavaScript `fetch` for API interactions (e.g., `createIndividual`, `getPurchases`).

## Limitations and Future Improvements
- **NoSQL Integration**: Vaccination records use a JSON field; plan MongoDB migration for scalability.
- **PDF Uploads**: Unstructured data (e.g., PDF certificates) not implemented; plan a `vaccination_files` table.
- **Custom APIs**: `/api/v1/stock/nearby/` and `/api/v1/vaccination-records/bulk-upload/` not implemented.
- **Production Readiness**:
  - Use PostgreSQL or MongoDB instead of SQLite.
  - Secure `SECRET_KEY` and `ENCRYPTION_KEY` in environment variables.
  - Restrict CORS and disable `DEBUG` in `settings.py`.
- **Testing**: Add unit tests with `pytest`.

## Contributing
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request.

Report issues at [GitHub Issues](https://github.com/j0ab07/prs/issues).