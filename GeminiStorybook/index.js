// npm install @google/genai express fs cors dotenv
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();
const PORT = 8000;
const FILE_PATH = 'stories.json';
app.use(cors());

// Initialize the Google GenAI client with the API key from our .env file
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
// identify the model we want to use for story generation
const model = "gemini-3-flash-preview";

// Helper to ensure JSON file exists and is an array
if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

// GET new story
app.get('/new-story', async (req, res) => {
    const { name, genre } = req.query;

    // ensures the user entered a name and genre
    if (!name || !genre) {
        return res.status(400).send('Missing name or genre parameters');
    }

    try {
        const prompt = `Can you create a short ${genre} bedtime story for my child named ${name}?`;
        const objResponse = await genAI.models.generateContent({
            model: model,
            contents: prompt,
        });
        console.log(objResponse.text);

        const storyText = objResponse.text;

        // creates a new object to store the story 
        const objNewStory = {
            id: Date.now(),
            name:name,
            genre: genre,
            story: storyText,
            date: new Date().toISOString()
        };

        // read existing stories from file
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        const stories = JSON.parse(data);

        // add new story to array
        stories.push(objNewStory);

        // write updated array back to file
        fs.writeFileSync(FILE_PATH, JSON.stringify(stories, null, 2));

        // respond to the the frontend with the new story object
        res.json(objNewStory);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating story: ' + error.message);
    }
});

// get all historic stories
app.get('/stories', (req, res) => {
    // read the file from our filesystem and return the contents as JSON
    fs.readFile(FILE_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading file');
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    // thank you AI for the cool emoji here
    console.log(`✨ FableForge Backend running on http://localhost:${PORT}`);
});