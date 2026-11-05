
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import fs from "node:fs";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

// Connect database
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("doctor_tracker");

const doctorCollection = db.collection("doctors");

const patientCollection = db.collection("patients");

// Create unique email index
await doctorCollection.createIndex({ email: 1 }, { unique: true });


// SERVER CHECK


app.get("/", (req, res) => {
  res.send("Doctor Tracker Server is running!");
});


// GET ALL DOCTORS


app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await doctorCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Failed to fetch doctors:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
});


// GET SINGLE DOCTOR


app.get("/api/doctors/:id", async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await doctorCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Failed to fetch doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
    });
  }
});

// ADD NEW DOCTOR


app.post("/api/doctors", async (req, res) => {
  try {
    const {
      name,
      specialty,
      email,
      phone,
      qualification,
      experience,
      consultationFee,
      address,
      image,
    } = req.body;

    // Validation
    if (
      typeof name !== "string" ||
      typeof specialty !== "string" ||
      typeof email !== "string" ||
      !name.trim() ||
      !specialty.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, specialty, and email are required",
      });
    }

    const newDoctor = {
      name: name.trim(),
      specialty: specialty.trim(),
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" ? phone.trim() : "",
      qualification:
        typeof qualification === "string" ? qualification.trim() : "",
      experience: Number(experience) || 0,
      consultationFee: Number(consultationFee) || 0,
      address: typeof address === "string" ? address.trim() : "",
      image: typeof image === "string" ? image.trim() : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await doctorCollection.insertOne(newDoctor);

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      data: {
        ...newDoctor,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Failed to add doctor:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add doctor",
    });
  }
});

// INSERT DOCTORS FROM JSON FILE


app.post("/api/doctors/seed", async (req, res) => {
  try {
    const doctors = JSON.parse(
      fs.readFileSync("./data/doctors.json", "utf-8")
    );

    if (!Array.isArray(doctors)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctors.json format",
      });
    }

    let inserted = 0;
    let skipped = 0;

    for (const doctor of doctors) {
      if (
        typeof doctor.name !== "string" ||
        typeof doctor.specialty !== "string" ||
        typeof doctor.email !== "string" ||
        !doctor.name.trim() ||
        !doctor.specialty.trim() ||
        !doctor.email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Every doctor must have a name, specialty, and email",
        });
      }

      const email = doctor.email.trim().toLowerCase();

      const result = await doctorCollection.updateOne(
        { email },
        {
          $setOnInsert: {
            ...doctor,
            email,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount) {
        inserted++;
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: "Doctor data imported successfully",
      inserted,
      skipped,
    });
  } catch (error) {
    console.error("Failed to import doctors:", error);

    res.status(500).json({
      success: false,
      message: "Failed to import doctor data",
    });
  }
});


// ========================================
// DOCTOR DETAILS API
// ========================================

// GET: Get a single doctor by ID
app.get("/api/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await doctorCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Failed to fetch doctor:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor details",
    });
  }
});


// ========================================
// PATIENT MANAGEMENT APIs
// ========================================

// GET: Get all patients of a specific doctor
app.get("/api/doctors/:id/patients", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctorId = new ObjectId(id);

    // Check whether doctor exists
    const doctor = await doctorCollection.findOne({
      _id: doctorId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const patients = await patientCollection
      .find({ doctorId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Failed to fetch patients:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
    });
  }
});


// POST: Add a patient under a specific doctor
app.post("/api/doctors/:id/patients", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof email !== "string" ||
      !name.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and email are required",
      });
    }

    const doctorId = new ObjectId(id);

    // Check whether doctor exists
    const doctor = await doctorCollection.findOne({
      _id: doctorId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const newPatient = {
      doctorId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date(),
    };

    const result = await patientCollection.insertOne(newPatient);

    res.status(201).json({
      success: true,
      message: "Patient added successfully",
      data: {
        ...newPatient,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Failed to add patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add patient",
    });
  }
});


// DELETE: Delete a patient from a specific doctor's list
app.delete(
  "/api/doctors/:id/patients/:patientId",
  async (req, res) => {
    try {
      const { id, patientId } = req.params;

      if (!ObjectId.isValid(id) || !ObjectId.isValid(patientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid doctor ID or patient ID",
        });
      }

      const doctorId = new ObjectId(id);
      const patientObjectId = new ObjectId(patientId);

      // Check whether doctor exists
      const doctor = await doctorCollection.findOne({
        _id: doctorId,
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // Delete only if the patient belongs to this doctor
      const result = await patientCollection.deleteOne({
        _id: patientObjectId,
        doctorId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Patient not found under this doctor",
        });
      }

      res.status(200).json({
        success: true,
        message: "Patient deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete patient:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete patient",
      });
    }
  }
);


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
