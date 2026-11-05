
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

    // 1. Required field validation
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

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // 3. Validate numeric fields
    const parsedExperience =
      experience === undefined || experience === ""
        ? 0
        : Number(experience);

    const parsedConsultationFee =
      consultationFee === undefined || consultationFee === ""
        ? 0
        : Number(consultationFee);

    if (
      !Number.isInteger(parsedExperience) ||
      parsedExperience < 0 ||
      !Number.isFinite(parsedConsultationFee) ||
      parsedConsultationFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Experience and consultation fee must be valid non-negative numbers",
      });
    }

    // 4. Check duplicate email
    const existingDoctor = await doctorCollection.findOne({
      email: normalizedEmail,
    });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this email already exists",
      });
    }

    // 5. Create doctor object
    const newDoctor = {
      name: name.trim(),
      specialty: specialty.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      qualification:
        typeof qualification === "string"
          ? qualification.trim()
          : "",
      experience: parsedExperience,
      consultationFee: parsedConsultationFee,
      address: typeof address === "string" ? address.trim() : "",
      image: typeof image === "string" ? image.trim() : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 6. Insert into MongoDB
    const result = await doctorCollection.insertOne(newDoctor);

    // 7. Success response
    return res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      data: {
        ...newDoctor,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Failed to add doctor:", error);

    // Handle duplicate email index errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while adding doctor",
    });
  }
});

// app.post("/api/doctors", async (req, res) => {
//   try {
//     const {
//       name,
//       specialty,
//       email,
//       phone,
//       qualification,
//       experience,
//       consultationFee,
//       address,
//       image,
//     } = req.body;

//     // Validation
//     if (
//       typeof name !== "string" ||
//       typeof specialty !== "string" ||
//       typeof email !== "string" ||
//       !name.trim() ||
//       !specialty.trim() ||
//       !email.trim()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, specialty, and email are required",
//       });
//     }

//     const newDoctor = {
//       name: name.trim(),
//       specialty: specialty.trim(),
//       email: email.trim().toLowerCase(),
//       phone: typeof phone === "string" ? phone.trim() : "",
//       qualification:
//         typeof qualification === "string" ? qualification.trim() : "",
//       experience: Number(experience) || 0,
//       consultationFee: Number(consultationFee) || 0,
//       address: typeof address === "string" ? address.trim() : "",
//       image: typeof image === "string" ? image.trim() : "",
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const result = await doctorCollection.insertOne(newDoctor);

//     res.status(201).json({
//       success: true,
//       message: "Doctor added successfully",
//       data: {
//         ...newDoctor,
//         _id: result.insertedId,
//       },
//     });
//   } catch (error) {
//     console.error("Failed to add doctor:", error);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "A doctor with this email already exists",
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Failed to add doctor",
//     });
//   }
// });

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


// DOCTOR DETAILS API


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


// PATIENT MANAGEMENT APIs


// // GET: Get all patients of a specific doctor


/* =========================================
   GET: Get all patients
   Supports search, filters and pagination
========================================= */

app.get("/api/patients", async (req, res) => {
  try {
    const {
      search = "",
      doctorId,
      gender,
      condition,
      startDate,
      endDate,
      page = "1",
      limit = "6",
    } = req.query;

    // Validate pagination
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit",
      });
    }

    // Build MongoDB filter
    const match = {};

    // Filter by doctor
    if (doctorId) {
      if (!ObjectId.isValid(doctorId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid doctor ID",
        });
      }

      match.doctorId = new ObjectId(doctorId);
    }

    // Filter by gender
    if (gender) {
      match.gender = gender;
    }

    // Filter by condition
    if (condition) {
      match.condition = {
        $regex: condition,
        $options: "i",
      };
    }

    // Filter by registration date
    if (startDate || endDate) {
      match.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        match.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    // Search patient information
    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = {
        $regex: escapedSearch,
        $options: "i",
      };

      match.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { condition: searchRegex },
      ];
    }

    const skip = (currentPage - 1) * pageSize;

    // Fetch patients and total count
    const [result] = await patientCollection
      .aggregate([
        { $match: match },

        {
          $lookup: {
            from: "doctors",
            localField: "doctorId",
            foreignField: "_id",
            as: "doctor",
          },
        },

        {
          $unwind: {
            path: "$doctor",
            preserveNullAndEmptyArrays: true,
          },
        },

        { $sort: { createdAt: -1 } },

        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: pageSize },
              {
                $project: {
                  name: 1,
                  phone: 1,
                  email: 1,
                  age: 1,
                  gender: 1,
                  condition: 1,
                  doctorId: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  doctor: {
                    _id: "$doctor._id",
                    name: "$doctor.name",
                    specialty: "$doctor.specialty",
                  },
                },
              },
            ],
            totalCount: [
              { $count: "total" },
            ],
          },
        },
      ])
      .toArray();

    const total = result.totalCount[0]?.total || 0;

    res.status(200).json({
      success: true,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: result.data,
    });
  } catch (error) {
    console.error("Failed to fetch all patients:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
    });
  }
});


/* =========================================
   PATCH: Update patient information
========================================= */

app.patch("/api/patients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      phone,
      email,
      age,
      gender,
      condition,
      doctorId,
    } = req.body;

    // Validate patient ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    // Check whether patient exists
    const patientId = new ObjectId(id);

    const existingPatient = await patientCollection.findOne({
      _id: patientId,
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof email !== "string" ||
      typeof gender !== "string" ||
      typeof condition !== "string" ||
      !name.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !gender.trim() ||
      !condition.trim() ||
      age === undefined ||
      age === null ||
      age === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All patient fields are required",
      });
    }

    // Validate age
    const patientAge = Number(age);

    if (
      !Number.isInteger(patientAge) ||
      patientAge < 0 ||
      patientAge > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 0 and 120",
      });
    }

    // Validate email
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    // Validate gender
    const allowedGenders = [
      "Male",
      "Female",
      "Other",
      "Prefer not to say",
    ];

    if (!allowedGenders.includes(gender.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender",
      });
    }

    // Validate assigned doctor
    const newDoctorId = doctorId
      ? doctorId
      : existingPatient.doctorId.toString();

    if (!ObjectId.isValid(newDoctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctorObjectId = new ObjectId(newDoctorId);

    const doctor = await doctorCollection.findOne({
      _id: doctorObjectId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Assigned doctor not found",
      });
    }

    // Update patient
    const updatedPatient = {
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      age: patientAge,
      gender: gender.trim(),
      condition: condition.trim(),
      doctorId: doctorObjectId,
      updatedAt: new Date(),
    };

    await patientCollection.updateOne(
      { _id: patientId },
      { $set: updatedPatient }
    );

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: {
        ...existingPatient,
        ...updatedPatient,
        _id: patientId,
      },
    });
  } catch (error) {
    console.error("Failed to update patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update patient",
    });
  }
});


/* =========================================
   DELETE: Delete a patient
========================================= */

app.delete("/api/patients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate patient ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    const patientId = new ObjectId(id);

    // Check whether patient exists
    const existingPatient = await patientCollection.findOne({
      _id: patientId,
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Delete patient
    await patientCollection.deleteOne({
      _id: patientId,
    });

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: {
        _id: patientId,
        name: existingPatient.name,
      },
    });
  } catch (error) {
    console.error("Failed to delete patient:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete patient",
    });
  }
});



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


// POST: Add a patient under a specific doctor
app.post("/api/doctors/:id/patients", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, age, gender, condition } = req.body;

    // Validate doctor ID
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
      typeof gender !== "string" ||
      typeof condition !== "string" ||
      !name.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !gender.trim() ||
      !condition.trim() ||
      age === undefined ||
      age === null ||
      age === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All patient fields are required",
      });
    }

    // Validate age
    const patientAge = Number(age);

    if (
      !Number.isInteger(patientAge) ||
      patientAge < 0 ||
      patientAge > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "Age must be a number between 0 and 120",
      });
    }

    // Validate email
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const allowedGenders = [
      "Male",
      "Female",
      "Other",
      "Prefer not to say",
    ];

    if (!allowedGenders.includes(gender.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender selection",
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

    const now = new Date();

    const newPatient = {
      doctorId,
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      age: patientAge,
      gender: gender.trim(),
      condition: condition.trim(),
      createdAt: now,
      updatedAt: now,
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
