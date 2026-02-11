"""
Test Suite for Initiative Milestones, Activities, and Documents
Features: Initiative-level milestones, activities (meetings/workshops), document upload/delete
"""
import pytest
import requests
import os
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInitiativeMilestones:
    """Test Initiative-level Milestones CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get an initiative ID for testing"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        assert response.status_code == 200
        initiatives = response.json()
        # Use ETO initiative for testing (has existing milestones)
        self.initiative_id = initiatives[0]["id"]
        self.initiative = initiatives[0]
    
    def test_get_initiative_with_milestones(self):
        """Verify initiative returns milestones array"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify milestones field exists and is a list
        assert "milestones" in data
        assert isinstance(data["milestones"], list)
        
        # If milestones exist, verify structure
        if len(data["milestones"]) > 0:
            milestone = data["milestones"][0]
            assert "id" in milestone
            assert "name" in milestone
            assert "status" in milestone
            print(f"Found {len(data['milestones'])} milestones for initiative")
    
    def test_add_milestone(self):
        """Test adding a new milestone to initiative"""
        milestone_data = {
            "name": "TEST_Milestone_Alpha",
            "description": "Test milestone description",
            "owner": "Test Owner",
            "due_date": "2026-06-30",
            "status": "Pending"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones",
            json=milestone_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["name"] == milestone_data["name"]
        assert data["description"] == milestone_data["description"]
        assert data["owner"] == milestone_data["owner"]
        assert data["due_date"] == milestone_data["due_date"]
        assert data["status"] == milestone_data["status"]
        
        self.created_milestone_id = data["id"]
        print(f"Created milestone: {data['id']}")
        
        # Verify milestone persisted by fetching initiative
        get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        assert get_response.status_code == 200
        initiative = get_response.json()
        milestone_ids = [m["id"] for m in initiative["milestones"]]
        assert data["id"] in milestone_ids
        print("Milestone persisted successfully")
    
    def test_edit_milestone(self):
        """Test editing an existing milestone"""
        # First create a milestone
        create_response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones",
            json={
                "name": "TEST_Milestone_Edit",
                "description": "Original description",
                "owner": "Original Owner",
                "due_date": "2026-07-15",
                "status": "Pending"
            }
        )
        assert create_response.status_code == 200
        milestone_id = create_response.json()["id"]
        
        # Edit the milestone
        update_data = {
            "name": "TEST_Milestone_Edit_Updated",
            "description": "Updated description",
            "owner": "Updated Owner",
            "due_date": "2026-08-15",
            "status": "In Progress"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones/{milestone_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["owner"] == update_data["owner"]
        assert data["status"] == update_data["status"]
        print(f"Milestone updated successfully: {milestone_id}")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        initiative = get_response.json()
        updated_milestone = next((m for m in initiative["milestones"] if m["id"] == milestone_id), None)
        assert updated_milestone is not None
        assert updated_milestone["name"] == update_data["name"]
        assert updated_milestone["status"] == update_data["status"]
    
    def test_delete_milestone(self):
        """Test deleting a milestone"""
        # First create a milestone to delete
        create_response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones",
            json={
                "name": "TEST_Milestone_Delete",
                "description": "To be deleted",
                "owner": "Delete Owner",
                "due_date": "2026-09-15",
                "status": "Pending"
            }
        )
        assert create_response.status_code == 200
        milestone_id = create_response.json()["id"]
        
        # Delete the milestone
        response = requests.delete(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones/{milestone_id}"
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Milestone deleted"
        print(f"Milestone deleted: {milestone_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        initiative = get_response.json()
        milestone_ids = [m["id"] for m in initiative["milestones"]]
        assert milestone_id not in milestone_ids
        print("Milestone deletion verified")
    
    def test_milestone_status_values(self):
        """Test all milestone status values work correctly"""
        statuses = ["Pending", "In Progress", "Completed", "Delayed"]
        
        for status in statuses:
            response = requests.post(
                f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/milestones",
                json={
                    "name": f"TEST_Milestone_Status_{status}",
                    "description": f"Testing {status} status",
                    "owner": "Status Tester",
                    "due_date": "2026-10-01",
                    "status": status
                }
            )
            assert response.status_code == 200
            assert response.json()["status"] == status
            print(f"Status '{status}' works correctly")


class TestInitiativeActivities:
    """Test Initiative-level Activities (Meetings, Workshops, etc.) CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get an initiative ID for testing"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        assert response.status_code == 200
        initiatives = response.json()
        self.initiative_id = initiatives[0]["id"]
    
    def test_get_initiative_with_activities(self):
        """Verify initiative returns activities array"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify activities field exists and is a list
        assert "activities" in data
        assert isinstance(data["activities"], list)
        
        if len(data["activities"]) > 0:
            activity = data["activities"][0]
            assert "id" in activity
            assert "name" in activity
            assert "activity_type" in activity
            print(f"Found {len(data['activities'])} activities for initiative")
    
    def test_add_activity_meeting(self):
        """Test adding a Meeting type activity"""
        activity_data = {
            "name": "TEST_Weekly Status Meeting",
            "activity_type": "Meeting",
            "description": "Weekly team sync",
            "date": "2026-03-15",
            "time": "2:00 PM",
            "location": "Conference Room A",
            "attendees": ["John Smith", "Jane Doe", "Bob Wilson"],
            "status": "Scheduled",
            "notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json=activity_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["name"] == activity_data["name"]
        assert data["activity_type"] == "Meeting"
        assert data["date"] == activity_data["date"]
        assert data["time"] == activity_data["time"]
        assert data["location"] == activity_data["location"]
        assert data["attendees"] == activity_data["attendees"]
        assert data["status"] == "Scheduled"
        print(f"Meeting activity created: {data['id']}")
    
    def test_add_activity_workshop(self):
        """Test adding a Workshop type activity"""
        activity_data = {
            "name": "TEST_Process Mapping Workshop",
            "activity_type": "Workshop",
            "description": "Map current business processes",
            "date": "2026-03-20",
            "time": "9:00 AM",
            "location": "Innovation Lab",
            "attendees": ["Process Team", "Business Analysts"],
            "status": "Scheduled",
            "notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json=activity_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["activity_type"] == "Workshop"
        print("Workshop activity created successfully")
    
    def test_add_activity_review(self):
        """Test adding a Review type activity"""
        activity_data = {
            "name": "TEST_Design Review",
            "activity_type": "Review",
            "description": "Review system design documents",
            "date": "2026-03-25",
            "time": "1:00 PM",
            "location": "Virtual - Teams",
            "attendees": ["Tech Lead", "Architect"],
            "status": "Scheduled",
            "notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json=activity_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["activity_type"] == "Review"
        print("Review activity created successfully")
    
    def test_add_activity_training(self):
        """Test adding a Training type activity"""
        activity_data = {
            "name": "TEST_New System Training",
            "activity_type": "Training",
            "description": "Train users on new features",
            "date": "2026-04-01",
            "time": "10:00 AM",
            "location": "Training Room 1",
            "attendees": ["End Users", "Support Team"],
            "status": "Scheduled",
            "notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json=activity_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["activity_type"] == "Training"
        print("Training activity created successfully")
    
    def test_edit_activity(self):
        """Test editing an existing activity"""
        # First create an activity
        create_response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json={
                "name": "TEST_Activity_Edit",
                "activity_type": "Meeting",
                "description": "Original description",
                "date": "2026-04-10",
                "time": "3:00 PM",
                "location": "Room 101",
                "attendees": ["Person A"],
                "status": "Scheduled",
                "notes": ""
            }
        )
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        
        # Edit the activity
        update_data = {
            "name": "TEST_Activity_Edit_Updated",
            "activity_type": "Workshop",
            "description": "Updated description",
            "date": "2026-04-15",
            "time": "4:00 PM",
            "location": "Innovation Lab",
            "attendees": ["Person A", "Person B", "Person C"],
            "status": "Completed",
            "notes": "Meeting went well"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities/{activity_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["activity_type"] == update_data["activity_type"]
        assert data["status"] == update_data["status"]
        assert data["notes"] == update_data["notes"]
        print(f"Activity updated successfully: {activity_id}")
    
    def test_delete_activity(self):
        """Test deleting an activity"""
        # First create an activity
        create_response = requests.post(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
            json={
                "name": "TEST_Activity_Delete",
                "activity_type": "Meeting",
                "description": "To be deleted",
                "date": "2026-05-01",
                "time": "10:00 AM",
                "location": "Room 202",
                "attendees": [],
                "status": "Scheduled",
                "notes": ""
            }
        )
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        
        # Delete the activity
        response = requests.delete(
            f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities/{activity_id}"
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Activity deleted"
        print(f"Activity deleted: {activity_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        initiative = get_response.json()
        activity_ids = [a["id"] for a in initiative["activities"]]
        assert activity_id not in activity_ids
        print("Activity deletion verified")
    
    def test_activity_status_values(self):
        """Test all activity status values"""
        statuses = ["Scheduled", "Completed", "Cancelled"]
        
        for status in statuses:
            response = requests.post(
                f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
                json={
                    "name": f"TEST_Activity_Status_{status}",
                    "activity_type": "Meeting",
                    "description": f"Testing {status} status",
                    "date": "2026-05-15",
                    "time": "11:00 AM",
                    "location": "Room 303",
                    "attendees": [],
                    "status": status,
                    "notes": ""
                }
            )
            assert response.status_code == 200
            assert response.json()["status"] == status
            print(f"Activity status '{status}' works correctly")
    
    def test_all_activity_types(self):
        """Test all activity types work correctly"""
        activity_types = ["Meeting", "Workshop", "Review", "Training", "Presentation", "Planning Session", "Demo", "Other"]
        
        for activity_type in activity_types:
            response = requests.post(
                f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/activities",
                json={
                    "name": f"TEST_Type_{activity_type}",
                    "activity_type": activity_type,
                    "description": f"Testing {activity_type} type",
                    "date": "2026-06-01",
                    "time": "12:00 PM",
                    "location": "Test Location",
                    "attendees": [],
                    "status": "Scheduled",
                    "notes": ""
                }
            )
            assert response.status_code == 200
            assert response.json()["activity_type"] == activity_type
            print(f"Activity type '{activity_type}' works correctly")


class TestInitiativeDocuments:
    """Test Initiative-level Document Upload/Delete operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get an initiative ID for testing"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        assert response.status_code == 200
        initiatives = response.json()
        self.initiative_id = initiatives[0]["id"]
    
    def test_get_initiative_with_documents(self):
        """Verify initiative returns documents array"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify documents field exists and is a list
        assert "documents" in data
        assert isinstance(data["documents"], list)
        print(f"Found {len(data['documents'])} documents for initiative")
    
    def test_upload_document(self):
        """Test uploading a document to initiative"""
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document content for testing purposes.")
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('TEST_document.txt', f, 'text/plain')}
                data = {'description': 'Test document description'}
                
                response = requests.post(
                    f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/documents",
                    files=files,
                    data=data
                )
            
            assert response.status_code == 200
            doc_data = response.json()
            
            assert "id" in doc_data
            assert doc_data["name"] == "TEST_document.txt"
            assert "file_url" in doc_data
            assert doc_data["file_type"] == "txt"
            assert doc_data["file_size"] > 0
            assert "uploaded_at" in doc_data
            
            self.uploaded_doc_id = doc_data["id"]
            print(f"Document uploaded: {doc_data['id']}, URL: {doc_data['file_url']}")
            
            # Verify document persisted
            get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
            initiative = get_response.json()
            doc_ids = [d["id"] for d in initiative["documents"]]
            assert doc_data["id"] in doc_ids
            print("Document persisted successfully")
            
        finally:
            os.unlink(temp_file_path)
    
    def test_upload_pdf_document(self):
        """Test uploading a PDF-like document"""
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as f:
            f.write(b'%PDF-1.4 fake pdf content for testing')
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('TEST_project_plan.pdf', f, 'application/pdf')}
                data = {'description': 'Project plan document'}
                
                response = requests.post(
                    f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/documents",
                    files=files,
                    data=data
                )
            
            assert response.status_code == 200
            doc_data = response.json()
            assert doc_data["file_type"] == "pdf"
            print(f"PDF document uploaded: {doc_data['id']}")
            
        finally:
            os.unlink(temp_file_path)
    
    def test_delete_document(self):
        """Test deleting a document"""
        # First upload a document
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Document to be deleted")
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('TEST_to_delete.txt', f, 'text/plain')}
                data = {'description': 'Will be deleted'}
                
                upload_response = requests.post(
                    f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/documents",
                    files=files,
                    data=data
                )
            
            assert upload_response.status_code == 200
            doc_id = upload_response.json()["id"]
            
            # Delete the document
            response = requests.delete(
                f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/documents/{doc_id}"
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Document deleted"
            print(f"Document deleted: {doc_id}")
            
            # Verify deletion
            get_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}")
            initiative = get_response.json()
            doc_ids = [d["id"] for d in initiative["documents"]]
            assert doc_id not in doc_ids
            print("Document deletion verified")
            
        finally:
            os.unlink(temp_file_path)
    
    def test_document_download_url(self):
        """Test that document download URL works"""
        # First upload a document
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            test_content = "Test download content 12345"
            f.write(test_content)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('TEST_download.txt', f, 'text/plain')}
                data = {'description': 'For download test'}
                
                upload_response = requests.post(
                    f"{BASE_URL}/api/strategic-initiatives/{self.initiative_id}/documents",
                    files=files,
                    data=data
                )
            
            assert upload_response.status_code == 200
            doc_data = upload_response.json()
            
            # Try to download the file
            download_url = f"{BASE_URL}{doc_data['file_url']}"
            download_response = requests.get(download_url)
            assert download_response.status_code == 200
            assert test_content in download_response.text
            print(f"Document download works: {download_url}")
            
        finally:
            os.unlink(temp_file_path)


class TestCleanup:
    """Clean up test data after tests"""
    
    def test_cleanup_test_milestones(self):
        """Remove TEST_ prefixed milestones"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        
        cleaned = 0
        for initiative in initiatives:
            init_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}")
            if init_response.status_code == 200:
                init_data = init_response.json()
                for milestone in init_data.get("milestones", []):
                    if milestone.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}/milestones/{milestone['id']}"
                        )
                        cleaned += 1
        
        print(f"Cleaned up {cleaned} test milestones")
    
    def test_cleanup_test_activities(self):
        """Remove TEST_ prefixed activities"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        
        cleaned = 0
        for initiative in initiatives:
            init_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}")
            if init_response.status_code == 200:
                init_data = init_response.json()
                for activity in init_data.get("activities", []):
                    if activity.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}/activities/{activity['id']}"
                        )
                        cleaned += 1
        
        print(f"Cleaned up {cleaned} test activities")
    
    def test_cleanup_test_documents(self):
        """Remove TEST_ prefixed documents"""
        response = requests.get(f"{BASE_URL}/api/strategic-initiatives")
        initiatives = response.json()
        
        cleaned = 0
        for initiative in initiatives:
            init_response = requests.get(f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}")
            if init_response.status_code == 200:
                init_data = init_response.json()
                for doc in init_data.get("documents", []):
                    if doc.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/strategic-initiatives/{initiative['id']}/documents/{doc['id']}"
                        )
                        cleaned += 1
        
        print(f"Cleaned up {cleaned} test documents")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
