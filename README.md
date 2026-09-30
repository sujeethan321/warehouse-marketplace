# StoreShare warehouse marketplace

## Start the application

Use MySQL and Python 3.13 (or a compatible Python version), plus Node.js.

1. In `backend`, create a virtual environment and install dependencies:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```
   Edit `.env` with your MySQL connection and a long random `SECRET_KEY`. Do not overwrite an existing configured `.env`.
2. For a **new database only**, import `backend/schema.sql` through your MySQL client (`mysql -u USER -p < schema.sql` from a shell that supports input redirection, or `source /path/to/backend/schema.sql` within MySQL). Existing databases must not re-import the schema.
3. From `backend`, run:
   ```powershell
   python -m alembic upgrade head
   python -m app.create_admin
   python -m uvicorn app.main:app --reload
   ```
   The migration extends the existing MySQL `users.role` ENUM, preserving its values, nullability, default, and all user rows. VARCHAR development schemas already accept the role. The repository starts with `schema.sql`, so this is the first Alembic revision; do not stamp it as applied without running it. Downgrade deliberately refuses to remove the role, which could corrupt admin accounts. Back up production databases before applying schema changes.

   The local admin command prompts for name, email, and a hidden password twice (12–72 bytes). Use a unique strong password. It creates a new account and refuses to overwrite or promote an existing email. Run this only as a trusted database operator; there are no default credentials or public admin-creation routes. Public registration still accepts only `owner` and `customer`.
4. In `frontend`:
   ```powershell
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```
   Preserve existing settings if `.env` already exists. Set `VITE_API_URL=http://localhost:8000/api` and `VITE_ADMIN_MOCK=false`, then restart Vite. Admin service calls always use the backend; the mock flag is documented for compatibility but no mock mode or fallback exists.
5. Open `http://localhost:5173` and sign in with the new admin credentials. Set `CORS_ORIGINS` in the backend if using a different frontend origin.

## Admin API

All endpoints require an existing JWT belonging to a database user whose current role is `admin`. Missing/invalid authentication returns 401; owners and customers receive 403. Profile and rental responses explicitly exclude hashes and tokens.

- `GET /api/admin/summary` ? `{customers, owners, storage_spaces, rental_requests}`.
- `GET /api/admin/users?role=customer&search=...&page=1&page_size=20` ? `{items, total, page, page_size}`; role is `customer` or `owner`, search matches name/email.
- `GET /api/admin/users/{id}` ? profile (`id`, `name`, `email`, `role`, `created_at`).
- `GET /api/admin/users/{id}/spaces?page=1&page_size=20` ? paginated spaces.
- `GET /api/admin/rentals?search=...&status=approved&customer_id=...&owner_id=...&page=1&page_size=20` ? paginated requests. Search matches request ID, customer/owner name and email, space name/code/location. Status is `pending`, `approved`, `rejected`, or `cancelled`.
- `GET /api/admin/rentals/{id}` ? rental, customer and owner information, space, dates, capacity, booked total, and status history.

Page sizes are limited to 100. Results have deterministic newest-first ordering. Profiles retrieve related collections separately so large accounts remain paginated. The displayed current space rate may differ from the historically booked total if an owner has changed pricing. No admin notifications, deletions, role changes, or rental state mutation controls are part of this dashboard.

## Verify with real data

Register an owner and customer using the normal registration screen. As owner, create a storage space. As customer, submit a rental request for that space; as owner, approve or reject it. Then sign in as admin:

- **Overview** (`/admin`): compare all four counts to the records you created.
- **Customers**: search by name/email, open a profile, and check its rental history. With more than 20 accounts, check Next/Previous.
- **Owners**: open a profile and check storage spaces and related requests.
- **Rental history**: search by person, space, location, or request ID; filter each status; open a request and verify details and status history.
- Test an unmatched search for the empty state, stop the backend for the error/retry state, and check narrow and wide browser widths. Sign in as customer/owner and open `/admin`: the UI redirects to the appropriate workspace; direct API access returns 403. Signed-out access redirects to login.

## Automated checks

```powershell
cd backend
python -m pytest -q
cd ../frontend
npm run build
```

Backend tests use isolated in-memory SQLite and do not change the MySQL database. Admin tests cover authentication/authorization, rejected public admin registration, credential creation, safe response fields, counts, searches, pagination, profiles/spaces, rental history, invalid inputs, and migration ENUM preservation. The migration test checks generated operation parameters; it does not substitute for a MySQL staging migration rehearsal.
