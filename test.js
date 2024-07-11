const express = require('express');
const axios = require('axios');
const https = require('https');
const app = express();

const WINDOW_SIZE = 10;
const TIMEOUT = 500;  // 500 milliseconds
const API_URLS = {
    'p': 'https://20.244.56.144/test/primes',
    'f': 'https://20.244.56.144/test/fibo',
    'e': 'https://20.244.56.144/test/even',
    'r': 'https://20.244.56.144/test/rand'
};

// Store the sliding window of numbers
let numberWindow = [];

// Create an Axios instance that ignores SSL certificate validation
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

app.get('/numbers/:numberid', async (req, res) => {
    const numberId = req.params.numberid;

    if (!['p', 'f', 'e', 'r'].includes(numberId)) {
        return res.status(400).json({ detail: "Invalid number ID" });
    }

    // Fetch numbers from the third-party server
    let fetchedNumbers = [];
    try {
        const startTime = Date.now();
        const response = await axiosInstance.get(API_URLS[numberId], { timeout: TIMEOUT });
        const elapsedTime = Date.now() - startTime;

        if (elapsedTime > TIMEOUT) {
            throw new Error("Request timed out");
        }

        fetchedNumbers = response.data.numbers || [];
    } catch (error) {
        return res.status(503).json({ detail: "Failed to fetch numbers from the third-party server" });
    }

    // Ensure numbers are unique and update the sliding window
    const prevState = [...numberWindow];
    for (let number of fetchedNumbers) {
        if (!numberWindow.includes(number)) {
            if (numberWindow.length >= WINDOW_SIZE) {
                numberWindow.shift();  // Remove the oldest number
            }
            numberWindow.push(number);
        }
    }

    // Calculate the average of the stored numbers
    const avg = numberWindow.reduce((acc, curr) => acc + curr, 0) / (numberWindow.length || 1);

    // Format the response
    const responseData = {
        windowPrevState: prevState,
        windowCurrState: numberWindow,
        numbers: fetchedNumbers,
        avg: avg.toFixed(2)
    };

    res.json(responseData);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
