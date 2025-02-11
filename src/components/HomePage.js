import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HomePage.css';

//I believe this is, similar to todo, is how we can check items and remove them.
//When a button is pressed, call this func. This func will remove items from UI and call a query to remove item from database.

//make sure this is the 'toggleCheck' func from below
function RenderCheckBox({item, toggleCheck}) {

    function handleCheckboxClick()
    {
        toggleCheck(item)
    }

    return (
        <div>
            <label>
                <input type="checkbox" checked={item.complete} onChange={handleCheckboxClick}></input>
                {item.ListItem}
                
            </label>
        </div>
    );
}

function ItemList({items, toggleCheck}) {
    return (
        <div>
            <b><u>Here is my shopping list</u></b>
            {items.map(item => {
                return <RenderCheckBox key={item.id} toggleCheck={toggleCheck} item={item}/>
            })}

        </div>
    );
}



export default function HomePage() {
    console.log("on homepage");
    const [inputText, setInputText] = useState([]);
    const [newItems, setNewItems] = useState([]);


    /* Trying to add checklist */
    function toggleCheck(the_item)
    {
        const id = the_item.id;
        //const new_Items = [...newItems] //creating copy of newItems because you should never directly modify the original, unless you modify it in setNewItems()

        const new_Items = newItems.map(item => {
            if(item.id === id)
            {
                return{
                    ...item,
                    complete: !item.complete
                };
            }
            return item;
        });

        const item = new_Items.find(newItems => newItems.id === id) //make copy of obj. Find it via its unique ID

        //call backend function that sets complete to true
        const checkOffItem = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post('http://deansfoodlist.ddns.net:3001/items_check', {the_item}, { //calls to database, at port 3001, that it wants items
                    headers: {Authorization: `Bearer ${token}`} //Add Bearer before token for POST request
                });


                // update items list with new, checked-off, value
                //item.complete = !item.complete;
                setNewItems(new_Items);

                //setNewItems([...newItems, response.data]);



            } catch (error) {
                console.error('Error adding item:', error);
            }
        }
        checkOffItem();
    }


    //Fetch items from the database. useEffect func will do this when the HomePage is loaded
    useEffect(() => {
        const token = localStorage.getItem('token');

        //If there is a token, fetch ShoppingList items
        if(token) {
            const fetchItems = async () => {
                try {
                    const items = await axios.get("http://deansfoodlist.ddns.net:3001/items", {
                        headers: {Authorization: `Bearer ${token}`}
                    });
                    setNewItems(items.data); //Store the detched items
                } catch (error) {
                    console.error('Error fetching items: ', error);
                }
            };
            fetchItems(); //Function created. Now, calling it to fetch shopping list items
        } else {
            console.error('No token found, so no items fetched && redirecting to login.');
        }
    }, []); //run when the HomePage is loaded

    //Add an item to shopping list
    const addItem = async () => {
        if(!inputText.trim()) { //Check if input is empty
            alert('Please enter an item.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://deansfoodlist.ddns.net:3001/items', {ListItem: inputText}, { //calls to database, at port 3001, that it wants items
                headers: {Authorization: `Bearer ${token}`} //Add Bearer before token for POST request
            });

            console.log('Responseee: ', response)
            console.log('Responseee.data: ', response.data)
            setNewItems([...newItems, response.data]); //response.data contains the new item we are adding to newItems. An 'item' contains a name(string) and an id(int).
            console.log('newItems: ', newItems)
            setInputText(''); // Clear the input field
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    //Remove (delete) an item from the shopping list
    const deleteItem = async () => {

        // const new_Items = newItems.map(item => {
        //     if(item.complete === false)
        //     {
        //         return{
        //             ...item
        //         };
        //     }
        //     return item;
        // });

        const new_Items = newItems.filter(item => !item.complete);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://deansfoodlist.ddns.net:3001/items_delete', {newItems}, { //calls to database, at port 3001, that it wants items
                headers: {Authorization: `Bearer ${token}`} //Add Bearer before token for POST request
            });
            //only setNewItems if the requests succeeded.
            setNewItems(new_Items); //response.data contains the new item we are adding to newItems. An 'item' contains a name(string) and an id(int).
        } catch (error) {
            console.error('Error adding item:', error);
        }
    }


    return(
        <div>
            <header>
                <h1>Dean's Food List</h1>
            </header>

            <nav>
            </nav>

            <section id="content">
                <h1>Welcome to Dean's List!</h1>
                
                <div className="quick-entry">
                    <input 
                        type="text" 
                        id="new-item" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)} // Update inputText on change
                        placeholder="Add a new item"
                    />

                    <button id="add-button" onClick={addItem}>Add</button>
                    
                    <ul>
                        <li>
                        {<ItemList items={newItems} toggleCheck={toggleCheck} />}
                        </li>
                        <div>{newItems.filter(item => !item.complete).length} items left to get</div>
                    </ul>

                    <button id="remove-button" onClick={deleteItem}>Remove Checked Items</button>




                </div>
            </section>
        </div>
    );
}