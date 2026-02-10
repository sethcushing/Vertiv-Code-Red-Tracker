"""
Test Suite for Initiative and Project Detail Pages - Iteration 9
Testing: Team members, business unit, delivery stages, status history, milestones, issues
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Basic API health check"""
    
    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Code Red Initiatives API"
        print("SUCCESS: API root health check passed")


class TestStrategicInitiativeDetailAPI:
    """Tests for Strategic Initiative detail page API features"""
    
    def test_get_initiative_with_all_fields(self):
        """Test that initiative details return all required fields"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        assert response.status_code == 200
        initiatives = response.json()
        assert len(initiatives) > 0
        
        # Get first initiative details
        init_id = initiatives[0]["id"]
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        assert response.status_code == 200
        
        initiative = response.json()
        # Verify all required fields exist
        required_fields = ["id", "name", "status", "rag_status", "executive_sponsor", 
                          "business_unit", "delivery_stages_impacted", "team_members", 
                          "status_history", "business_outcome_ids", "projects_count"]
        for field in required_fields:
            assert field in initiative, f"Missing field: {field}"
        
        print(f"SUCCESS: Initiative has all required fields: {list(initiative.keys())}")
    
    def test_update_initiative_basic_fields(self):
        """Test updating initiative basic fields - name, status, rag_status, sponsor"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        # Update basic fields
        update_data = {
            "name": "Updated Initiative Name - TEST",
            "status": "Discovery",
            "rag_status": "Amber",
            "executive_sponsor": "Test Sponsor",
            "description": "Updated description for testing"
        }
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["name"] == update_data["name"]
        assert updated["rag_status"] == update_data["rag_status"]
        assert updated["executive_sponsor"] == update_data["executive_sponsor"]
        
        print(f"SUCCESS: Initiative basic fields updated correctly")
    
    def test_update_initiative_business_unit(self):
        """Test updating initiative business_unit"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        update_data = {"business_unit": "Sales"}
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        updated = response.json()
        assert updated["business_unit"] == "Sales"
        
        print("SUCCESS: Initiative business_unit updated and persisted")
    
    def test_update_initiative_delivery_stages(self):
        """Test updating initiative delivery_stages_impacted"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        stages = ["Request", "Solution Design", "Order Capture", "Fulfillment"]
        update_data = {"delivery_stages_impacted": stages}
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        updated = response.json()
        assert set(updated["delivery_stages_impacted"]) == set(stages)
        
        print(f"SUCCESS: Initiative delivery_stages_impacted updated: {stages}")
    
    def test_update_initiative_team_members(self):
        """Test adding/updating team members on initiative"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        new_team = [
            {"id": str(uuid.uuid4()), "name": "Test Member 1", "role": "Project Lead", "responsibility": "Overall delivery"},
            {"id": str(uuid.uuid4()), "name": "Test Member 2", "role": "Developer", "responsibility": "Backend development"}
        ]
        update_data = {"team_members": new_team}
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        updated = response.json()
        assert len(updated["team_members"]) == 2
        assert updated["team_members"][0]["name"] == "Test Member 1"
        
        print("SUCCESS: Initiative team_members added and persisted")
    
    def test_delete_team_member_from_initiative(self):
        """Test removing a team member from initiative"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        # First add team members
        new_team = [
            {"id": "member-to-keep", "name": "Member Keep", "role": "Lead", "responsibility": ""},
            {"id": "member-to-delete", "name": "Member Delete", "role": "Developer", "responsibility": ""}
        ]
        requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json={"team_members": new_team})
        
        # Now update to keep only one member
        reduced_team = [{"id": "member-to-keep", "name": "Member Keep", "role": "Lead", "responsibility": ""}]
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json={"team_members": reduced_team})
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        updated = response.json()
        assert len(updated["team_members"]) == 1
        assert updated["team_members"][0]["id"] == "member-to-keep"
        
        print("SUCCESS: Team member deleted from initiative")
    
    def test_status_history_tracking(self):
        """Test that status changes are tracked in status_history"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        init_id = initiatives[0]["id"]
        
        # Get current status
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        current = response.json()
        old_status = current["status"]
        old_history_len = len(current.get("status_history", []))
        
        # Change status
        new_status = "Frame" if old_status != "Frame" else "Discovery"
        response = requests.put(f"{BASE_URL}/api/strategic-initiatives/{init_id}", json={"status": new_status})
        assert response.status_code == 200
        
        # Verify status history was updated
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{init_id}")
        updated = response.json()
        assert len(updated["status_history"]) > old_history_len
        
        last_history = updated["status_history"][-1]
        assert last_history["new_status"] == new_status
        
        print(f"SUCCESS: Status history tracked: {old_status} -> {new_status}")


class TestProjectDetailAPI:
    """Tests for Project detail page API features"""
    
    def test_get_project_with_all_fields(self):
        """Test that project details return all required fields"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        assert len(projects) > 0
        
        project_id = projects[0]["id"]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        
        project = response.json()
        required_fields = ["id", "name", "status", "rag_status", "owner", 
                          "business_unit", "delivery_stages_impacted", "team_members",
                          "status_history", "milestones", "issues"]
        for field in required_fields:
            assert field in project, f"Missing field: {field}"
        
        print(f"SUCCESS: Project has all required fields: {list(project.keys())}")
    
    def test_update_project_basic_fields(self):
        """Test updating project basic fields"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        update_data = {
            "name": "Updated Project Name - TEST",
            "status": "On Hold",
            "rag_status": "Red",
            "owner": "Test Owner",
            "description": "Updated project description"
        }
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["name"] == update_data["name"]
        assert updated["rag_status"] == update_data["rag_status"]
        assert updated["owner"] == update_data["owner"]
        
        print("SUCCESS: Project basic fields updated correctly")
    
    def test_update_project_business_unit(self):
        """Test updating project business_unit"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        update_data = {"business_unit": "Finance"}
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        updated = response.json()
        assert updated["business_unit"] == "Finance"
        
        print("SUCCESS: Project business_unit updated and persisted")
    
    def test_update_project_delivery_stages(self):
        """Test updating project delivery_stages_impacted"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        stages = ["Commercials", "Quote and Approval", "Availability"]
        update_data = {"delivery_stages_impacted": stages}
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        updated = response.json()
        assert set(updated["delivery_stages_impacted"]) == set(stages)
        
        print(f"SUCCESS: Project delivery_stages_impacted updated: {stages}")
    
    def test_update_project_team_members(self):
        """Test adding/updating team members on project"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        new_team = [
            {"id": str(uuid.uuid4()), "name": "Project Member 1", "role": "Tech Lead", "responsibility": "Architecture"},
            {"id": str(uuid.uuid4()), "name": "Project Member 2", "role": "QA Engineer", "responsibility": "Testing"}
        ]
        update_data = {"team_members": new_team}
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        updated = response.json()
        assert len(updated["team_members"]) == 2
        
        print("SUCCESS: Project team_members added and persisted")
    
    def test_delete_team_member_from_project(self):
        """Test removing a team member from project"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        # First add team members
        new_team = [
            {"id": "proj-member-keep", "name": "Keep Member", "role": "Lead", "responsibility": ""},
            {"id": "proj-member-delete", "name": "Delete Member", "role": "Dev", "responsibility": ""}
        ]
        requests.put(f"{BASE_URL}/api/projects/{project_id}", json={"team_members": new_team})
        
        # Remove one
        reduced_team = [{"id": "proj-member-keep", "name": "Keep Member", "role": "Lead", "responsibility": ""}]
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json={"team_members": reduced_team})
        assert response.status_code == 200
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        updated = response.json()
        assert len(updated["team_members"]) == 1
        
        print("SUCCESS: Team member deleted from project")
    
    def test_project_status_history_tracking(self):
        """Test that project status changes are tracked"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        current = response.json()
        old_status = current["status"]
        old_history_len = len(current.get("status_history", []))
        
        # Change status
        new_status = "Completed" if old_status != "Completed" else "In Progress"
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json={"status": new_status})
        assert response.status_code == 200
        
        # Verify history
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        updated = response.json()
        assert len(updated["status_history"]) > old_history_len
        
        print(f"SUCCESS: Project status history tracked: {old_status} -> {new_status}")


class TestProjectMilestones:
    """Tests for Project milestones CRUD"""
    
    def test_add_milestone(self):
        """Test adding a new milestone to project"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        milestone_data = {
            "name": "Test Milestone",
            "description": "Test milestone description",
            "owner": "Test Owner",
            "due_date": "2026-06-30",
            "status": "Pending"
        }
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/milestones", json=milestone_data)
        assert response.status_code == 200
        
        milestone = response.json()
        assert "id" in milestone
        assert milestone["name"] == milestone_data["name"]
        
        print(f"SUCCESS: Milestone added with id: {milestone['id']}")
        return project_id, milestone["id"]
    
    def test_edit_milestone(self):
        """Test editing an existing milestone"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        # Get existing milestone or create one
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        project = response.json()
        
        if project.get("milestones") and len(project["milestones"]) > 0:
            milestone_id = project["milestones"][0]["id"]
        else:
            # Create one first
            new_milestone = {
                "name": "Temp Milestone",
                "description": "",
                "owner": "",
                "due_date": "2026-07-15",
                "status": "Pending"
            }
            response = requests.post(f"{BASE_URL}/api/projects/{project_id}/milestones", json=new_milestone)
            milestone_id = response.json()["id"]
        
        # Now edit it
        update_data = {
            "name": "Updated Milestone Name",
            "description": "Updated description",
            "owner": "New Owner",
            "due_date": "2026-08-15",
            "status": "In Progress"
        }
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}/milestones/{milestone_id}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["name"] == update_data["name"]
        assert updated["status"] == update_data["status"]
        
        print("SUCCESS: Milestone edited successfully")
    
    def test_delete_milestone(self):
        """Test deleting a milestone"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        # Create a milestone to delete
        milestone_data = {
            "name": "Milestone to Delete",
            "description": "",
            "owner": "",
            "due_date": "2026-09-30",
            "status": "Pending"
        }
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/milestones", json=milestone_data)
        milestone_id = response.json()["id"]
        
        # Get initial count
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        initial_count = len(response.json().get("milestones", []))
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}/milestones/{milestone_id}")
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        final_count = len(response.json().get("milestones", []))
        assert final_count < initial_count
        
        print("SUCCESS: Milestone deleted successfully")


class TestProjectIssues:
    """Tests for Project issues CRUD"""
    
    def test_add_issue(self):
        """Test adding a new issue to project"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        issue_data = {
            "description": "Test issue description",
            "severity": "High",
            "status": "Open",
            "owner": "Test Owner",
            "resolution": ""
        }
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/issues", json=issue_data)
        assert response.status_code == 200
        
        issue = response.json()
        assert "id" in issue
        assert issue["description"] == issue_data["description"]
        
        print(f"SUCCESS: Issue added with id: {issue['id']}")
    
    def test_edit_issue(self):
        """Test editing an existing issue"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        # Get existing issue or create one
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        project = response.json()
        
        if project.get("issues") and len(project["issues"]) > 0:
            issue_id = project["issues"][0]["id"]
        else:
            # Create one first
            new_issue = {
                "description": "Temp issue",
                "severity": "Medium",
                "status": "Open",
                "owner": "",
                "resolution": ""
            }
            response = requests.post(f"{BASE_URL}/api/projects/{project_id}/issues", json=new_issue)
            issue_id = response.json()["id"]
        
        # Now edit it
        update_data = {
            "description": "Updated issue description",
            "severity": "Low",
            "status": "Resolved",
            "owner": "Resolution Owner",
            "resolution": "Fixed the problem"
        }
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}/issues/{issue_id}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["description"] == update_data["description"]
        assert updated["status"] == update_data["status"]
        assert updated["resolution"] == update_data["resolution"]
        
        print("SUCCESS: Issue edited successfully")
    
    def test_delete_issue(self):
        """Test deleting an issue"""
        response = requests.get(f"{BASE_URL}/api/projects")
        projects = response.json()
        project_id = projects[0]["id"]
        
        # Create an issue to delete
        issue_data = {
            "description": "Issue to Delete",
            "severity": "Medium",
            "status": "Open",
            "owner": "",
            "resolution": ""
        }
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/issues", json=issue_data)
        issue_id = response.json()["id"]
        
        # Get initial count
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        initial_count = len(response.json().get("issues", []))
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}/issues/{issue_id}")
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        final_count = len(response.json().get("issues", []))
        assert final_count < initial_count
        
        print("SUCCESS: Issue deleted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
