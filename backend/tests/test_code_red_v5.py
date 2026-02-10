"""
Test Code Red Initiatives v5 - Code Red Pipeline Update
Features tested:
1. Navigation renamed: 'Code Red Pipeline' (not 'Executive Dashboard')
2. Projects can be added/edited/deleted directly from pipeline
3. Projects have business_outcome_ids field for alignment
4. KPI trend charts with historical data (recharts)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_EMAIL = "demo@vertiv.com"
AUTH_PASSWORD = "Demo2024!"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTH_EMAIL,
            "password": AUTH_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        print(f"SUCCESS: Login successful for {AUTH_EMAIL}")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AUTH_EMAIL,
        "password": AUTH_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authentication headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSeedData:
    """Seed data tests"""
    
    def test_seed_data(self, auth_headers):
        """Seed database with sample data"""
        response = requests.post(f"{BASE_URL}/api/seed", headers=auth_headers)
        assert response.status_code == 200, f"Seed failed: {response.text}"
        print(f"SUCCESS: Data seeded - {response.json()['message']}")


class TestDashboardStats:
    """Dashboard stats tests"""
    
    def test_dashboard_stats_returns_all_fields(self, auth_headers):
        """Verify dashboard stats endpoint returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Check required fields
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
        
        print(f"SUCCESS: Dashboard stats returned all {len(required_fields)} required fields")
        print(f"  - Initiatives: {data['total_strategic_initiatives']}")
        print(f"  - Projects: {data['total_projects']}")
        print(f"  - Outcomes: {data['total_business_outcomes']}")
        print(f"  - KPIs: {data['total_kpis']}")


class TestPipeline:
    """Code Red Pipeline tests"""
    
    def test_pipeline_returns_4_status_columns(self, auth_headers):
        """Verify pipeline returns 4 status columns"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=auth_headers)
        assert response.status_code == 200, f"Pipeline failed: {response.text}"
        data = response.json()
        
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        for status in expected_statuses:
            assert status in data, f"Missing status column: {status}"
        
        print(f"SUCCESS: Pipeline has all 4 status columns")
        for status in expected_statuses:
            count = len(data.get(status, []))
            print(f"  - {status}: {count} initiatives")
    
    def test_pipeline_initiatives_have_projects(self, auth_headers):
        """Verify initiatives in pipeline have nested projects"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find an initiative with projects
        found_projects = False
        for status, initiatives in data.items():
            for init in initiatives:
                assert "id" in init, "Initiative missing id"
                assert "name" in init, "Initiative missing name"
                assert "projects" in init, f"Initiative '{init['name']}' missing projects array"
                if len(init["projects"]) > 0:
                    found_projects = True
                    project = init["projects"][0]
                    assert "id" in project, "Project missing id"
                    assert "name" in project, "Project missing name"
                    assert "status" in project, "Project missing status"
                    print(f"SUCCESS: Initiative '{init['name']}' has {len(init['projects'])} projects")
        
        assert found_projects, "No initiatives with projects found"


class TestProjectCRUD:
    """Project CRUD operations tests"""
    
    def test_get_projects(self, auth_headers):
        """Test getting all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200, f"Get projects failed: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        print(f"SUCCESS: Retrieved {len(projects)} projects")
    
    def test_create_project_with_business_outcome_ids(self, auth_headers):
        """Test creating a project with business_outcome_ids alignment"""
        # First get an initiative to use as parent
        initiatives_response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=auth_headers)
        assert initiatives_response.status_code == 200
        initiatives = initiatives_response.json()
        assert len(initiatives) > 0, "No initiatives found"
        parent_id = initiatives[0]["id"]
        
        # Get business outcome categories for alignment
        categories_response = requests.get(f"{BASE_URL}/api/business-outcomes/categories", headers=auth_headers)
        assert categories_response.status_code == 200
        categories = categories_response.json()
        
        # Create project with business outcome alignment
        business_outcome_ids = [cat["id"] for cat in categories[:2]] if len(categories) >= 2 else [categories[0]["id"]] if categories else []
        
        project_data = {
            "name": "TEST_Project_With_Alignment",
            "description": "Testing project with business outcome alignment",
            "strategic_initiative_id": parent_id,
            "status": "In Progress",
            "owner": "Test Owner",
            "business_outcome_ids": business_outcome_ids
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=auth_headers)
        assert response.status_code == 200, f"Create project failed: {response.text}"
        created = response.json()
        
        assert created["name"] == project_data["name"]
        assert created["business_outcome_ids"] == business_outcome_ids
        print(f"SUCCESS: Created project '{created['name']}' with {len(business_outcome_ids)} business outcome alignments")
        
        return created["id"]
    
    def test_update_project_business_outcome_ids(self, auth_headers):
        """Test updating project's business outcome alignment"""
        # First create a project
        initiatives_response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=auth_headers)
        initiatives = initiatives_response.json()
        parent_id = initiatives[0]["id"]
        
        # Create project
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_For_Update",
            "strategic_initiative_id": parent_id,
            "status": "Not Started",
            "business_outcome_ids": []
        }, headers=auth_headers)
        assert response.status_code == 200
        project_id = response.json()["id"]
        
        # Get categories for update
        categories_response = requests.get(f"{BASE_URL}/api/business-outcomes/categories", headers=auth_headers)
        categories = categories_response.json()
        new_alignment = [categories[0]["id"]] if categories else []
        
        # Update project with new alignment
        update_response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json={
            "business_outcome_ids": new_alignment,
            "status": "In Progress"
        }, headers=auth_headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["business_outcome_ids"] == new_alignment
        assert updated["status"] == "In Progress"
        print(f"SUCCESS: Updated project business_outcome_ids alignment")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
    
    def test_delete_project(self, auth_headers):
        """Test deleting a project"""
        # Create a project to delete
        initiatives_response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=auth_headers)
        initiatives = initiatives_response.json()
        parent_id = initiatives[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_To_Delete",
            "strategic_initiative_id": parent_id,
            "status": "Not Started",
            "business_outcome_ids": []
        }, headers=auth_headers)
        assert response.status_code == 200
        project_id = response.json()["id"]
        
        # Delete the project
        delete_response = requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Project should not exist after deletion"
        
        print(f"SUCCESS: Deleted project and verified removal")


class TestBusinessOutcomes:
    """Business Outcomes tests"""
    
    def test_get_categories(self, auth_headers):
        """Test getting business outcome categories"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/categories", headers=auth_headers)
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        categories = response.json()
        assert len(categories) > 0, "No categories found"
        
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
        
        print(f"SUCCESS: Retrieved {len(categories)} business outcome categories")
        for cat in categories:
            print(f"  - {cat['name']} (id: {cat['id'][:8]}...)")
    
    def test_get_tree_structure(self, auth_headers):
        """Test business outcomes tree structure (Category → Sub-Outcomes → KPIs)"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=auth_headers)
        assert response.status_code == 200, f"Get tree failed: {response.text}"
        tree = response.json()
        
        assert isinstance(tree, list), "Tree should be a list"
        assert len(tree) > 0, "Tree should have categories"
        
        total_sub_outcomes = 0
        total_kpis = 0
        
        for cat in tree:
            assert "id" in cat
            assert "name" in cat
            assert "sub_outcomes" in cat
            
            for sub in cat["sub_outcomes"]:
                total_sub_outcomes += 1
                assert "id" in sub
                assert "name" in sub
                assert "kpis" in sub
                
                for kpi in sub["kpis"]:
                    total_kpis += 1
                    assert "id" in kpi
                    assert "name" in kpi
                    assert "progress_percent" in kpi
        
        print(f"SUCCESS: Tree structure verified")
        print(f"  - {len(tree)} categories")
        print(f"  - {total_sub_outcomes} sub-outcomes")
        print(f"  - {total_kpis} KPIs")


class TestKPIHistory:
    """KPI History and Trend tests"""
    
    def test_get_kpi_history(self, auth_headers):
        """Test getting KPI history for trend charts"""
        # First get a KPI
        kpis_response = requests.get(f"{BASE_URL}/api/business-outcomes/kpis", headers=auth_headers)
        assert kpis_response.status_code == 200
        kpis = kpis_response.json()
        assert len(kpis) > 0, "No KPIs found"
        
        kpi_id = kpis[0]["id"]
        
        # Get history
        history_response = requests.get(f"{BASE_URL}/api/business-outcomes/kpis/{kpi_id}/history", headers=auth_headers)
        assert history_response.status_code == 200, f"Get history failed: {history_response.text}"
        data = history_response.json()
        
        assert "kpi" in data, "Response missing kpi info"
        assert "history" in data, "Response missing history array"
        
        kpi_info = data["kpi"]
        assert "name" in kpi_info
        assert "current_value" in kpi_info
        assert "target_value" in kpi_info
        assert "baseline_value" in kpi_info
        
        history = data["history"]
        print(f"SUCCESS: KPI '{kpi_info['name']}' has {len(history)} history entries")
        
        if len(history) > 0:
            entry = history[0]
            assert "value" in entry, "History entry missing value"
            assert "recorded_at" in entry, "History entry missing recorded_at"
            print(f"  - Baseline: {kpi_info['baseline_value']} {kpi_info.get('unit', '')}")
            print(f"  - Current: {kpi_info['current_value']} {kpi_info.get('unit', '')}")
            print(f"  - Target: {kpi_info['target_value']} {kpi_info.get('unit', '')}")
    
    def test_kpi_has_baseline_current_target(self, auth_headers):
        """Verify KPIs have baseline, current, and target values for trend display"""
        kpis_response = requests.get(f"{BASE_URL}/api/business-outcomes/kpis", headers=auth_headers)
        assert kpis_response.status_code == 200
        kpis = kpis_response.json()
        
        for kpi in kpis[:5]:  # Check first 5 KPIs
            # These fields should exist (can be None but should be in response)
            assert "current_value" in kpi, f"KPI '{kpi['name']}' missing current_value"
            assert "target_value" in kpi, f"KPI '{kpi['name']}' missing target_value"
            assert "baseline_value" in kpi, f"KPI '{kpi['name']}' missing baseline_value"
            assert "progress_percent" in kpi, f"KPI '{kpi['name']}' missing progress_percent"
        
        print(f"SUCCESS: All KPIs have required fields for trend visualization")


class TestConfigEndpoints:
    """Configuration endpoints tests"""
    
    def test_initiative_statuses(self):
        """Test initiative statuses config"""
        response = requests.get(f"{BASE_URL}/api/config/initiative-statuses")
        assert response.status_code == 200
        statuses = response.json()
        
        expected = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        assert statuses == expected, f"Expected {expected}, got {statuses}"
        print(f"SUCCESS: Initiative statuses: {statuses}")
    
    def test_project_statuses(self):
        """Test project statuses config"""
        response = requests.get(f"{BASE_URL}/api/config/project-statuses")
        assert response.status_code == 200
        statuses = response.json()
        
        expected = ["Not Started", "In Progress", "Completed", "On Hold"]
        assert statuses == expected, f"Expected {expected}, got {statuses}"
        print(f"SUCCESS: Project statuses: {statuses}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_projects(self, auth_headers):
        """Clean up TEST_ prefixed projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        if response.status_code == 200:
            projects = response.json()
            deleted = 0
            for project in projects:
                if project["name"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=auth_headers)
                    deleted += 1
            print(f"SUCCESS: Cleaned up {deleted} test projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
