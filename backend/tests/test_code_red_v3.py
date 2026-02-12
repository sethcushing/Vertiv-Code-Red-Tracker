"""
Backend API Tests for Code Red Initiatives - Major Data Model Refactoring v3
Tests for:
1. Authentication with demo@vertiv.com / Demo2024!
2. Dashboard Stats API
3. Pipeline API (Strategic Initiatives grouped by status with nested Projects)
4. Business Outcomes Tree API (3-level hierarchy: Category → Sub-Outcomes → KPIs)
5. Strategic Initiatives CRUD
6. Projects CRUD
7. Seed endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://strategic-hub-17.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@vertiv.com"
        assert data["user"]["name"] == "Demo Executive"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestDashboardStats:
    """Dashboard Stats API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_returns_all_fields(self):
        """Test dashboard stats returns required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        required_fields = [
            "total_strategic_initiatives",
            "not_started_count",
            "discovery_count",
            "frame_count",
            "wip_count",
            "total_projects",
            "total_business_outcomes",
            "total_kpis",
            "total_risks",
            "escalated_risks"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_dashboard_stats_expected_counts(self):
        """Test dashboard stats has expected seed data counts"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Expected counts from seed data
        assert data["total_strategic_initiatives"] == 5, "Should have 5 Strategic Initiatives"
        assert data["total_projects"] == 4, "Should have 4 Projects"
        assert data["total_business_outcomes"] == 3, "Should have 3 Business Outcome Categories"


class TestPipelineAPI:
    """Pipeline API tests - Code Red Pipeline with 4 columns"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pipeline_returns_4_status_columns(self):
        """Test pipeline returns 4 status columns"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        for status in expected_statuses:
            assert status in data, f"Missing status column: {status}"
    
    def test_pipeline_initiatives_have_nested_projects(self):
        """Test pipeline initiatives have nested projects"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # WIP column should have ETO initiative with projects
        wip_initiatives = data["Work In Progress"]
        assert len(wip_initiatives) > 0, "Should have at least one WIP initiative"
        
        eto_initiative = next((i for i in wip_initiatives if i["name"] == "ETO"), None)
        assert eto_initiative is not None, "Should have ETO initiative in WIP"
        assert "projects" in eto_initiative
        assert len(eto_initiative["projects"]) >= 3, "ETO should have at least 3 projects"
    
    def test_project_has_required_fields(self):
        """Test projects in pipeline have required fields"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find a project to test
        for status, initiatives in data.items():
            for initiative in initiatives:
                if initiative.get("projects"):
                    project = initiative["projects"][0]
                    # Check required project fields
                    assert "id" in project
                    assert "name" in project
                    assert "status" in project
                    assert "owner" in project
                    assert "milestones_count" in project
                    assert "risks_count" in project
                    return
        pytest.fail("No projects found to test")


class TestBusinessOutcomesTree:
    """Business Outcomes Tree API tests - 3-level hierarchy"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_tree_returns_categories(self):
        """Test tree returns business outcome categories (Level 1)"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3, "Should have 3 categories: ETO, Quality, PDSL"
        category_names = [c["name"] for c in data]
        assert "ETO" in category_names
        assert "Quality" in category_names
        assert "PDSL" in category_names
    
    def test_categories_have_sub_outcomes(self):
        """Test categories have sub-outcomes (Level 2)"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        eto_category = next(c for c in data if c["name"] == "ETO")
        assert "sub_outcomes" in eto_category
        assert len(eto_category["sub_outcomes"]) >= 3, "ETO should have at least 3 sub-outcomes"
        
        # Check sub-outcome names
        sub_outcome_names = [s["name"] for s in eto_category["sub_outcomes"]]
        assert "Data and Order Integrity" in sub_outcome_names
        assert "Material Readiness" in sub_outcome_names
        assert "Planning Stability" in sub_outcome_names
    
    def test_sub_outcomes_have_kpis(self):
        """Test sub-outcomes have KPIs (Level 3)"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        eto_category = next(c for c in data if c["name"] == "ETO")
        data_integrity = next(s for s in eto_category["sub_outcomes"] if s["name"] == "Data and Order Integrity")
        
        assert "kpis" in data_integrity
        assert len(data_integrity["kpis"]) >= 3, "Data and Order Integrity should have at least 3 KPIs"
        
        kpi_names = [k["name"] for k in data_integrity["kpis"]]
        assert "Quote Cycle Time" in kpi_names
        assert "Clean Order Entry Rate" in kpi_names
    
    def test_kpis_have_progress_tracking(self):
        """Test KPIs have current, target, baseline, and progress percentage"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find Quote Cycle Time KPI
        for category in data:
            for sub in category.get("sub_outcomes", []):
                for kpi in sub.get("kpis", []):
                    if kpi["name"] == "Quote Cycle Time":
                        assert "current_value" in kpi
                        assert "target_value" in kpi
                        assert "baseline_value" in kpi
                        assert "progress_percent" in kpi
                        assert "unit" in kpi
                        assert kpi["unit"] == "days"
                        assert kpi["current_value"] == 14
                        assert kpi["target_value"] == 5
                        assert kpi["baseline_value"] == 21
                        return
        pytest.fail("Quote Cycle Time KPI not found")


class TestStrategicInitiativesAPI:
    """Strategic Initiatives CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_strategic_initiatives(self):
        """Test GET all strategic initiatives"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5, "Should have 5 strategic initiatives"
    
    def test_get_strategic_initiative_by_id(self):
        """Test GET single strategic initiative"""
        # First get all
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=self.headers)
        initiatives = response.json()
        initiative_id = initiatives[0]["id"]
        
        # Get single
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{initiative_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == initiative_id
        assert "projects_count" in data
    
    def test_create_and_delete_strategic_initiative(self):
        """Test CREATE and DELETE strategic initiative"""
        # Create
        new_initiative = {
            "name": "TEST_New Initiative",
            "description": "Test description",
            "status": "Not Started",
            "executive_sponsor": "Test Sponsor"
        }
        response = requests.post(f"{BASE_URL}/api/strategic-initiatives", headers=self.headers, json=new_initiative)
        assert response.status_code == 200
        created = response.json()
        assert created["name"] == "TEST_New Initiative"
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/strategic-initiatives/{created['id']}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{created['id']}", headers=self.headers)
        assert response.status_code == 404


class TestProjectsAPI:
    """Projects CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_projects(self):
        """Test GET all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4, "Should have 4 projects"
    
    def test_get_project_by_id(self):
        """Test GET single project with milestones and risks"""
        # First get all
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = response.json()
        project_id = projects[0]["id"]
        
        # Get single
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert "milestones" in data
        assert "risks" in data
        assert "issues" in data


class TestSeedEndpoint:
    """Seed endpoint test"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_seed_creates_expected_data(self):
        """Test seed endpoint creates expected data"""
        # Seed
        response = requests.post(f"{BASE_URL}/api/seed", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check message mentions expected counts
        assert "3 business outcome categories" in data["message"]
        assert "7 sub-outcomes" in data["message"]
        assert "11 KPIs" in data["message"]
        assert "5 strategic initiatives" in data["message"]
        assert "4 projects" in data["message"]


class TestConfigEndpoints:
    """Config endpoints tests"""
    
    def test_initiative_statuses(self):
        """Test get initiative statuses - no auth required"""
        response = requests.get(f"{BASE_URL}/api/config/initiative-statuses")
        assert response.status_code == 200
        data = response.json()
        assert data == ["Not Started", "Discovery", "Frame", "Work In Progress"]
    
    def test_project_statuses(self):
        """Test get project statuses - no auth required"""
        response = requests.get(f"{BASE_URL}/api/config/project-statuses")
        assert response.status_code == 200
        data = response.json()
        assert data == ["Not Started", "In Progress", "Completed", "On Hold"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
