"""
Test suite for Code Red Initiatives API
Tests new features: Enterprise Metrics, Updated Statuses, Milestones View
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://initiative-details.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@vertiv.com"
TEST_PASSWORD = "Demo2024!"
TEST_REGISTRATION_EMAIL = f"test_user_{os.getpid()}@vertiv.com"


class TestAuth:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get or create demo user and login"""
        # First try to login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json()["token"]
        
        # If login fails, register the user first
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Demo User",
            "role": "admin"
        })
        
        if register_response.status_code in [200, 201]:
            login_response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                return login_response.json()["token"]
        
        pytest.skip("Could not authenticate - skipping tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_with_demo_credentials(self, session):
        """Test login with demo@vertiv.com/Demo2024!"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        # Status may be 401 if user doesn't exist yet
        if response.status_code == 401:
            # Register the user first
            reg = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Demo User",
                "role": "admin"
            })
            assert reg.status_code in [200, 201, 400]  # 400 if already exists
            
            # Try login again
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_login_invalid_credentials(self, session):
        """Test login with wrong credentials returns 401"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestConfigEndpoints:
    """Test configuration endpoints for dropdowns"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        # Register and login
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_get_statuses_returns_new_values(self, session, auth_headers):
        """Test /config/statuses returns new status options"""
        response = session.get(f"{BASE_URL}/api/config/statuses", headers=auth_headers)
        assert response.status_code == 200
        statuses = response.json()
        
        # Verify new status values
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
        for status in expected_statuses:
            assert status in statuses, f"Missing status: {status}"
        
        # Verify old statuses are NOT present
        old_statuses = ["On Track", "At Risk", "Off Track"]
        for old_status in old_statuses:
            assert old_status not in statuses, f"Old status still present: {old_status}"
    
    def test_get_buckets(self, session, auth_headers):
        response = session.get(f"{BASE_URL}/api/config/buckets", headers=auth_headers)
        assert response.status_code == 200
        assert set(response.json()) == {"Stabilization", "Modernization", "Growth"}
    
    def test_get_metric_categories(self, session, auth_headers):
        """Test /config/metric-categories endpoint"""
        response = session.get(f"{BASE_URL}/api/config/metric-categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()
        expected = ["Planning", "Sales", "Quality", "Delivery", "Customer Satisfaction"]
        for cat in expected:
            assert cat in categories


class TestEnterpriseMetrics:
    """Test Enterprise Metrics CRUD operations"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_create_enterprise_metric(self, session, auth_headers):
        """Test creating a new enterprise metric"""
        metric_data = {
            "name": "TEST_API_Metric",
            "description": "Test metric for API testing",
            "category": "Quality",
            "target_value": 95.0,
            "current_value": 78.5,
            "unit": "%"
        }
        
        response = session.post(
            f"{BASE_URL}/api/enterprise-metrics",
            json=metric_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["name"] == metric_data["name"]
        assert data["category"] == metric_data["category"]
        assert data["target_value"] == metric_data["target_value"]
        assert data["current_value"] == metric_data["current_value"]
        assert data["unit"] == metric_data["unit"]
        assert "created_at" in data
        
        # Store metric_id for cleanup
        self.__class__.created_metric_id = data["id"]
    
    def test_get_enterprise_metrics_list(self, session, auth_headers):
        """Test listing enterprise metrics"""
        response = session.get(
            f"{BASE_URL}/api/enterprise-metrics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check structure of first metric if exists
        if len(data) > 0:
            metric = data[0]
            assert "id" in metric
            assert "name" in metric
            assert "category" in metric
            assert "initiative_count" in metric
    
    def test_get_single_enterprise_metric(self, session, auth_headers):
        """Test getting a single metric by ID"""
        # First get the list
        list_response = session.get(
            f"{BASE_URL}/api/enterprise-metrics",
            headers=auth_headers
        )
        
        if list_response.status_code == 200 and len(list_response.json()) > 0:
            metric_id = list_response.json()[0]["id"]
            
            response = session.get(
                f"{BASE_URL}/api/enterprise-metrics/{metric_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == metric_id
            assert "initiative_count" in data
    
    def test_filter_metrics_by_category(self, session, auth_headers):
        """Test filtering metrics by category"""
        response = session.get(
            f"{BASE_URL}/api/enterprise-metrics?category=Quality",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for metric in data:
            assert metric["category"] == "Quality"
    
    def test_delete_enterprise_metric(self, session, auth_headers):
        """Test deleting an enterprise metric"""
        # Create a metric to delete
        create_response = session.post(
            f"{BASE_URL}/api/enterprise-metrics",
            json={
                "name": "TEST_DELETE_Metric",
                "description": "Metric to delete",
                "category": "Planning",
                "target_value": 100,
                "current_value": 50,
                "unit": "count"
            },
            headers=auth_headers
        )
        
        if create_response.status_code == 200:
            metric_id = create_response.json()["id"]
            
            # Delete it
            delete_response = session.delete(
                f"{BASE_URL}/api/enterprise-metrics/{metric_id}",
                headers=auth_headers
            )
            
            assert delete_response.status_code == 200
            
            # Verify it's deleted
            get_response = session.get(
                f"{BASE_URL}/api/enterprise-metrics/{metric_id}",
                headers=auth_headers
            )
            assert get_response.status_code == 404


class TestDashboardWithNewStatuses:
    """Test dashboard endpoints with new status values"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_dashboard_stats_new_status_fields(self, session, auth_headers):
        """Test /dashboard/stats returns new status counts"""
        response = session.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all new status fields are present
        assert "total_initiatives" in data
        assert "not_started_count" in data
        assert "discovery_count" in data
        assert "frame_count" in data
        assert "wip_count" in data
        assert "implemented_count" in data
        assert "total_metrics" in data
        assert "total_milestones" in data
        assert "total_risks" in data
        assert "escalated_risks" in data
        
        # Verify counts are non-negative integers
        assert isinstance(data["total_initiatives"], int)
        assert data["total_initiatives"] >= 0
    
    def test_dashboard_four_blockers_new_status(self, session, auth_headers):
        """Test /dashboard/four-blockers returns initiatives with new statuses"""
        response = session.get(
            f"{BASE_URL}/api/dashboard/four-blockers",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check structure of first blocker
        if len(data) > 0:
            blocker = data[0]
            assert "initiative_id" in blocker
            assert "name" in blocker
            assert "status" in blocker
            assert "metric_names" in blocker
            
            # Status should be one of the new values
            valid_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
            assert blocker["status"] in valid_statuses


class TestMilestonesView:
    """Test the new /milestones endpoint for cross-initiative view"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_get_all_milestones(self, session, auth_headers):
        """Test /milestones returns all milestones across initiatives"""
        response = session.get(
            f"{BASE_URL}/api/milestones",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check structure of first milestone
        if len(data) > 0:
            milestone = data[0]
            assert "milestone_id" in milestone
            assert "milestone_name" in milestone
            assert "due_date" in milestone
            assert "status" in milestone
            assert "initiative_id" in milestone
            assert "initiative_name" in milestone
            assert "initiative_status" in milestone
    
    def test_milestones_sorted_by_date(self, session, auth_headers):
        """Test milestones are sorted by due date descending"""
        response = session.get(
            f"{BASE_URL}/api/milestones",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if len(data) > 1:
                dates = [m.get("due_date", "") for m in data]
                # Verify sorted descending
                assert dates == sorted(dates, reverse=True), "Milestones should be sorted by due_date descending"


class TestInitiativesWithMetrics:
    """Test initiative creation and updates with metric alignment"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_create_initiative_with_metric_alignment(self, session, auth_headers):
        """Test creating an initiative with metric_ids"""
        # First get metrics
        metrics_response = session.get(
            f"{BASE_URL}/api/enterprise-metrics",
            headers=auth_headers
        )
        
        metric_ids = []
        if metrics_response.status_code == 200 and len(metrics_response.json()) > 0:
            metric_ids = [metrics_response.json()[0]["id"]]
        
        initiative_data = {
            "name": "TEST_API_Initiative_With_Metrics",
            "description": "Test initiative for API testing with metric alignment",
            "bucket": "Modernization",
            "business_domain": "IT",
            "lifecycle_stage": "Request",
            "executive_sponsor": "Test Sponsor",
            "initiative_owner": "Test Owner",
            "owning_team": "Engineering",
            "supporting_teams": ["IT", "Data"],
            "status": "Discovery",  # Using new status
            "start_date": "2024-01-01",
            "target_end_date": "2024-12-31",
            "metric_ids": metric_ids,
            "milestones": [],
            "risks": [],
            "financial": {
                "approved_budget": 100000,
                "forecasted_spend": 95000,
                "actual_spend": 25000,
                "roi_hypothesis": "Test ROI"
            },
            "team_members": []
        }
        
        response = session.post(
            f"{BASE_URL}/api/initiatives",
            json=initiative_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == initiative_data["name"]
        assert data["status"] == "Discovery"
        assert data["metric_ids"] == metric_ids
        
        # Store for cleanup
        self.__class__.created_initiative_id = data["id"]
    
    def test_initiative_with_new_status_values(self, session, auth_headers):
        """Test creating initiatives with each new status value"""
        new_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
        
        for status in new_statuses:
            initiative_data = {
                "name": f"TEST_Status_{status.replace(' ', '_')}",
                "description": f"Testing {status} status",
                "bucket": "Stabilization",
                "business_domain": "Sales",
                "lifecycle_stage": "Request",
                "owning_team": "Sales",
                "status": status,
                "start_date": "2024-01-01",
                "target_end_date": "2024-06-30",
                "metric_ids": []
            }
            
            response = session.post(
                f"{BASE_URL}/api/initiatives",
                json=initiative_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed to create initiative with status {status}"
            assert response.json()["status"] == status
    
    def test_filter_initiatives_by_status(self, session, auth_headers):
        """Test filtering initiatives by new status values"""
        response = session.get(
            f"{BASE_URL}/api/initiatives?status=Discovery",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for initiative in data:
            assert initiative["status"] == "Discovery"
    
    def test_filter_initiatives_by_metric(self, session, auth_headers):
        """Test filtering initiatives by metric_id"""
        # Get a metric
        metrics_response = session.get(
            f"{BASE_URL}/api/enterprise-metrics",
            headers=auth_headers
        )
        
        if metrics_response.status_code == 200 and len(metrics_response.json()) > 0:
            metric_id = metrics_response.json()[0]["id"]
            
            response = session.get(
                f"{BASE_URL}/api/initiatives?metric_id={metric_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200


class TestSeedData:
    """Test seed data endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD,
            "name": "Demo User", "role": "admin"
        })
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json()['token']}"}
        pytest.skip("Auth failed")
    
    def test_seed_data_creates_metrics_and_initiatives(self, session, auth_headers):
        """Test POST /seed creates sample data"""
        response = session.post(
            f"{BASE_URL}/api/seed",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "6 enterprise metrics" in data["message"]
        assert "8 initiatives" in data["message"]
    
    def test_verify_seeded_metrics(self, session, auth_headers):
        """Verify seeded metrics exist"""
        response = session.get(
            f"{BASE_URL}/api/enterprise-metrics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        metrics = response.json()
        
        # Check for expected metric names
        metric_names = [m["name"] for m in metrics]
        expected = ["Quote-to-Order Cycle Time", "Solution Design Accuracy", "On-Time Delivery Rate"]
        
        for name in expected:
            assert name in metric_names, f"Missing seeded metric: {name}"
    
    def test_verify_seeded_initiatives_have_new_statuses(self, session, auth_headers):
        """Verify seeded initiatives have new status values"""
        response = session.get(
            f"{BASE_URL}/api/initiatives",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        initiatives = response.json()
        
        valid_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
        
        for init in initiatives:
            assert init["status"] in valid_statuses, f"Initiative {init['name']} has invalid status: {init['status']}"


class TestRootEndpoint:
    """Test API root endpoint"""
    
    def test_api_root(self):
        """Test API root returns correct app name"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Code Red Initiatives API"
        assert "version" in data


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests complete"""
    def cleanup_func():
        session = requests.Session()
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            headers = {"Authorization": f"Bearer {response.json()['token']}"}
            
            # Delete test initiatives
            initiatives = session.get(f"{BASE_URL}/api/initiatives", headers=headers)
            if initiatives.status_code == 200:
                for init in initiatives.json():
                    if init["name"].startswith("TEST_"):
                        session.delete(f"{BASE_URL}/api/initiatives/{init['id']}", headers=headers)
            
            # Delete test metrics
            metrics = session.get(f"{BASE_URL}/api/enterprise-metrics", headers=headers)
            if metrics.status_code == 200:
                for metric in metrics.json():
                    if metric["name"].startswith("TEST_"):
                        session.delete(f"{BASE_URL}/api/enterprise-metrics/{metric['id']}", headers=headers)
    
    request.addfinalizer(cleanup_func)
