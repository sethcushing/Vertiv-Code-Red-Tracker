"""
Backend API Tests for Code Red Initiatives App
Testing: KPI Tree, Metric Categories (ETO/Quality), Dashboard, Seed Data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@vertiv.com"
TEST_PASSWORD = "Demo2024!"


class TestAuthentication:
    """Test login functionality"""
    
    def test_login_success(self):
        """Test successful login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"LOGIN SUCCESS: User {data['user']['name']} logged in")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestMetricCategories:
    """Test metric categories configuration - should only return ETO and Quality"""
    
    def test_metric_categories_returns_only_eto_and_quality(self, auth_headers):
        """Verify metric categories only contain ETO and Quality"""
        response = requests.get(f"{BASE_URL}/api/config/metric-categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) == 2
        assert "ETO" in categories
        assert "Quality" in categories
        # Verify old categories are removed
        assert "Planning" not in categories
        assert "Sales" not in categories
        assert "Delivery" not in categories
        assert "Customer Satisfaction" not in categories
        print(f"METRIC CATEGORIES: {categories}")


class TestEnterpriseMetrics:
    """Test Core Business Outcomes (Enterprise Metrics) endpoints"""
    
    def test_get_all_metrics(self, auth_headers):
        """Get all enterprise metrics"""
        response = requests.get(f"{BASE_URL}/api/enterprise-metrics", headers=auth_headers)
        assert response.status_code == 200
        metrics = response.json()
        assert isinstance(metrics, list)
        print(f"METRICS COUNT: {len(metrics)}")
        
    def test_metrics_have_eto_and_quality_categories_only(self, auth_headers):
        """Verify all metrics belong to ETO or Quality categories"""
        response = requests.get(f"{BASE_URL}/api/enterprise-metrics", headers=auth_headers)
        assert response.status_code == 200
        metrics = response.json()
        
        for metric in metrics:
            category = metric.get("category")
            assert category in ["ETO", "Quality"], f"Invalid category: {category}"
        
        # Count metrics by category
        eto_count = sum(1 for m in metrics if m.get("category") == "ETO")
        quality_count = sum(1 for m in metrics if m.get("category") == "Quality")
        
        print(f"ETO metrics: {eto_count}, Quality metrics: {quality_count}")
        assert eto_count > 0, "Should have ETO metrics"
        assert quality_count > 0, "Should have Quality metrics"


class TestKPITree:
    """Test KPI Tree endpoint - new hierarchy: Category -> Outcomes -> Initiatives by Status"""
    
    def test_kpi_tree_structure(self, auth_headers):
        """Test KPI tree returns correct hierarchical structure"""
        response = requests.get(f"{BASE_URL}/api/kpi-tree", headers=auth_headers)
        assert response.status_code == 200
        tree = response.json()
        assert isinstance(tree, list)
        print(f"KPI TREE: {len(tree)} categories")
        
    def test_kpi_tree_has_eto_and_quality_categories(self, auth_headers):
        """Verify KPI tree has ETO and Quality categories at top level"""
        response = requests.get(f"{BASE_URL}/api/kpi-tree", headers=auth_headers)
        assert response.status_code == 200
        tree = response.json()
        
        categories = [node.get("category") for node in tree]
        assert "ETO" in categories, "KPI Tree should have ETO category"
        assert "Quality" in categories, "KPI Tree should have Quality category"
        print(f"KPI TREE CATEGORIES: {categories}")
        
    def test_kpi_tree_category_structure(self, auth_headers):
        """Verify each category has correct structure"""
        response = requests.get(f"{BASE_URL}/api/kpi-tree", headers=auth_headers)
        assert response.status_code == 200
        tree = response.json()
        
        for node in tree:
            assert "category" in node
            assert "category_label" in node
            assert "outcomes" in node
            assert "outcomes_count" in node
            assert "total_initiatives" in node
            assert isinstance(node["outcomes"], list)
            print(f"Category: {node['category']}, Outcomes: {node['outcomes_count']}, Initiatives: {node['total_initiatives']}")
            
    def test_kpi_tree_outcome_structure(self, auth_headers):
        """Verify outcomes have initiatives grouped by status"""
        response = requests.get(f"{BASE_URL}/api/kpi-tree", headers=auth_headers)
        assert response.status_code == 200
        tree = response.json()
        
        for category in tree:
            for outcome in category.get("outcomes", []):
                assert "id" in outcome
                assert "name" in outcome
                assert "initiatives_by_status" in outcome
                assert "total_initiatives" in outcome
                
                # Check that initiatives_by_status is a dict with valid status keys
                init_by_status = outcome.get("initiatives_by_status", {})
                valid_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
                for status in init_by_status.keys():
                    assert status in valid_statuses, f"Invalid status: {status}"
                    
    def test_kpi_tree_initiative_fields(self, auth_headers):
        """Verify initiatives in KPI tree have required fields"""
        response = requests.get(f"{BASE_URL}/api/kpi-tree", headers=auth_headers)
        assert response.status_code == 200
        tree = response.json()
        
        found_initiative = False
        for category in tree:
            for outcome in category.get("outcomes", []):
                for status, initiatives in outcome.get("initiatives_by_status", {}).items():
                    for init in initiatives:
                        found_initiative = True
                        assert "id" in init
                        assert "name" in init
                        assert "status" in init
                        assert "confidence_score" in init
                        assert "owner" in init
                        assert "milestones_count" in init
                        assert "milestones_completed" in init
        
        if found_initiative:
            print("KPI Tree initiatives have all required fields")


class TestDashboardStats:
    """Test Dashboard Stats endpoint"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Check all required fields
        assert "total_initiatives" in stats
        assert "not_started_count" in stats
        assert "discovery_count" in stats
        assert "frame_count" in stats
        assert "wip_count" in stats
        assert "implemented_count" in stats
        assert "total_metrics" in stats
        assert "total_milestones" in stats
        assert "total_risks" in stats
        assert "escalated_risks" in stats
        
        print(f"DASHBOARD STATS: {stats['total_initiatives']} initiatives, {stats['total_metrics']} metrics")


class TestInitiativesByStatus:
    """Test Dashboard Initiatives by Status endpoint (Code Red Pipeline)"""
    
    def test_initiatives_by_status_endpoint(self, auth_headers):
        """Test initiatives-by-status returns data for all 5 statuses"""
        response = requests.get(f"{BASE_URL}/api/dashboard/initiatives-by-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have all 5 status keys
        expected_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
        for status in expected_statuses:
            assert status in data, f"Missing status: {status}"
            assert isinstance(data[status], list)
            
        print(f"INITIATIVES BY STATUS: {', '.join([f'{s}: {len(data[s])}' for s in expected_statuses])}")
        
    def test_initiatives_by_status_initiative_fields(self, auth_headers):
        """Test that initiatives have required fields for pipeline display"""
        response = requests.get(f"{BASE_URL}/api/dashboard/initiatives-by-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find first non-empty status
        for status, initiatives in data.items():
            if initiatives:
                init = initiatives[0]
                assert "id" in init
                assert "name" in init
                assert "owner" in init
                assert "confidence_score" in init
                assert "milestones_count" in init
                assert "milestones_completed" in init
                print(f"Initiative fields verified for status: {status}")
                break


class TestConfigEndpoints:
    """Test configuration endpoints"""
    
    def test_statuses(self, auth_headers):
        """Test statuses config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/statuses", headers=auth_headers)
        assert response.status_code == 200
        statuses = response.json()
        expected = ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]
        assert statuses == expected
        print(f"STATUSES: {statuses}")
        
    def test_buckets(self, auth_headers):
        """Test buckets config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/buckets", headers=auth_headers)
        assert response.status_code == 200
        buckets = response.json()
        assert isinstance(buckets, list)
        assert len(buckets) > 0
        
    def test_domains(self, auth_headers):
        """Test domains config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config/domains", headers=auth_headers)
        assert response.status_code == 200
        domains = response.json()
        assert isinstance(domains, list)
        assert len(domains) > 0


class TestSeedData:
    """Test seed data endpoint"""
    
    def test_seed_data_creates_correct_metrics(self, auth_headers):
        """Test that seed endpoint creates 8 metrics (4 ETO, 4 Quality)"""
        # First seed the data
        seed_response = requests.post(f"{BASE_URL}/api/seed", headers=auth_headers)
        assert seed_response.status_code == 200
        
        # Then verify metrics
        metrics_response = requests.get(f"{BASE_URL}/api/enterprise-metrics", headers=auth_headers)
        assert metrics_response.status_code == 200
        metrics = metrics_response.json()
        
        assert len(metrics) == 8, f"Expected 8 metrics, got {len(metrics)}"
        
        eto_metrics = [m for m in metrics if m.get("category") == "ETO"]
        quality_metrics = [m for m in metrics if m.get("category") == "Quality"]
        
        assert len(eto_metrics) == 4, f"Expected 4 ETO metrics, got {len(eto_metrics)}"
        assert len(quality_metrics) == 4, f"Expected 4 Quality metrics, got {len(quality_metrics)}"
        
        print(f"SEED DATA: Created {len(eto_metrics)} ETO metrics and {len(quality_metrics)} Quality metrics")
        
    def test_seed_data_creates_correct_initiatives(self, auth_headers):
        """Test that seed endpoint creates 8 initiatives"""
        # Verify initiatives (already seeded in previous test)
        initiatives_response = requests.get(f"{BASE_URL}/api/initiatives", headers=auth_headers)
        assert initiatives_response.status_code == 200
        initiatives = initiatives_response.json()
        
        assert len(initiatives) == 8, f"Expected 8 initiatives, got {len(initiatives)}"
        
        # Check status distribution
        status_counts = {}
        for init in initiatives:
            status = init.get("status")
            status_counts[status] = status_counts.get(status, 0) + 1
            
        print(f"SEED DATA: Created {len(initiatives)} initiatives with status distribution: {status_counts}")


class TestInitiativesCRUD:
    """Test Initiatives CRUD operations"""
    
    def test_get_all_initiatives(self, auth_headers):
        """Test getting all initiatives"""
        response = requests.get(f"{BASE_URL}/api/initiatives", headers=auth_headers)
        assert response.status_code == 200
        initiatives = response.json()
        assert isinstance(initiatives, list)
        print(f"INITIATIVES: {len(initiatives)} total")
        
    def test_get_single_initiative(self, auth_headers):
        """Test getting a single initiative"""
        # First get list
        response = requests.get(f"{BASE_URL}/api/initiatives", headers=auth_headers)
        assert response.status_code == 200
        initiatives = response.json()
        
        if initiatives:
            init_id = initiatives[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/initiatives/{init_id}", headers=auth_headers)
            assert detail_response.status_code == 200
            detail = detail_response.json()
            assert detail["id"] == init_id
            assert "milestones" in detail
            assert "risks" in detail
            print(f"INITIATIVE DETAIL: {detail['name']}")


class TestMilestones:
    """Test milestones endpoints"""
    
    def test_get_all_milestones(self, auth_headers):
        """Test getting all milestones across initiatives"""
        response = requests.get(f"{BASE_URL}/api/milestones", headers=auth_headers)
        assert response.status_code == 200
        milestones = response.json()
        assert isinstance(milestones, list)
        
        if milestones:
            milestone = milestones[0]
            assert "milestone_id" in milestone
            assert "milestone_name" in milestone
            assert "initiative_id" in milestone
            assert "initiative_name" in milestone
            
        print(f"MILESTONES: {len(milestones)} total across all initiatives")
