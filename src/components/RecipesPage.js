import React, { useState } from 'react';
import axios from 'axios';
import './Apps.css';

function Recipes({ inventoryItems }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edamam API credentials
    const APP_ID = process.env.REACT_APP_EDAMAM_APP_ID;
    const APP_KEY = process.env.REACT_APP_EDAMAM_APP_KEY;


    // Handle Recipe Search
    const searchRecipes = async (query) => {
        if (!query) {
            alert('Please enter a search query.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.get(
                `https://api.edamam.com/search?q=${query}&app_id=${APP_ID}&app_key=${APP_KEY}`
            );
            setRecipes(response.data.hits); // 'hits' contains the recipes
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <header>
                <h1>Dean's List - Recipes</h1>
            </header>

            <nav>
                <a href="/inventory">Inventory</a>
                <a href="/recipes">Recipes</a>
                <a href="/settings">Settings</a>
            </nav>

            <section id="content">
                <h2>Your Inventory Ingredients</h2>
                <ul>
                    {inventoryItems.map((item, index) => (
                        <li key={index}>
                            {item.item_name} - {item.quantity}
                        </li>
                    ))}
                </ul>

                <h2>Search for Recipes</h2>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter an ingredient or recipe name"
                />
                <button onClick={() => searchRecipes(searchQuery)}>Search</button>

                {loading && <p>Loading recipes...</p>}

                <h2>Recipe Results</h2>
                {recipes.length > 0 ? (
                    <ul>
                        {recipes.map((recipe, index) => (
                            <li key={index}>
                                <h3>{recipe.recipe.label}</h3>
                                <img
                                    src={recipe.recipe.image}
                                    alt={recipe.recipe.label}
                                    style={{ width: '150px', height: '150px' }}
                                />
                                <p>
                                    <a href={recipe.recipe.url} target="_blank" rel="noopener noreferrer">
                                        View Full Recipe
                                    </a>
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No recipes found. Try searching for something else!</p>
                )}
            </section>
        </div>
    );
}

export default Recipes;
