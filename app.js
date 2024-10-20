const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Load environment variables from .env

const app = express();

// Set up body-parser to parse form data
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files for Bootstrap
app.use(express.static('public'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Set up session
app.use(session({
    secret: process.env.SESSION_SECRET, // Use session secret from .env
    resave: false,
    saveUninitialized: true,
}));

// Set up MySQL connection using environment variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Middleware for checking authentication
function checkAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// Redirect root route to /home
app.get('/', (req, res) => {
    res.redirect('/home');
});

// GET: Home route to display all individuals
app.get('/home', (req, res) => {
    const sql = 'SELECT * FROM individuals';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching individuals: ', err);
            return res.status(500).send('Server error');
        }
        res.render('home', { individuals: results }); // Ensure home.ejs exists
    });
});

// POST: Route to add a new individual
app.post('/add', (req, res) => {
    const { name, vaccine_type, vaccination_date, status } = req.body;
    const sql = 'INSERT INTO individuals (name, vaccine_type, vaccination_date, status) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, vaccine_type, vaccination_date, status], (err, result) => {
        if (err) {
            console.error('Error adding individual: ', err);
            return res.status(500).send('Server error');
        }
        console.log('Individual added:', result);
        res.redirect('/home'); // Redirect to home after adding an individual
    });
});

// GET: Register route
app.get('/register', (req, res) => {
    res.render('register'); // Ensure register.ejs exists
});

// POST: Register new user
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(sql, [username, hashedPassword], (err, result) => {
        if (err) {
            console.error('Error registering user: ', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/login');
    });
});

// GET: Login route
app.get('/login', (req, res) => {
    res.render('login'); // Ensure login.ejs exists
});

// POST: Login user
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error during login: ', err);
            return res.status(500).send('Server error');
        }
        if (results.length > 0) {
            const user = results[0];
            if (bcrypt.compareSync(password, user.password)) {
                req.session.userId = user.id; // Store user ID in session
                res.redirect('/dashboard');
            } else {
                res.send('Incorrect password');
            }
        } else {
            res.send('User not found');
        }
    });
});

// GET: Dashboard route
app.get('/dashboard', checkAuth, (req, res) => {
    const sql = 'SELECT * FROM individuals';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching dashboard data: ', err);
            return res.status(500).send('Server error');
        }
        res.render('dashboard', { individuals: results });
    });
});

// POST: Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/'); // Redirect to home after logout
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
