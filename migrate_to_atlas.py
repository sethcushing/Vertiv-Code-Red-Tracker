"""
Data Migration Script - Import data to MongoDB Atlas
Run this script to migrate data from the export file to your Atlas database.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import sys

# MongoDB Atlas connection string
ATLAS_URI = "mongodb+srv://sethcushing:CompassX@vertivredpipeline.v87jnbc.mongodb.net/?appName=VertivRedPipeline"
DB_NAME = "code_red_initiatives"

async def import_data():
    print(f"Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(ATLAS_URI)
    db = client[DB_NAME]
    
    # Test connection
    try:
        await client.admin.command('ping')
        print("✓ Connected to MongoDB Atlas successfully!")
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return
    
    # Load exported data
    print("\nLoading exported data...")
    with open('/app/data_export.json', 'r') as f:
        data = json.load(f)
    
    print(f"Found {len(data)} collections to import\n")
    
    for coll_name, documents in data.items():
        if not documents:
            print(f"  {coll_name}: skipped (empty)")
            continue
            
        collection = db[coll_name]
        
        # Clear existing data in collection (optional - comment out to append instead)
        await collection.delete_many({})
        
        # Insert documents
        try:
            result = await collection.insert_many(documents)
            print(f"  ✓ {coll_name}: {len(result.inserted_ids)} documents imported")
        except Exception as e:
            print(f"  ✗ {coll_name}: Error - {e}")
    
    print("\n✓ Data migration complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_data())
