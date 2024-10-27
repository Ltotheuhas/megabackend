const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ObjectModel = require('./models/ObjectModel.js');

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
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file received');
    return res.status(400).send('No file uploaded or file too large');
  }

  try {
    const filePath = `/uploads/${req.file.filename}`;
    const outputDirectory = '/home/servore/uploads/';
    const fileName = req.file.filename.split('.')[0]; // Extract the file name without extension
    const mimeType = req.file.mimetype;

    // Check if the file is an image (e.g., JPEG, PNG, WebP)
    if (mimeType.startsWith('image/')) {
      // Generate multiple versions of the image
      await sharp(req.file.path)
        .resize(150) // Thumbnail size
        .toFile(`${outputDirectory}${fileName}-small.webp`);

      await sharp(req.file.path)
        .resize(800) // Medium size
        .toFile(`${outputDirectory}${fileName}-medium.webp`);

      await sharp(req.file.path)
        .webp({ quality: 90 }) // High-quality original size in WebP
        .toFile(`${outputDirectory}${fileName}-large.webp`);

      // Respond with paths to the resized images
      res.status(200).json({
        type: 'image',
        original: filePath,
        small: `/uploads/${fileName}-small.webp`,
        medium: `/uploads/${fileName}-medium.webp`,
        large: `/uploads/${fileName}-large.webp`,
      });
    } else {
      // If not an image, simply return the original file path
      res.status(200).json({
        type: req.file.mimetype,
        original: filePath,
      });
    }
  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).send('Error uploading file');
  }
});

// Serve different versions of the image based on a query parameter
app.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  const { size } = req.query; // e.g., ?size=small

  let sizeSuffix;
  switch (size) {
    case 'small':
      sizeSuffix = '-small.webp';
      break;
    case 'medium':
      sizeSuffix = '-medium.webp';
      break;
    case 'large':
    default:
      sizeSuffix = '-large.webp';
      break;
  }

  const filePath = path.join('/home/servore/uploads', `${filename}${sizeSuffix}`);

  // Check if the file exists and serve it
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});


// Route to fetch all objects with file sizes
app.get('/objects', async (req, res) => {
  try {
    const objects = await ObjectModel.find();

    const objectsWithSize = objects.map(obj => {
      const filePath = path.join('/home/servore', obj.filePath);
      try {
        const stats = fs.statSync(filePath);
        return {
          ...obj.toObject(),
          size: stats.size
        };
      } catch (error) {
        console.error('File not found:', filePath);
        return {
          ...obj.toObject(),
          size: null
        };
      }
    });

    res.json(objectsWithSize);
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
      const filePath = path.join('/home/servore', object.filePath); // Adjust this path if necessary
      try {
        const stats = fs.statSync(filePath); // Get file stats to determine size
        res.status(200).json({ ...object.toObject(), size: stats.size }); // Include size in response
      } catch (error) {
        console.error('File not found:', filePath);
        res.status(200).json({ ...object.toObject(), size: null }); // Handle missing file gracefully
      }
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
