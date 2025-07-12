// /api/music.js

// This is a serverless function for Vercel.
// It fetches all .mp3 and .wav files from your Cloudinary account.

// Make sure to install the cloudinary package in your serverless environment.
// For Vercel, you can add a package.json file with:
// {
//   "dependencies": {
//     "cloudinary": "^2.0.0"
//   }
// }

// Import the Cloudinary library
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials from environment variables.
// NEVER expose these in your frontend code.
// In Vercel, you will set these in the "Environment Variables" section of your project settings.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,       // Your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Your Cloudinary API secret
  secure: true,
});

// The main handler for the serverless function
export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  // You can restrict this to your actual domain in production for better security
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Use the Cloudinary Search API to find all audio files
    // We're searching for files with the .mp3 or .wav extension
    const searchResult = await cloudinary.search
      .expression('resource_type:video AND (format:mp3 OR format:wav)') // Cloudinary treats audio as 'video' resource type
      .sort_by('public_id', 'desc') // Sort by public_id descending
      .max_results(100) // Adjust as needed
      .execute();

    // We only need the public_id and secure_url for the frontend
    const songs = searchResult.resources.map(resource => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        // A function to format the title nicely from the public_id
        title: resource.public_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

    // Send the list of songs as a JSON response
    res.status(200).json(songs);

  } catch (error) {
    console.error('Error fetching from Cloudinary:', error);
    res.status(500).json({ error: 'Failed to fetch music from Cloudinary.', details: error.message });
  }
}

