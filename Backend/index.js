const bcrypt = require('bcryptjs');
const express = require('express');
const cors = require('cors');
const app = express();
const secretKey = 'token_key';
const jwt = require('jsonwebtoken');
const port = 3001; //changed to 3306 to work with XAMPP control panel
//const port = 3306; 
const bodyParser = require('body-parser'); //used for parsing JSON files
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//Create MySQL database connection template
const mysql = require('mysql2/promise');

// Create connection pool for concurrent users
const db = mysql.createPool({
  host: "deansfoodlist.ddns.net", //127.0.0.1 works locally on pi
  user: "admin", //can also try userjonah with password my_password
  password: "password",
  database: "my_database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection on PI
app.get('/test-db', async (req, res) => {
  try {
    const connection = await db.getConnection();
    await connection.query('SELECT 1'); // Just test the connection
    connection.release();
    res.send("DB connection successful!");
  } catch (err) {
    console.error("DB connection error: ", err);
    res.status(500).send("DB connection failed");
  }
});

// Create new DeansFoodList user
app.post('/signup', async (request, response) => {
    const { username, password } = request.body;

    try {
        const connection = await db.getConnection();

        const [results] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length > 0) {
            return response.status(406).json({ message: 'Username already taken' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        response.status(201).json({ message: 'User created successfully :D' });

        connection.release();

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: error.message });
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await db.getConnection();
        const [results] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ err: 'Invalid username or password' });
        }

        // Generate a token granting login for 1 hour
        const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
        res.json({ token });

        connection.release();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });

        req.user = user; // Add the user info (from token) to the request object
        next(); // Proceed to the next middleware
    });
}

// Get all items (protected with JWT authentication)
app.get('/items', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        const [results] = await connection.query('SELECT * FROM shopping_list WHERE user_id = ?', [userId]);
        res.json(results);
        connection.release();
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new item (protected with JWT authentication)
app.post('/items', authenticateToken, async (req, res) => {
    const { ListItem } = req.body;
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        const [result] = await connection.query('INSERT INTO shopping_list (ListItem, user_id) VALUES (?, ?)', [ListItem, userId]);
        res.status(201).json({ id: result.insertId, ListItem });
        connection.release();
    } catch (err) {
        console.error('Error inserting into shopping list:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check the checkbox of an item
app.post('/items_check', authenticateToken, async (req, res) => {
    const { id, complete } = req.body.the_item;
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        const newCompleteValue = complete ? false : true;
        await connection.query('UPDATE shopping_list SET complete = ? WHERE id = ? AND user_id = ?', [newCompleteValue, id, userId]);
        res.status(201).json({});
        connection.release();
    } catch (err) {
        console.error('Error changing value of item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete an item
app.post('/items_delete', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        await connection.query('DELETE FROM shopping_list WHERE complete = true AND user_id = ?', [userId]);
        res.status(201).json({});
        connection.release();
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all items from the inventory (protected with JWT authentication)
app.get('/inventory', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        const [results] = await connection.query('SELECT * FROM inventory WHERE user_id = ?', [userId]);
        res.json(results);
        connection.release();
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new item to the inventory (protected with JWT authentication)
app.post('/inventory', authenticateToken, async (req, res) => {
    const { item_name, quantity, expiration_date, category, upc_code } = req.body;
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        const [result] = await connection.query('INSERT INTO inventory (item_name, quantity, expiration_date, category, upc_code, user_id) VALUES (?, ?, ?, ?, ?, ?)', 
                                                [item_name, quantity, expiration_date, category, upc_code, userId]);
        res.status(201).json({ id: result.insertId, item_name, quantity, expiration_date, category, upc_code });
        connection.release();
    } catch (err) {
        console.error('Error adding item to inventory:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to delete an item from the inventory by id
app.delete('/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await db.getConnection();
        await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
        res.json({ message: 'Item deleted successfully' });
        connection.release();
    } catch (err) {
        console.error('Error deleting inventory item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to update an item in the inventory by id
app.put('/inventory/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { item_name, quantity, expiration_date, category, upc_code } = req.body;

    try {
        const connection = await db.getConnection();
        await connection.query('UPDATE inventory SET item_name = ?, quantity = ?, expiration_date = ?, category = ?, upc_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                               [item_name, quantity, expiration_date, category, upc_code, id]);
        res.json({ message: 'Item updated successfully' });
        connection.release();
    } catch (err) {
        console.error('Error updating inventory item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
