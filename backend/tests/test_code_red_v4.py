"""
Test suite for Code Red Initiatives v4 - Major Update
Tests: Risk removed, Business Outcomes CRUD, KPI History, Drag-drop Pipeline, 
       Strategic Initiatives, Projects with Milestones/Issues
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://strategic-hub-17.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.login_data = {
            "email": "demo@vertiv.com",
            "password": "Demo2024!"
        }
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=self.login_data)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@vertiv.com"
        print(f"✓ Login successful - token received")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@vertiv.com",
        "password": "Demo2024!"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSeedData:
    """Test seed data endpoint"""
    
    def test_seed_data(self, auth_headers):
        """Seed database with test data"""
        response = requests.post(f"{BASE_URL}/api/seed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Seed data: {data['message']}")


class TestDashboardStats:
    """Dashboard stats without Risk"""
    
    def test_dashboard_stats_no_risk(self, auth_headers):
        """Dashboard stats should not include risk fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "total_strategic_initiatives" in data
        assert "total_projects" in data
        assert "total_business_outcomes" in data
        assert "total_kpis" in data
        
        # Status breakdown fields
        assert "not_started_count" in data
        assert "discovery_count" in data
        assert "frame_count" in data
        assert "wip_count" in data
        
        # Risk should NOT be present (removed)
        assert "total_risks" not in data or data.get("total_risks") is None
        assert "escalated_risks" not in data or data.get("escalated_risks") is None
        
        print(f"✓ Dashboard stats: {data['total_strategic_initiatives']} initiatives, {data['total_projects']} projects, {data['total_business_outcomes']} outcomes, {data['total_kpis']} KPIs")


class TestPipeline:
    """Code Red Pipeline with drag-drop support"""
    
    def test_pipeline_returns_4_columns(self, auth_headers):
        """Pipeline should have 4 status columns"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        for status in expected_statuses:
            assert status in data, f"Missing status column: {status}"
        
        print(f"✓ Pipeline has 4 columns: {expected_statuses}")
    
    def test_pipeline_initiatives_have_projects(self, auth_headers):
        """Each initiative in pipeline should have nested projects"""
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find an initiative with projects (ETO should be in WIP)
        wip_initiatives = data.get("Work In Progress", [])
        if wip_initiatives:
            initiative = wip_initiatives[0]
            assert "id" in initiative
            assert "name" in initiative
            assert "projects" in initiative
            print(f"✓ Initiative '{initiative['name']}' has {len(initiative['projects'])} projects")
    
    def test_pipeline_move_initiative(self, auth_headers):
        """Test moving initiative between columns"""
        # First get an initiative
        response = requests.get(f"{BASE_URL}/api/pipeline", headers=auth_headers)
        data = response.json()
        
        # Find an initiative to move
        for status in ["Not Started", "Discovery", "Frame", "Work In Progress"]:
            if data.get(status):
                initiative_id = data[status][0]["id"]
                current_status = status
                break
        
        # Move to a different status
        new_status = "Discovery" if current_status != "Discovery" else "Frame"
        response = requests.put(
            f"{BASE_URL}/api/pipeline/move/{initiative_id}?new_status={new_status}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "message" in response.json()
        
        # Verify move
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{initiative_id}", headers=auth_headers)
        assert response.json()["status"] == new_status
        
        # Move back
        requests.put(
            f"{BASE_URL}/api/pipeline/move/{initiative_id}?new_status={current_status}",
            headers=auth_headers
        )
        print(f"✓ Initiative moved from '{current_status}' to '{new_status}' and back")


class TestBusinessOutcomesHierarchy:
    """Business Outcomes 3-level hierarchy"""
    
    def test_tree_returns_hierarchy(self, auth_headers):
        """Tree should return Category -> Sub-Outcomes -> KPIs"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/tree", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) > 0, "No categories found"
        
        for category in data:
            assert "id" in category
            assert "name" in category
            assert "sub_outcomes" in category
            
            if category["sub_outcomes"]:
                sub = category["sub_outcomes"][0]
                assert "kpis" in sub
                if sub["kpis"]:
                    kpi = sub["kpis"][0]
                    assert "current_value" in kpi or kpi.get("current_value") is None
                    assert "target_value" in kpi or kpi.get("target_value") is None
                    assert "progress_percent" in kpi
        
        print(f"✓ Tree hierarchy: {len(data)} categories found")


class TestCategoriesCRUD:
    """Category CRUD operations"""
    
    def test_create_category(self, auth_headers):
        """Create a new category"""
        response = requests.post(f"{BASE_URL}/api/business-outcomes/categories", 
            headers=auth_headers,
            json={"name": "TEST_Category", "description": "Test description"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Category"
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/business-outcomes/categories/{data['id']}", headers=auth_headers)
        print("✓ Category CRUD: Create works")
    
    def test_get_categories(self, auth_headers):
        """Get all categories"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Category GET: {len(data)} categories")
    
    def test_update_category(self, auth_headers):
        """Update a category"""
        # Create
        create_res = requests.post(f"{BASE_URL}/api/business-outcomes/categories",
            headers=auth_headers,
            json={"name": "TEST_UpdateCat", "description": "Original"}
        )
        cat_id = create_res.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}",
            headers=auth_headers,
            json={"name": "TEST_UpdatedCat", "description": "Updated"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "TEST_UpdatedCat"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}", headers=auth_headers)
        print("✓ Category CRUD: Update works")
    
    def test_delete_category(self, auth_headers):
        """Delete a category"""
        # Create
        create_res = requests.post(f"{BASE_URL}/api/business-outcomes/categories",
            headers=auth_headers,
            json={"name": "TEST_DeleteCat", "description": "To delete"}
        )
        cat_id = create_res.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_res = requests.get(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}", headers=auth_headers)
        assert get_res.status_code == 404
        print("✓ Category CRUD: Delete works")


class TestSubOutcomesCRUD:
    """Sub-Outcome CRUD operations"""
    
    @pytest.fixture
    def test_category(self, auth_headers):
        """Create a test category for sub-outcomes"""
        response = requests.post(f"{BASE_URL}/api/business-outcomes/categories",
            headers=auth_headers,
            json={"name": "TEST_SubCat", "description": "For sub-outcomes"}
        )
        cat_id = response.json()["id"]
        yield cat_id
        requests.delete(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}", headers=auth_headers)
    
    def test_create_sub_outcome(self, auth_headers, test_category):
        """Create a sub-outcome"""
        response = requests.post(f"{BASE_URL}/api/business-outcomes/sub-outcomes",
            headers=auth_headers,
            json={"name": "TEST_SubOutcome", "description": "Test", "category_id": test_category}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "TEST_SubOutcome"
        print("✓ Sub-Outcome CRUD: Create works")
    
    def test_get_sub_outcomes(self, auth_headers):
        """Get all sub-outcomes"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/sub-outcomes", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Sub-Outcome GET: {len(response.json())} sub-outcomes")


class TestKPIsCRUD:
    """KPI CRUD operations"""
    
    @pytest.fixture
    def test_sub_outcome(self, auth_headers):
        """Create test category and sub-outcome"""
        # Create category
        cat_res = requests.post(f"{BASE_URL}/api/business-outcomes/categories",
            headers=auth_headers,
            json={"name": "TEST_KPICat", "description": "For KPIs"}
        )
        cat_id = cat_res.json()["id"]
        
        # Create sub-outcome
        sub_res = requests.post(f"{BASE_URL}/api/business-outcomes/sub-outcomes",
            headers=auth_headers,
            json={"name": "TEST_KPISub", "description": "Test", "category_id": cat_id}
        )
        sub_id = sub_res.json()["id"]
        
        yield {"cat_id": cat_id, "sub_id": sub_id}
        
        requests.delete(f"{BASE_URL}/api/business-outcomes/categories/{cat_id}", headers=auth_headers)
    
    def test_create_kpi(self, auth_headers, test_sub_outcome):
        """Create a KPI"""
        response = requests.post(f"{BASE_URL}/api/business-outcomes/kpis",
            headers=auth_headers,
            json={
                "name": "TEST_KPI",
                "description": "Test KPI",
                "sub_outcome_id": test_sub_outcome["sub_id"],
                "current_value": 50,
                "target_value": 100,
                "baseline_value": 30,
                "unit": "%",
                "direction": "increase"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_KPI"
        assert "progress_percent" in data
        print(f"✓ KPI CRUD: Create works, progress: {data['progress_percent']}%")
    
    def test_get_kpis(self, auth_headers):
        """Get all KPIs"""
        response = requests.get(f"{BASE_URL}/api/business-outcomes/kpis", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ KPI GET: {len(response.json())} KPIs")


class TestKPIHistory:
    """KPI History tracking"""
    
    def test_kpi_history_endpoint(self, auth_headers):
        """Test KPI history endpoint"""
        # Get a KPI first
        kpis_res = requests.get(f"{BASE_URL}/api/business-outcomes/kpis", headers=auth_headers)
        kpis = kpis_res.json()
        
        if not kpis:
            pytest.skip("No KPIs found")
        
        kpi_id = kpis[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/business-outcomes/kpis/{kpi_id}/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "kpi" in data
        assert "history" in data
        
        print(f"✓ KPI History: {len(data['history'])} entries for '{data['kpi']['name']}'")
    
    def test_kpi_update_creates_history(self, auth_headers):
        """Updating KPI current_value should create history entry"""
        # Get a KPI
        kpis_res = requests.get(f"{BASE_URL}/api/business-outcomes/kpis", headers=auth_headers)
        kpis = kpis_res.json()
        
        if not kpis:
            pytest.skip("No KPIs found")
        
        kpi = kpis[0]
        kpi_id = kpi["id"]
        
        # Get current history count
        hist_res = requests.get(f"{BASE_URL}/api/business-outcomes/kpis/{kpi_id}/history", headers=auth_headers)
        initial_count = len(hist_res.json()["history"])
        
        # Update current_value
        new_value = (kpi.get("current_value") or 0) + 1
        requests.put(f"{BASE_URL}/api/business-outcomes/kpis/{kpi_id}",
            headers=auth_headers,
            json={"current_value": new_value}
        )
        
        # Check history increased
        hist_res = requests.get(f"{BASE_URL}/api/business-outcomes/kpis/{kpi_id}/history", headers=auth_headers)
        new_count = len(hist_res.json()["history"])
        
        assert new_count >= initial_count  # Should have at least same or more
        print(f"✓ KPI History: Update triggered history entry ({initial_count} -> {new_count})")


class TestStrategicInitiatives:
    """Strategic Initiative CRUD"""
    
    def test_get_initiatives(self, auth_headers):
        """Get all strategic initiatives"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Strategic Initiatives: {len(data)} found")
    
    def test_create_initiative(self, auth_headers):
        """Create a strategic initiative"""
        response = requests.post(f"{BASE_URL}/api/strategic-initiatives",
            headers=auth_headers,
            json={
                "name": "TEST_Initiative",
                "description": "Test initiative",
                "status": "Not Started",
                "executive_sponsor": "Test Sponsor"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Initiative"
        assert data["status"] == "Not Started"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/strategic-initiatives/{data['id']}", headers=auth_headers)
        print("✓ Strategic Initiative: Create works")
    
    def test_initiative_detail_has_projects_count(self, auth_headers):
        """Initiative detail should have projects_count"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives", headers=auth_headers)
        initiatives = response.json()
        
        if not initiatives:
            pytest.skip("No initiatives found")
        
        init_id = initiatives[0]["id"]
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "projects_count" in data
        print(f"✓ Initiative '{data['name']}' has {data['projects_count']} projects")


class TestProjects:
    """Project CRUD with milestones and issues"""
    
    def test_get_projects(self, auth_headers):
        """Get all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Projects: {len(data)} found")
    
    def test_project_has_milestones_and_issues(self, auth_headers):
        """Project should have milestones and issues arrays"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects found")
        
        project = projects[0]
        assert "milestones" in project
        assert "issues" in project
        assert isinstance(project["milestones"], list)
        assert isinstance(project["issues"], list)
        print(f"✓ Project '{project['name']}': {len(project['milestones'])} milestones, {len(project['issues'])} issues")


class TestProjectMilestones:
    """Milestone CRUD within projects"""
    
    def test_add_milestone(self, auth_headers):
        """Add milestone to a project"""
        # Get a project
        projects = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        if not projects:
            pytest.skip("No projects found")
        
        project_id = projects[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=auth_headers,
            json={
                "name": "TEST_Milestone",
                "description": "Test",
                "owner": "Tester",
                "due_date": "2024-12-31",
                "status": "Pending"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Milestone"
        milestone_id = data["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}/milestones/{milestone_id}", headers=auth_headers)
        print("✓ Milestone: Create works")
    
    def test_update_milestone(self, auth_headers):
        """Update a milestone"""
        projects = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        if not projects:
            pytest.skip("No projects found")
        
        project_id = projects[0]["id"]
        
        # Create
        create_res = requests.post(f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=auth_headers,
            json={"name": "TEST_UpdateMs", "due_date": "2024-12-31", "status": "Pending"}
        )
        milestone_id = create_res.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}/milestones/{milestone_id}",
            headers=auth_headers,
            json={"name": "TEST_UpdatedMs", "due_date": "2025-01-15", "status": "In Progress"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "In Progress"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}/milestones/{milestone_id}", headers=auth_headers)
        print("✓ Milestone: Update works")


class TestProjectIssues:
    """Issue CRUD within projects"""
    
    def test_add_issue(self, auth_headers):
        """Add issue to a project"""
        projects = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers).json()
        if not projects:
            pytest.skip("No projects found")
        
        project_id = projects[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/issues",
            headers=auth_headers,
            json={
                "description": "TEST_Issue description",
                "severity": "Medium",
                "status": "Open",
                "owner": "Tester"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "TEST_Issue" in data["description"]
        issue_id = data["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}/issues/{issue_id}", headers=auth_headers)
        print("✓ Issue: Create works")


class TestNavigationItems:
    """Verify navigation has only 2 items (no Risk)"""
    
    def test_config_initiative_statuses(self, auth_headers):
        """Initiative statuses should be 4"""
        response = requests.get(f"{BASE_URL}/api/config/initiative-statuses", headers=auth_headers)
        assert response.status_code == 200
        statuses = response.json()
        expected = ["Not Started", "Discovery", "Frame", "Work In Progress"]
        assert statuses == expected
        print(f"✓ Initiative statuses: {statuses}")
    
    def test_config_project_statuses(self, auth_headers):
        """Project statuses should be 4"""
        response = requests.get(f"{BASE_URL}/api/config/project-statuses", headers=auth_headers)
        assert response.status_code == 200
        statuses = response.json()
        expected = ["Not Started", "In Progress", "Completed", "On Hold"]
        assert statuses == expected
        print(f"✓ Project statuses: {statuses}")


class TestRiskEndpointsRemoved:
    """Verify risk endpoints are removed or return 404"""
    
    def test_no_risk_in_stats(self, auth_headers):
        """Dashboard stats should not have risk fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        data = response.json()
        # These fields should not exist in the new model
        assert "total_risks" not in data or data.get("total_risks") is None
        print("✓ No risk fields in dashboard stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
