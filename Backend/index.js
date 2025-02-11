/* Backend for DeansFoodList */

/* https://dev.to/nasreenkhalid/simple-react-js-and-mysql-integration-crud-app-backend-5aom
this article has a frontend tutorial linked in it */

const bcrypt = require('bcryptjs');
const express = require('express');
const cors = require('cors');
const app = express();
const secretKey = 'token_key';
const jwt = require('jsonwebtoken');
//const port = 3001; //changed to 3306 to work with XAMPP control panel
const port = 3306; 
const bodyParser = require('body-parser'); //used for parsing JSON files
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());



//Create MySQL database connection template
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: "",      //fill in with your database information
    user: "",          //fill in with your database information
    password: "",   //fill in with your database information
    database: "" //fill in with your database information
})

//Actually connect to the database
db.connect((error) => {
    if(error) {
        console.error('Error connecting to MySQL:', error);
    } else {
        console.log('Connected to MySQL :D');
    }
})

//Create new DeansFoodList user
app.post('/signup', async (request, response) => {
    const { username, password } = request.body;

    try {
        // Check if the username is already taken
        const [results] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length > 0) {
            //console.log({results});
            //console.log(results.length);
            //more than one response.status message (returned or not) causes the database to disconnect
            return response.status(406).json({ message: 'Username already taken' }); 
            //return response.status(400).json({ error: 'Username is already taken' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await db.promise().query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        response.status(201).json({ message: 'User created successfully :D' }); 

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: error.message });
    }
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if(err) {
            return res.status(500).json({ error: err.message });
        }

        if(results.length === 0) {
            return res.status(401).json({error: 'Invalid username or password'});
        }

        const user = results[0];

        // Compare provided password with the unhashed version of the stored password
        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword) {
            return res.status(401).json({ err: 'Invalid username or password'});
        }

        //Generate a token granting login for 1 hour
        const token = jwt.sign({id: user.id, username: user.username}, secretKey, { expiresIn: '1h' });
        res.json({ token });
    });
});


/* AUTHENTICATION */
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


/* ITEM HANDLING */

// Get all items (protected with JWT authentication)
app.get('/items', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user id from JWT token
  
    db.query('SELECT * FROM shopping_list WHERE user_id = ?', [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

// Add a new item (protected with JWT authentication)
app.post('/items', authenticateToken, (req, res) => {
    const { ListItem } = req.body;
    const userId = req.user.id; // Extract user id from JWT token
  
    db.query('INSERT INTO shopping_list (ListItem, user_id) VALUES (?, ?)', [ListItem, userId], (err, result) => {
      if (err) {
        console.error('Error inserting into database:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: result.insertId, ListItem });
    });
  });

// Check the checkbox of an item
app.post('/items_check', authenticateToken, (req, res) => {
    const the_item = req.body;
    const id = the_item.the_item.id;
    //const id = req.body;
    const userId = req.user.id; // Extract user id from JWT token

    //console.log("Received item:", the_item, "UserID:", userId); //shows the value that the item is being changed to
    const newCompleteValue = the_item.the_item.complete ? false : true; //set value of (Boolean) the_item.the_item.complete to its opposite
    db.query('UPDATE shopping_list SET complete = ? where id = ? AND user_id = ?', [ newCompleteValue,id, userId], (err, result) => {
        if(err) {
            console.error('Error changing value of box to checked on database side: ', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({})
    })
})

// Delete an item
app.post('/items_delete', authenticateToken, (req, res) => {
    //const {ListItem} = req.body;
    const item = req.body;
    const userId = req.user.id; // Extract user id from JWT token

    //console.log(item);

    db.query('DELETE FROM shopping_list WHERE complete = true AND user_id = ?', [userId], (err, result) => {
        if(err) {
            console.error('Error changing value of box to checked on database side: ', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({})
    })
})




/* INVENTORY STUFF */
// GET all items from the inventory table (database certified)
app.get('/inventory', authenticateToken, (req, res) => {
    const userId = req.user.id; // Get user id

    db.query('SELECT * FROM inventory WHERE user_id = ?', [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });
  
  // Add a new item to the inventory (database certified)
  app.post('/inventory', authenticateToken, (req, res) => {
    const { item_name, quantity, expiration_date, category, upc_code } = req.body; // Destructure the data from the request body
    const query = 'INSERT INTO inventory (item_name, quantity, expiration_date, category, upc_code, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    const userId = req.user.id;
    
    db.query(query, [item_name, quantity, expiration_date, category, upc_code, userId], (err, result) => {
      if (err) {
        console.error("Error inserting into inventory table!", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: result.insertId, item_name, quantity, expiration_date, category, upc_code });
    });
  });
  
  // Route to delete an item from the inventory by id (database certified)
  app.delete('/inventory/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM inventory WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Item deleted successfully' });
    });
  });
  
  // Route to update an item in the inventory by id
  app.put('/inventory/:id', (req, res) => {
    const { id } = req.params;
    const { item_name, quantity, expiration_date, category, upc_code } = req.body;
    
    const query = 'UPDATE inventory SET item_name = ?, quantity = ?, expiration_date = ?, category = ?, upc_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.query(query, [item_name, quantity, expiration_date, category, upc_code, id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Item updated successfully' });
    });
  });

//Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})
