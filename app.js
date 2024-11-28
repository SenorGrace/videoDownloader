require('dotenv').config();

const express = require('express');
const expressLayout = require('express-ejs-layouts');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;  // Fix to ensure PORT assignment works correctly

// Templating engine
app.use(expressLayout);
app.set('layout', './layouts/main');  // Ensure the layout is set
app.set('view engine', 'ejs');

// CORS and body parsing
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());  // For parsing application/json

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Downloads')));
app.use(express.static(path.join(__dirname, 'Downloaded')));

// Routes
app.use('/', require('./server/routes/main'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});



// require('dotenv').config();

// const express = require('express');
// const expressLayout = require('express-ejs-layouts');
// const https = require('https');
// const fs = require('fs');
// const path = require('path');
// const cors = require('cors');
// const app = express();

// const PORT = process.env.PORT || 3000;

// const options = {
//   key: fs.readFileSync('path/to/server.key'),
//   cert: fs.readFileSync('path/to/server.cert'),
// };

// // Log the SSL options for debugging
// console.log('SSL Options:', options);

// // Middleware setup
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// // Static file serving
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'Downloads')));
// app.use(express.static(path.join(__dirname, 'Downloaded')));

// // Templating engine setup
// app.use(expressLayout);
// app.set('layout', './layouts/main');
// app.set('view engine', 'ejs');

// // Routes
// app.use('/', require('./server/routes/main'));

// // HTTPS server
// https.createServer(options, app).listen(PORT, () => {
//   console.log(`HTTPS server running on https://localhost:${PORT}`);
// });



//https://www.youtube.com/watch?v=ldwlOzRvYOU