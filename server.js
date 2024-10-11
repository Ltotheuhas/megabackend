const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ObjectModel = require('./models/ObjectModel.js');
const Joi = require('joi');

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

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/home/servore/uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix); // Ensure the file gets a unique name to avoid overwriting
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('/home/servore/uploads'));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Route to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file received');
    return res.status(400).send('No file uploaded or file too large');
  }

  try {
    console.log('File uploaded successfully:', req.file);
    const filePath = `/uploads/${req.file.filename}`;
    res.status(200).json({ filePath });
  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).send('Error uploading file');
  }
});

const objectSchema = Joi.object({
  type: Joi.string().required(),
  filePath: Joi.string().required(),
  position: Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required(),
    z: Joi.number().required()
  }).required(),
  rotation: Joi.object({
    isEuler: Joi.boolean().default(true),
    _x: Joi.number().required(),
    _y: Joi.number().required(),
    _z: Joi.number().required(),
    _order: Joi.string().required()
  }).required(),
  uuid: Joi.string().required()
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

// Route to save a single object
app.post('/objects', async (req, res) => {
  try {
    const newObject = req.body;
    console.log('Object received for saving:', newObject); // Log object data
    console.log("newObject.filePath:", newObject.filePath);

    const result = await ObjectModel.create(newObject);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error saving object:', err);
    res.status(500).json({ error: 'Failed to save object' });
  }
});

// Route to fetch a single object by ID
app.get('/objects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const object = await ObjectModel.findById(id);
    if (object) {
      res.status(200).json(object);
    } else {
      res.status(404).json({ error: 'Object not found' });
    }
  } catch (err) {
    console.error('Error fetching object by ID:', err);
    res.status(500).json({ error: 'Failed to fetch object' });
  }
});

// PUT route to update an object by ID
app.put('/objects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
    const result = await ObjectModel.findByIdAndUpdate(id, updatedData, { new: true });
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: 'Object not found' });
    }
  } catch (err) {
    console.error('Error updating object:', err);
    res.status(500).json({ error: 'Failed to update object' });
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
