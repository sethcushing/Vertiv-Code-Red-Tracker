#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Enterprise Initiative Control Tower
Tests all endpoints for functionality, authentication, and data handling
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional


class EnterpriseAPITester:
    def __init__(self, base_url: str = "https://code-red-debug.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.token = None
        self.test_user_id = None
        self.test_initiative_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from review_request
        self.test_email = "testuser@vertiv.com"
        self.test_password = "TestPassword123"
        self.test_name = "Test User"

    def log(self, message: str, test_name: str = ""):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if test_name:
            print(f"[{timestamp}] 🔍 {test_name}: {message}")
        else:
            print(f"[{timestamp}] {message}")

    def run_test(self, name: str, method: str, endpoint: str, 
                 expected_status: int, data: Optional[Dict] = None, 
                 headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Default headers
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {method} {endpoint}...", name)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", name)
                try:
                    return success, response.json()
                except json.JSONDecodeError:
                    return success, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", name)
                self.log(f"   Response: {response.text[:200]}...", name)
                self.failed_tests.append({
                    'test': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:300]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", name)
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, {}

    # ==================== AUTHENTICATION TESTS ====================
    
    def test_register_user(self):
        """Test user registration"""
        data = {
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password
        }
        success, response = self.run_test(
            "User Registration", "POST", "auth/register", 200, data
        )
        if success:
            self.test_user_id = response.get('id')
            self.log(f"   User created with ID: {self.test_user_id}")
        return success

    def test_login_user(self):
        """Test user login and get token"""
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        success, response = self.run_test(
            "User Login", "POST", "auth/login", 200, data
        )
        if success and 'token' in response:
            self.token = response['token']
            self.log(f"   Token acquired: {self.token[:50]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test get current user profile"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        return self.run_test("Invalid Login", "POST", "auth/login", 401, data)[0]

    # ==================== CONFIG TESTS ====================

    def test_config_endpoints(self):
        """Test configuration endpoints"""
        configs = [
            ("buckets", "Get Buckets Config"),
            ("domains", "Get Domains Config"),
            ("teams", "Get Teams Config"),
            ("stages", "Get Stages Config"),
            ("risk-types", "Get Risk Types Config")
        ]
        
        all_passed = True
        for endpoint, name in configs:
            success = self.run_test(name, "GET", f"config/{endpoint}", 200)[0]
            all_passed &= success
        
        return all_passed

    # ==================== INITIATIVE TESTS ====================

    def test_create_initiative(self):
        """Test creating a new initiative"""
        data = {
            "name": "Test Initiative - API Testing",
            "description": "A test initiative for API validation",
            "bucket": "Stabilization",
            "code_red_flag": True,
            "business_domain": "IT",
            "lifecycle_stage": "Request",
            "executive_sponsor": "Test Sponsor",
            "initiative_owner": "Test Owner",
            "owning_team": "Engineering",
            "supporting_teams": ["IT", "Data"],
            "status": "On Track",
            "start_date": "2024-01-01",
            "target_end_date": "2024-06-30",
            "milestones": [
                {
                    "name": "Test Milestone",
                    "description": "A test milestone",
                    "owner": "Test Owner",
                    "due_date": "2024-03-01",
                    "status": "Pending",
                    "dependency_indicator": "",
                    "ai_risk_signal": "Low"
                }
            ],
            "risks": [
                {
                    "description": "Test risk for API validation",
                    "risk_type": "Delivery",
                    "impact": "Medium",
                    "likelihood": "Low",
                    "mitigation_plan": "Regular monitoring and testing",
                    "risk_owner": "Test Owner",
                    "escalation_flag": False
                }
            ],
            "financial": {
                "approved_budget": 100000,
                "forecasted_spend": 95000,
                "actual_spend": 25000,
                "roi_hypothesis": "Expected 20% cost savings"
            },
            "team_members": [
                {
                    "name": "Test Member",
                    "role": "Developer",
                    "team": "Engineering",
                    "allocation_percent": 50
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Initiative", "POST", "initiatives", 200, data
        )
        if success:
            self.test_initiative_id = response.get('id')
            self.log(f"   Initiative created with ID: {self.test_initiative_id}")
        return success

    def test_get_initiatives_list(self):
        """Test getting initiatives list"""
        return self.run_test("Get Initiatives List", "GET", "initiatives", 200)[0]

    def test_get_initiative_by_id(self):
        """Test getting specific initiative"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Get Initiative By ID")
            return False
        
        return self.run_test(
            "Get Initiative By ID", "GET", f"initiatives/{self.test_initiative_id}", 200
        )[0]

    def test_update_initiative(self):
        """Test updating initiative"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Update Initiative")
            return False
        
        data = {
            "name": "Updated Test Initiative",
            "description": "Updated description",
            "status": "At Risk"
        }
        
        return self.run_test(
            "Update Initiative", "PUT", f"initiatives/{self.test_initiative_id}", 200, data
        )[0]

    def test_initiatives_filtering(self):
        """Test initiative filtering with query parameters"""
        filters = [
            ("?bucket=Stabilization", "Filter by Bucket"),
            ("?status=On Track", "Filter by Status"), 
            ("?code_red=true", "Filter by Code Red"),
            ("?domain=IT", "Filter by Domain")
        ]
        
        all_passed = True
        for query, name in filters:
            success = self.run_test(name, "GET", f"initiatives{query}", 200)[0]
            all_passed &= success
        
        return all_passed

    # ==================== DASHBOARD TESTS ====================

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)[0]

    def test_four_blockers(self):
        """Test four-blocker view endpoint"""
        return self.run_test("Four Blockers", "GET", "dashboard/four-blockers", 200)[0]

    def test_risk_heatmap(self):
        """Test risk heatmap endpoint"""
        return self.run_test("Risk Heatmap", "GET", "dashboard/risk-heatmap", 200)[0]

    def test_financial_exposure(self):
        """Test financial exposure endpoint"""
        return self.run_test("Financial Exposure", "GET", "dashboard/financial-exposure", 200)[0]

    # ==================== DATA SEEDING TESTS ====================

    def test_seed_data(self):
        """Test seed data endpoint"""
        return self.run_test("Seed Sample Data", "POST", "seed", 200)[0]

    # ==================== MILESTONE/RISK/TEAM CRUD TESTS ====================

    def test_milestone_crud(self):
        """Test milestone CRUD operations"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Milestone CRUD")
            return False
        
        # Add milestone
        milestone_data = {
            "name": "API Test Milestone",
            "description": "Testing milestone APIs",
            "owner": "API Tester",
            "due_date": "2024-05-01",
            "status": "Pending",
            "dependency_indicator": "",
            "ai_risk_signal": "Low"
        }
        
        success, response = self.run_test(
            "Add Milestone", "POST", f"initiatives/{self.test_initiative_id}/milestones", 
            200, milestone_data
        )
        
        return success

    def test_risk_crud(self):
        """Test risk CRUD operations"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Risk CRUD")
            return False
        
        # Add risk
        risk_data = {
            "description": "API testing risk",
            "risk_type": "Delivery",
            "impact": "Low",
            "likelihood": "Low",
            "mitigation_plan": "Comprehensive testing",
            "risk_owner": "API Tester",
            "escalation_flag": False
        }
        
        success, response = self.run_test(
            "Add Risk", "POST", f"initiatives/{self.test_initiative_id}/risks",
            200, risk_data
        )
        
        return success

    def test_team_member_crud(self):
        """Test team member CRUD operations"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Team Member CRUD")
            return False
        
        # Add team member
        member_data = {
            "name": "API Test Member",
            "role": "Tester",
            "team": "Engineering",
            "allocation_percent": 25
        }
        
        success, response = self.run_test(
            "Add Team Member", "POST", f"initiatives/{self.test_initiative_id}/team",
            200, member_data
        )
        
        return success

    def test_financial_update(self):
        """Test financial data update"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Financial Update")
            return False
        
        financial_data = {
            "approved_budget": 150000,
            "forecasted_spend": 140000,
            "actual_spend": 50000,
            "roi_hypothesis": "Updated ROI projection - 25% savings"
        }
        
        return self.run_test(
            "Update Financial", "PUT", f"initiatives/{self.test_initiative_id}/financial",
            200, financial_data
        )[0]

    # ==================== CLEANUP TESTS ====================

    def test_delete_initiative(self):
        """Test deleting initiative (cleanup)"""
        if not self.test_initiative_id:
            self.log("❌ No test initiative ID available", "Delete Initiative")
            return False
        
        return self.run_test(
            "Delete Initiative", "DELETE", f"initiatives/{self.test_initiative_id}", 200
        )[0]

    # ==================== MAIN TEST RUNNER ====================

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Enterprise Initiative Control Tower API Tests")
        print(f"📡 Base URL: {self.base_url}")
        print("=" * 70)
        
        start_time = datetime.now()
        
        try:
            # Authentication Flow Tests
            print("\n🔐 AUTHENTICATION TESTS")
            print("-" * 30)
            self.test_register_user()
            self.test_login_user() 
            self.test_get_current_user()
            self.test_invalid_login()
            
            # Config Tests
            print("\n⚙️  CONFIGURATION TESTS") 
            print("-" * 30)
            self.test_config_endpoints()
            
            # Seed Data First (to populate system)
            print("\n🌱 DATA SEEDING TESTS")
            print("-" * 30)
            self.test_seed_data()
            
            # Dashboard Tests
            print("\n📊 DASHBOARD TESTS")
            print("-" * 30)
            self.test_dashboard_stats()
            self.test_four_blockers()
            self.test_risk_heatmap()
            self.test_financial_exposure()
            
            # Initiative CRUD Tests
            print("\n📋 INITIATIVE CRUD TESTS")
            print("-" * 30)
            self.test_create_initiative()
            self.test_get_initiatives_list()
            self.test_get_initiative_by_id()
            self.test_update_initiative()
            self.test_initiatives_filtering()
            
            # Sub-resource CRUD Tests
            print("\n🔧 SUB-RESOURCE CRUD TESTS")
            print("-" * 30)
            self.test_milestone_crud()
            self.test_risk_crud()
            self.test_team_member_crud()
            self.test_financial_update()
            
            # Cleanup Tests
            print("\n🧹 CLEANUP TESTS")
            print("-" * 30)
            self.test_delete_initiative()
            
        except KeyboardInterrupt:
            print("\n❌ Tests interrupted by user")
            return 1
        except Exception as e:
            print(f"\n❌ Test suite failed with error: {e}")
            return 1
        finally:
            # Print Results
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print("\n" + "=" * 70)
            print("📊 TEST RESULTS SUMMARY")
            print("=" * 70)
            print(f"⏱️  Duration: {duration:.2f} seconds")
            print(f"🏃 Tests Run: {self.tests_run}")
            print(f"✅ Tests Passed: {self.tests_passed}")
            print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
            print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
            
            if self.failed_tests:
                print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
                print("-" * 40)
                for i, failure in enumerate(self.failed_tests, 1):
                    print(f"{i}. {failure['test']}")
                    print(f"   Endpoint: {failure.get('endpoint', 'N/A')}")
                    if 'error' in failure:
                        print(f"   Error: {failure['error']}")
                    if 'expected' in failure:
                        print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                    if 'response' in failure:
                        print(f"   Response: {failure['response']}")
                    print()
            else:
                print("\n🎉 ALL TESTS PASSED!")
            
            # Return exit code based on results
            return 0 if self.tests_passed == self.tests_run else 1


if __name__ == "__main__":
    tester = EnterpriseAPITester()
    sys.exit(tester.run_all_tests())