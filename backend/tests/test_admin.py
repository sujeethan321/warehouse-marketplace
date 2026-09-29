from datetime import date, timedelta
import importlib.util
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from sqlalchemy.dialects import mysql

from app.auth.security import create_access_token, verify_password
from app.create_admin import create_admin
from app.models.user import User
from tests.conftest import request_rental, approve


@pytest.fixture
def admin(db):
    user = create_admin(db, 'Admin', 'admin@test.com', 'a-secure-password')
    return {'Authorization': 'Bearer ' + create_access_token(user)}


@pytest.mark.parametrize('path', ['/summary', '/users', '/users/1', '/users/1/spaces', '/rentals', '/rentals/1'])
def test_admin_access(client, owner, customer, admin, path):
    url = '/api/admin' + path
    assert client.get(url).status_code == 401
    assert client.get(url, headers={'Authorization': 'Bearer invalid'}).status_code == 401
    for account in (owner, customer):
        assert client.get(url, headers=account['headers']).status_code == 403
    assert client.get(url, headers=admin).status_code in (200, 404)


def test_registration_cannot_assign_admin(client):
    result = client.post('/api/auth/register', json={
        'name': 'Bad', 'email': 'bad@test.com', 'password': 'password123', 'role': 'admin'})
    assert result.status_code == 422


def test_create_admin_is_safe(db):
    user = create_admin(db, '  Admin  ', 'ADMIN@test.com', 'a-secure-password')
    assert user.role == 'admin' and user.name == 'Admin'
    assert verify_password('a-secure-password', user.password_hash)
    with pytest.raises(ValueError, match='already exists'):
        create_admin(db, 'Other', 'admin@test.com', 'a-secure-password')
    with pytest.raises(ValueError):
        create_admin(db, 'Other', 'other@test.com', 'shortpass')
    assert db.query(User).count() == 1


def test_live_role_overrides_token(client, db, admin):
    user = db.query(User).filter_by(role='admin').one()
    user.role = 'customer'
    db.commit()
    assert client.get('/api/admin/summary', headers=admin).status_code == 403


def test_summary_users_and_spaces(client, admin, owner, customer, customer2, space):
    assert client.get('/api/admin/summary', headers=admin).json() == {
        'customers': 2, 'owners': 1, 'storage_spaces': 1, 'rental_requests': 0}
    data = client.get('/api/admin/users', headers=admin, params={'role': 'customer', 'page_size': 1}).json()
    assert data['total'] == 2 and data['page'] == 1 and len(data['items']) == 1
    second = client.get('/api/admin/users', headers=admin, params={'role': 'customer', 'page_size': 1, 'page': 2}).json()
    assert second['items'][0]['id'] != data['items'][0]['id']
    result = client.get('/api/admin/users', headers=admin, params={'search': 'CUST1@'}).json()
    assert result['total'] == 1
    assert set(result['items'][0]) == {'id', 'name', 'email', 'role', 'created_at'}
    assert client.get('/api/admin/users', headers=admin, params={'search': '%'}).json()['total'] == 0
    profile = client.get(f"/api/admin/users/{owner['user']['id']}", headers=admin).json()
    assert profile['name'] == 'Owner A' and 'password_hash' not in profile
    spaces = client.get(f"/api/admin/users/{owner['user']['id']}/spaces", headers=admin).json()
    assert spaces['total'] == 1 and spaces['items'][0]['id'] == space['id']
    assert client.get('/api/admin/users/99999', headers=admin).status_code == 404


def test_rental_lists_details_and_history(client, admin, owner, customer, customer2, space):
    start, end = date.today() + timedelta(days=2), date.today() + timedelta(days=4)
    rental = request_rental(client, customer, space['id'], 10, str(start), str(end)).json()
    assert approve(client, owner, rental['id']).status_code == 200
    request_rental(client, customer2, space['id'], 20, str(start), str(end))
    assert client.get('/api/admin/summary', headers=admin).json()['rental_requests'] == 2
    params = {'search': 'Owner A', 'status': 'approved', 'owner_id': owner['user']['id'], 'customer_id': customer['user']['id']}
    result = client.get('/api/admin/rentals', headers=admin, params=params)
    assert result.status_code == 200, result.text
    data = result.json()
    assert data['total'] == 1
    assert data['items'][0]['owner_email'] == 'ownera@test.com'
    detail = client.get(f"/api/admin/rentals/{rental['id']}", headers=admin).json()
    assert detail['status'] == 'approved' and detail['total_price'] == 40
    assert len(detail['history']) == 2
    assert detail['history'][-1]['changed_by_name'] == 'Owner A'
    assert 'password_hash' not in str(detail) and 'access_token' not in str(detail)
    assert client.get('/api/admin/rentals', headers=admin, params={'status': 'cancelled'}).json()['items'] == []
    assert client.get('/api/admin/rentals/99999', headers=admin).status_code == 404
    # The dashboard is read-only; admin privileges do not bypass rental state rules.
    assert client.patch(f"/api/rentals/{rental['id']}/status", headers=admin, json={'status': 'cancelled'}).status_code == 403


@pytest.mark.parametrize('path', ['/users?page=0', '/users?page_size=101', '/users?role=admin', '/rentals?status=completed', '/rentals?owner_id=-1'])
def test_bad_filters(client, admin, path):
    assert client.get('/api/admin' + path, headers=admin).status_code == 422


def test_mysql_migration_preserves_enum_and_refuses_downgrade():
    spec = importlib.util.spec_from_file_location('admin_migration', Path(__file__).parents[1] / 'migrations/versions/0001_admin_role.py')
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    bind = Mock()
    bind.dialect.name = 'mysql'
    column = {'name': 'role', 'type': mysql.ENUM('owner', 'customer'), 'nullable': False, 'default': None}
    inspector = Mock()
    inspector.get_columns.return_value = [column]
    with patch.object(migration.op, 'get_bind', return_value=bind), patch.object(migration.sa, 'inspect', return_value=inspector), patch.object(migration.op, 'alter_column') as alter:
        migration.upgrade()
        assert alter.call_args.kwargs['type_'].enums == ['owner', 'customer', 'admin']
        assert alter.call_args.kwargs['existing_nullable'] is False
        column['type'] = mysql.ENUM('owner', 'customer', 'admin')
        alter.reset_mock()
        migration.upgrade()
        alter.assert_not_called()
    with pytest.raises(RuntimeError, match='forward-only'):
        migration.downgrade()
