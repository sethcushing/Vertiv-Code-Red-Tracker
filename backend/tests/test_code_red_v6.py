"""
Test Suite for Code Red Initiatives v6 - Backend Refactoring & Reporting Dashboard
Tests for:
1. Backend API health check
2. Authentication 
3. Dashboard Stats API
4. Pipeline API
5. Business Outcomes Tree API
6. Reporting APIs (Pipeline, Business Outcomes, Trends)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://initiative-details.preview.emergentagent.com').rstrip('/')


class TestAuthentication:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    def test_api_root_health(self):
        """Test API root endpoint returns correct version"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Code Red Initiatives API"
        assert "version" in data
        print(f"API Version: {data['version']}")
    
    def test_login_success(self):
        """Test login with valid credentials (admin@test.com/password123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "admin"
        print(f"Login successful, user: {data['user']['name']}, role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_auth_me_endpoint(self, auth_token):
        """Test /auth/me endpoint returns current user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == "admin@test.com"


class TestDashboardStats:
    """Dashboard Stats API tests"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        return response.json().get("token")
    
    def test_dashboard_stats_returns_all_fields(self, auth_token):
        """Test dashboard stats returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        required_fields = [
            "total_strategic_initiatives",
            "not_started_count",
            "discovery_count",
            "frame_count",
            "wip_count",
            "total_projects",
            "total_business_outcomes",
            "total_kpis"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Dashboard Stats: {data}")
    
    def test_dashboard_stats_values_are_integers(self, auth_token):
        """Test dashboard stats values are valid integers"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # All count values should be non-negative integers
        assert isinstance(data["total_strategic_initiatives"], int)
        assert isinstance(data["total_projects"], int)
        assert data["total_strategic_initiatives"] >= 0
        assert data["total_projects"] >= 0


class TestPipelineAPI:
    """Pipeline API tests"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        return response.json().get("token")
    
    def test_pipeline_returns_four_status_columns(self, auth_token):
        """Test pipeline API returns all 4 status columns"""
        response = requests.get(
            f"{BASE_URL}/api/pipeline",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        for status in expected_statuses:
            assert status in data, f"Missing status column: {status}"
        
        print(f"Pipeline columns: {list(data.keys())}")
    
    def test_pipeline_initiatives_have_nested_projects(self, auth_token):
        """Test pipeline initiatives contain nested projects"""
        response = requests.get(
            f"{BASE_URL}/api/pipeline",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Find an initiative with projects
        for status, initiatives in data.items():
            for initiative in initiatives:
                assert "id" in initiative
                assert "name" in initiative
                assert "projects" in initiative
                assert isinstance(initiative["projects"], list)
                
                # Check project structure if any exist
                if initiative["projects"]:
                    project = initiative["projects"][0]
                    assert "id" in project
                    assert "name" in project
                    assert "status" in project
                    print(f"Found initiative '{initiative['name']}' with {len(initiative['projects'])} projects")
                    return
        
        print("No initiatives with projects found")
    
    def test_pipeline_config_endpoint(self, auth_token):
        """Test initiative statuses config endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/config/initiative-statuses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # This endpoint doesn't require auth based on the code
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "Not Started" in data
        assert "Discovery" in data
        assert "Frame" in data
        assert "Work In Progress" in data


class TestBusinessOutcomesTree:
    """Business Outcomes Tree API tests"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        return response.json().get("token")
    
    def test_business_outcomes_tree_structure(self, auth_token):
        """Test business outcomes tree returns 3-level hierarchy"""
        response = requests.get(
            f"{BASE_URL}/api/business-outcomes/tree",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            category = data[0]
            # Level 1: Category
            assert "id" in category
            assert "name" in category
            assert "sub_outcomes" in category
            
            if len(category["sub_outcomes"]) > 0:
                sub_outcome = category["sub_outcomes"][0]
                # Level 2: Sub-Outcome
                assert "id" in sub_outcome
                assert "name" in sub_outcome
                assert "kpis" in sub_outcome
                
                if len(sub_outcome["kpis"]) > 0:
                    kpi = sub_outcome["kpis"][0]
                    # Level 3: KPI
                    assert "id" in kpi
                    assert "name" in kpi
                    assert "current_value" in kpi
                    assert "target_value" in kpi
                    assert "progress_percent" in kpi
                    print(f"Tree structure verified: Category -> Sub-Outcome -> KPI")


class TestReportingAPIs:
    """Reporting Dashboard API tests (NEW)"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        return response.json().get("token")
    
    def test_reports_pipeline_endpoint(self, auth_token):
        """Test /api/reports/pipeline returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/reports/pipeline",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = [
            "initiative_status_distribution",
            "project_status_distribution",
            "total_initiatives",
            "total_projects",
            "total_milestones",
            "completed_milestones",
            "milestone_completion_rate"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check initiative status distribution structure
        assert isinstance(data["initiative_status_distribution"], list)
        if len(data["initiative_status_distribution"]) > 0:
            status_item = data["initiative_status_distribution"][0]
            assert "status" in status_item
            assert "count" in status_item
        
        # Check project status distribution structure
        assert isinstance(data["project_status_distribution"], list)
        if len(data["project_status_distribution"]) > 0:
            status_item = data["project_status_distribution"][0]
            assert "status" in status_item
            assert "count" in status_item
        
        print(f"Reports Pipeline: {data['total_initiatives']} initiatives, {data['total_projects']} projects, {data['milestone_completion_rate']}% milestone completion")
    
    def test_reports_business_outcomes_endpoint(self, auth_token):
        """Test /api/reports/business-outcomes returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/reports/business-outcomes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = [
            "category_stats",
            "total_categories",
            "total_sub_outcomes",
            "total_kpis",
            "overall_progress",
            "kpi_performance"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check category stats structure
        assert isinstance(data["category_stats"], list)
        if len(data["category_stats"]) > 0:
            cat = data["category_stats"][0]
            assert "id" in cat
            assert "name" in cat
            assert "sub_outcomes_count" in cat
            assert "kpis_count" in cat
            assert "avg_progress" in cat
            assert "on_track" in cat
            assert "at_risk" in cat
            assert "off_track" in cat
        
        # Check KPI performance structure
        assert "on_track" in data["kpi_performance"]
        assert "at_risk" in data["kpi_performance"]
        assert "off_track" in data["kpi_performance"]
        
        print(f"Reports Business Outcomes: {data['total_categories']} categories, {data['total_kpis']} KPIs, {data['overall_progress']}% progress")
    
    def test_reports_trends_endpoint(self, auth_token):
        """Test /api/reports/trends returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/reports/trends",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "kpi_trends" in data
        assert "total_kpis_with_history" in data
        assert isinstance(data["kpi_trends"], list)
        
        # Check KPI trend structure
        if len(data["kpi_trends"]) > 0:
            kpi_trend = data["kpi_trends"][0]
            assert "id" in kpi_trend
            assert "name" in kpi_trend
            assert "unit" in kpi_trend
            assert "target_value" in kpi_trend
            assert "direction" in kpi_trend
            assert "current_value" in kpi_trend
            assert "progress" in kpi_trend
            assert "trend" in kpi_trend
            
            # Check trend data structure
            if len(kpi_trend["trend"]) > 0:
                trend_point = kpi_trend["trend"][0]
                assert "date" in trend_point
                assert "value" in trend_point
        
        print(f"Reports Trends: {data['total_kpis_with_history']} KPIs with historical data")
    
    def test_reports_pipeline_status_distribution_has_all_statuses(self, auth_token):
        """Test pipeline report has all 4 initiative statuses"""
        response = requests.get(
            f"{BASE_URL}/api/reports/pipeline",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        status_names = [s["status"] for s in data["initiative_status_distribution"]]
        
        for status in expected_statuses:
            assert status in status_names, f"Missing status: {status}"


class TestModularBackendStructure:
    """Tests to verify backend modular structure is working"""
    
    @pytest.fixture(scope='class')
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        return response.json().get("token")
    
    def test_strategic_initiatives_endpoint(self, auth_token):
        """Test strategic initiatives endpoint (from routes/initiatives.py)"""
        response = requests.get(
            f"{BASE_URL}/api/strategic-initiatives",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            initiative = data[0]
            assert "id" in initiative
            assert "name" in initiative
            assert "status" in initiative
            print(f"Strategic Initiatives endpoint working, found {len(data)} initiatives")
    
    def test_projects_endpoint(self, auth_token):
        """Test projects endpoint (from routes/initiatives.py)"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Projects endpoint working, found {len(data)} projects")
    
    def test_business_outcomes_categories_endpoint(self, auth_token):
        """Test categories endpoint (from routes/business_outcomes.py)"""
        response = requests.get(
            f"{BASE_URL}/api/business-outcomes/categories",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Categories endpoint working, found {len(data)} categories")
    
    def test_kpis_endpoint(self, auth_token):
        """Test KPIs endpoint (from routes/business_outcomes.py)"""
        response = requests.get(
            f"{BASE_URL}/api/business-outcomes/kpis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"KPIs endpoint working, found {len(data)} KPIs")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
