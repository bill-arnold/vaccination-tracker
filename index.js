const express = require('express');
const { Pool } = require('pg'); // Import the pg module for PostgreSQL
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

// Set up PostgreSQL connection using environment variables
const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
    ssl: {
        rejectUnauthorized: false, // This is often required for cloud databases
    },
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
app.get('/home', async (req, res) => {
    try {
        const sql = 'SELECT * FROM individuals';
        const { rows } = await pool.query(sql); // Use async/await for PostgreSQL
        res.render('home', { individuals: rows }); // Ensure home.ejs exists
    } catch (err) {
        console.error('Error fetching individuals: ', err);
        return res.status(500).send('Server error');
    }
});

// POST: Route to add a new individual
app.post('/add', async (req, res) => {
    const { name, vaccine_type, vaccination_date, status } = req.body;
    const sql = 'INSERT INTO individuals (name, vaccine_type, vaccination_date, status) VALUES ($1, $2, $3, $4) RETURNING *';
    try {
        const { rows } = await pool.query(sql, [name, vaccine_type, vaccination_date, status]); // Use async/await for PostgreSQL
        console.log('Individual added:', rows[0]);
        res.redirect('/home'); // Redirect to home after adding an individual
    } catch (err) {
        console.error('Error adding individual: ', err);
        return res.status(500).send('Server error');
    }
});

// GET: Register route
app.get('/register', (req, res) => {
    res.render('register'); // Ensure register.ejs exists
});

// POST: Register new user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES ($1, $2)';
    try {
        await pool.query(sql, [username, hashedPassword]);
        res.redirect('/login');
    } catch (err) {
        console.error('Error registering user: ', err);
        return res.status(500).send('Server error');
    }
});

// GET: Login route
app.get('/login', (req, res) => {
    res.render('login'); // Ensure login.ejs exists
});

// POST: Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = $1';
    try {
        const { rows } = await pool.query(sql, [username]);
        if (rows.length > 0) {
            const user = rows[0];
            if (bcrypt.compareSync(password, user.password)) {
                req.session.userId = user.id; // Store user ID in session
                res.redirect('/dashboard');
            } else {
                res.send('Incorrect password');
            }
        } else {
            res.send('User not found');
        }
    } catch (err) {
        console.error('Error during login: ', err);
        return res.status(500).send('Server error');
    }
});

// GET: Dashboard route
app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const sql = 'SELECT * FROM individuals';
        const { rows } = await pool.query(sql); // Use async/await for PostgreSQL
        res.render('dashboard', { individuals: rows });
    } catch (err) {
        console.error('Error fetching dashboard data: ', err);
        return res.status(500).send('Server error');
    }
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
