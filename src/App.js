/* useEffect: allows us to save items in React when the page is reloaded */
import React, { useState, useRef, useEffect } from 'react'; //useRef allows us to reference HTML (in this case, input from a textbox)
import { HashRouter as Router, Link, Routes, Route, Navigate} from 'react-router-dom'; //many import of BrowserRouter bc only one instance of each allowed inside a set of <></>
import {v4 as uuidv4} from 'uuid'; //create a unique id for each item. So no more duplicate keys.
import axios from 'axios';

//local imports
import './App.css';
import HomePage from './components/HomePage'
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import InventoryPage from './components/InventoryPage';
import RecipesPage from './components/RecipesPage';

function App() {

  const baseUrl = process.env.NODE_ENV === "production"
    ? "http://deansfoodlist.ddns.net:3001"
    : "http://192.168.0.24:3001";

  //is passed into RecipesPage (added 12-1)
  const [inventoryItems, setInventoryItems] = useState([]);
      useEffect(() => {
        //Check if token. If there is a token, fetch inventory items
        const token = localStorage.getItem('token');
        if(token) {
            const fetchItems = async () => {
                try {
                    const items = await axios.get('http://deansfoodlist.ddns.net:3001/inventory', {
                        headers: {Authorization: `Bearer ${token}`}
                    });
                    setInventoryItems(items.data); //Store the fetched items
                } catch (error) {
                    console.error('Erro fetching inventory items: ', error);
                }
            };
            fetchItems(); //Call the function you just made, so you can acutally fetch the items
        }
    }, []); // Empty dependency array to run this effect only once when the component mounts   
  




    // State to track user authentication
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const token = localStorage.getItem('token'); // Check for stored token
        return !!token; // Convert token to boolean
    });

  const handleLogout = () => {
    localStorage.removeItem('token'); //Remove the token when logging out
    setIsAuthenticated(false);
    console.log('User has logged out');
  }

  return (
    <Router>
      <header>
        <h1>Dean's Food List</h1>
        <nav>
          {isAuthenticated ? (
            <>
              <Link to="/home">Home</Link>
              <Link to="/inventory">Inventory</Link>
              <Link to="/recipes">Recipes</Link>
              <button className="logout-button" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/signup">Sign Up</Link>
              <Link to="/login">Log In</Link>
            </>
          )}
        </nav>
      </header>

      <Routes>
            <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/inventory" />} />
            <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/inventory" />} />
            <Route path="/inventory" element={isAuthenticated ? <InventoryPage /> : <Navigate to="/login" />} />
            <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/home" element={<HomePage />} />
        <Route
          path="/recipes"
          element={isAuthenticated ? <RecipesPage inventoryItems={inventoryItems} /> : <Navigate to="/login" />}
        />

      </Routes>
    </Router>

  );
}

export default App;
