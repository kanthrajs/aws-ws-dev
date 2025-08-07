const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello, World! This is my Express app running on AWS EC2.');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});