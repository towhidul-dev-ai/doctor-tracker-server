// import express from 'express';
// import { MongoClient } from 'mongodb';
// import 'dotenv/config';
// import cors from 'cors';

// const app = express();
// const PORT = 8000;

// app.use(cors());
// app.use(express.json());

// const client = new MongoClient(process.env.MONGODB_URL);

// export async function connectToMongoDB() {
//   try {
//     await client.connect();
//     console.log("You successfully connected to MongoDB!");
//     return client;
//   } catch (err) {
//     console.dir(err);
//   }
// }

// const mongoClient = await connectToMongoDB();
// const db = mongoClient.db('doctor_tracker');

// const doctorCollection = db.collection('doctors');

// // http://localhost:8000

// app.get('/', (req, res) => {
//   res.send({message: 'Server is running fine!'});
// });

// // Get all doctors
// app.get('/api/doctors', async (req, res) => {
//   try {
//     const doctors = await doctorCollection.find({}).toArray();

//     res.json({
//       success: true,
//       data: doctors,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch doctors',
//     });
//   }
// });
// app.listen(PORT, () => {
//   console.log(`Server is running at ${PORT}`);
// })

import express from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('You successfully connected to MongoDB!');
    return client;
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db('doctor_tracker');

const doctorCollection = db.collection('doctors');

// Server check
app.get('/', (req, res) => {
  res.json({ message: 'Server is running fine!' });
});

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await doctorCollection.find({}).toArray();

    res.json({
      success: true,
      data: doctors,
    });
  } catch (err) {
    console.error('Failed to fetch doctors:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});