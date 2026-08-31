const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://sanyogjadhav24_db_user:br4Pxa1Iaa2OFbRD@cluster0.tsmkkkf.mongodb.net/?appName=Cluster0";
let cachedClient = null;

async function getDB() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
    console.log("Connected to MongoDB");
  }
  return cachedClient.db("ForestFireDB");
}

// POST /sensor-data - Save sensor data from Arduino
app.post("/sensor-data", async (req, res) => {
  try {
    const { mq4, mq7, mq135, latitude, longitude, status } = req.body;

    const db = await getDB();
    const collection = db.collection("LiveStatus");

    await collection.insertOne({
      mq4,
      mq7,
      mq135,
      latitude,
      longitude,
      status,
      timestamp: new Date()
    });

    res.json({ message: "Data saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});