import pandas as pd
from pymongo import MongoClient

# 1. Connect to Atlas
# Replace <password> and <cluster-url> with your actual connection string
uri = "mongodb+srv://sanyogjadhav24_db_user:br4Pxa1Iaa2OFbRD@cluster0.tsmkkkf.mongodb.net/?appName=Cluster0"
client = MongoClient(uri)
db = client["ForestFireDB"]
collection = db["SensorHistory"]

# 2. Fetch data
cursor = collection.find({})

# 3. Flatten the nested structure
all_readings = []

for doc in cursor:
    # We grab the meta-info (like location) and merge it with each reading
    location = doc.get("location", "unknown")
    event_id = str(doc.get("_id"))

    for reading in doc.get("time_series_data", []):
        reading["event_id"] = event_id
        reading["global_location"] = location
        all_readings.append(reading)

# 4. Create the Dataset
df = pd.DataFrame(all_readings)

# 5. Save to CSV for training
df.to_csv("disaster_dataset.csv", index=False)
print(f"Success! Created a dataset with {len(df)} rows.")
