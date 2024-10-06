const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' })); // Increase limit to 100MB or as needed
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true })); // Increase limit for URL-encoded data

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/megabackend')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Connection error', err);
  });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define a schema and model for objects
const objectSchema = new mongoose.Schema({
  type: String,
  extension: String, // Added extension field
  filePath: String,  // Path to the uploaded file
  position: {
    x: Number,
    y: Number,
    z: Number,
  },
  rotation: {
    isEuler: Boolean,
    _x: Number,
    _y: Number,
    _z: Number,
    _order: String,
  },
  uuid: String,
});

const ObjectModel = mongoose.model('Object', objectSchema);

/* Migration function, outdated
const migrateDataFieldToBase64 = async () => {
  const objects = await ObjectModel.find({ data: { $exists: true }, base64: { $exists: false } });
  for (const obj of objects) {
    obj.base64 = obj.data;
    obj.data = undefined;
    await obj.save();
  }
  console.log('Migration complete');
}; */

migrateDataFieldToBase64().catch(console.error);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/home/servore/uploads'); // Save uploaded files in the home directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename with timestamp
  }
});
const upload = multer({ storage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('/home/servore/uploads'));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Route to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/uploads/${req.file.filename}`;
  const newObject = new ObjectModel({
    type: 'image',
    extension: path.extname(req.file.originalname),
    filePath: filePath, // Save file path in the database
    position: { x: 0, y: 0, z: 0 }, // Example default position
    rotation: { isEuler: true, _x: 0, _y: 0, _z: 0, _order: 'XYZ' },
    uuid: new mongoose.Types.ObjectId().toString()
  });

  newObject.save().then(() => {
    res.json({ message: 'File uploaded and object saved!', filePath: filePath });
  }).catch(err => {
    res.status(500).send('Failed to save object to database.');
  });
});

// Route to fetch all objects
app.get('/objects', async (req, res) => {
  try {
    const objects = await ObjectModel.find();
    res.json(objects);
  } catch (err) {
    console.error('Error loading objects:', err);
    res.status(500).json({ error: 'Failed to load objects' });
  }
});

// DELETE route to remove an object by ID
app.delete('/objects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await ObjectModel.findByIdAndDelete(id);
    if (result) {
      res.status(200).send({ message: 'Object deleted successfully' });
    } else {
      res.status(404).send({ error: 'Object not found' });
    }
  } catch (err) {
    console.error('Error deleting object:', err);
    res.status(500).send({ error: 'Failed to delete object' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
