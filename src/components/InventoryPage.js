import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import Quagga from 'quagga'; // Import Quagga for barcode detection
import axios from 'axios'; // Import Axios for API requests
//import '../Apps.css'; // Assuming you have the appropriate CSS for layout

export default function InventoryPage() {
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', quantity: '', expiration: '', category: '', upc: '' });
    const [sortCategory, setSortCategory] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState('asc'); // State to track sort order
    const [showScanner, setShowScanner] = useState(false); // State to show the scanner
    const [scannedUPC, setScannedUPC] = useState(''); // State to store the scanned UPC

    const webcamRef = useRef(null); // Webcam reference

    // Function to fetch product details from Open Food Facts API
    const fetchProductDetails = async (upcCode) => {
        try {
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${upcCode}.json`);
            const product = response.data.product;

            if (product) {
                // Format the product name and category
                const productName = product.product_name
                    ? product.product_name.replace(/\b\w/g, char => char.toUpperCase()) // Capitalize first letter of each word
                    : 'Unknown Item';
                const productCategory = product.categories_tags
                    ? product.categories_tags[0].replace('en:', '').replace(/-/g, ' ') // Remove 'en:' and replace dashes with spaces
                    : 'Misc';
                const expirationDate = product.expiration_date || 'No Expiration';
                return { name: productName, category: productCategory, expiration: expirationDate };
            } else {
                return { name: 'Unknown Item', category: 'Misc', expiration: 'No Expiration' };
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            return { name: 'Unknown Item', category: 'Misc', expiration: 'No Expiration' };
        }
    };

    // Handle adding a new item
    const addItem = (item) => {
        console.log("Adding item from UPC scan:", item); // Log the item being added
        // Use axios to send a POST request to the backend to add the new item to the inventory table
        axios.post('http://deansfoodlist.ddns.net:3001/inventory', {
            item_name: item.name,
            quantity: item.quantity,
            expiration_date: item.expiration === 'No Expiration' ? null : item.expiration, // Set expiration to null if "No Expiration"
            category: item.category,
            upc_code: item.upc
        },
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        }
        )
        .then(response => {
            // Update the items state to include the newly added item
             setItems([...items, { ...item, id: response.data.id }]);
            //setItems([...items, item]);
            
            // Clear the form fields after adding the item
            setNewItem({ name: '', quantity: '', expiration: '', category: '', upc: '' });
        })
        .catch(error => {
            console.error('Error adding item:', error);
        });
    };

    // Handle sorting by category
    const handleSortCategory = (category) => {
        setSortCategory(category);
    };

    // Handle sorting by field (e.g., name, quantity, expiration)
    const handleSortByField = (field) => {
        if (sortBy === field) {
            // Toggle the sorting order if the same field is clicked
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field and default to ascending order
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Handle deleting an item
    const deleteItem = (id) => {
        // Use axios to send a DELETE request to the backend
        axios.delete(`http://deansfoodlist.ddns.net:3001/inventory/${id}`)
            .then(() => {
                // Filter out the deleted item from the current items state
                setItems(items.filter(item => item.id !== id));
            })
            .catch(error => {
                console.error('Error deleting item:', error);
            });
    };

    // Fetch product details when UPC is manually entered
    const handleUPCChange = async (e) => {
        const upcCode = e.target.value;
        setNewItem({ ...newItem, upc: upcCode });

        if (upcCode.length === 12 || upcCode.length === 13) {
            const productDetails = await fetchProductDetails(upcCode);

            // Automatically add the item with fetched product details
            const newProductItem = {
                name: productDetails.name,
                quantity: 1,
                expiration: productDetails.expiration,
                category: productDetails.category,
                upc: upcCode
            };

            addItem(newProductItem);
        }
    };

    // Initialize Quagga when scanning starts
    useEffect(() => {
        if (showScanner && webcamRef.current) {
            const timer = setTimeout(() => {
                Quagga.init({
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: webcamRef.current.video, // Target the video stream from react-webcam
                        constraints: {
                            facingMode: "environment", // Use the back camera on mobile devices
                        },
                        frequency: 10 // Scan every 10 milliseconds
                    },
                    decoder: {
                        readers: ["upc_reader", "upc_e_reader", "ean_reader"] // Multiple barcode readers
                    },
                    locator: {
                        patchSize: "medium", // "x-small", "small", "medium", "large" or "x-large"
                        halfSample: true, // Reduces image size for faster performance
                    },
                    debug: true, // Enable debug mode to see how the barcode is being processed
                }, (err) => {
                    if (err) {
                        console.error("Error initializing Quagga:", err);
                        return;
                    }
                    Quagga.start(); // Start the barcode scanner
                });
    
                // Listen for barcode detection
                Quagga.onDetected(async (data) => {
                    if (data && data.codeResult && data.codeResult.code) {
                        const scannedUPCCode = data.codeResult.code;
                        console.log("UPC Code scanned:", scannedUPCCode); // Log to console for debugging
                        setScannedUPC(scannedUPCCode); // Store the scanned UPC
    
                        // Fetch product details from Open Food Facts API
                        const productDetails = await fetchProductDetails(scannedUPCCode);
                        console.log("Product details fetched:", productDetails);
    
                        // Automatically add the scanned item to the inventory with product details
                        const scannedItem = {
                            name: productDetails.name, // Product name from API
                            quantity: 1, // Default quantity
                            expiration: productDetails.expiration, // Expiration from API or default
                            category: productDetails.category, // Category from API
                            upc: scannedUPCCode // The scanned UPC code
                        };
                        addItem(scannedItem); // Add the item to the inventory
    
                        Quagga.stop(); // Stop scanning after detection
                        setShowScanner(false); // Hide the scanner after scanning
                    }
                });
            }, 3000);

            // Cleanup on component unmount or when scanner is stopped
            return () => {
                clearTimeout(timer);
                Quagga.stop(); // Stop Quagga when component unmounts or scanning stops
            };
        }
    }, [showScanner, webcamRef]);

    // Filter and sort items based on category and sorting field
    const filteredItems = sortCategory
        ? items.filter(item => item.category === sortCategory)
        : items;

    const sortedItems = filteredItems.sort((a, b) => {
        if (sortBy === 'item_name') {
            return sortOrder === 'asc'
                ? a.item_name.localeCompare(b.item_name)
                : b.item_name.localeCompare(a.item_name);
        } else if (sortBy === 'quantity') {
            return sortOrder === 'asc'
                ? a.quantity - b.quantity
                : b.quantity - a.quantity;
        } else if (sortBy === 'expiration_date') {
            console.log("Expiration: ", a.expiration_date, b.expiration_date);
            const dateA = new Date(a.expiration_date).getTime() || Infinity;
            const dateB = new Date(b.expiration_date).getTime() || Infinity;
            
            return sortOrder === 'asc'
                ? dateA - dateB
                : dateB - dateA;
        }
        return 0;
    });

    useEffect(() => {
        //Check if token. If there is a token, fetch inventory items
        const token = localStorage.getItem('token');
        if(token) {
            const fetchItems = async () => {
                try {
                    const items = await axios.get('http://deansfoodlist.ddns.net:3001/inventory', {
                        headers: {Authorization: `Bearer ${token}`}
                    });
                    setItems(items.data); //Store the fetched items
                } catch (error) {
                    console.error('Erro fetching inventory items: ', error);
                }
            };
            fetchItems(); //Call the function you just made, so you can acutally fetch the items
        }

        /*
        // Fetch inventory items from the backend
        axios.get('http://localhost:3001/inventory')
            .then(response => {
                setItems(response.data); // Populate the items state with the data from the backend
            })
            .catch(error => {
                console.error('Error fetching inventory data:', error);
            });
        */
    }, []); // Empty dependency array to run this effect only once when the component mounts    

    return (
        <div className="inventory-page">
            <header>
                <h1>Dean's Food List</h1>
            </header>

            <nav>
                <a href="/inventory">Inventory</a>
                <a href="/list">List</a>
                <a href="/recipes">Recipes</a>
                <a href="/settings">Settings</a>
            </nav>

            <section id="content">
                <h2>Inventory</h2>
                <p>Manage your grocery inventory here. Add or delete items from your inventory list.</p>
                <p><strong>Items may be added via manual input or via UPC barcode scanning.</strong></p>

                <div className="item-form">
                    <input
                        type="text"
                        placeholder="Item Name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Quantity"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                    <input
                        type="date"
                        placeholder="Expiration Date"
                        value={newItem.expiration}
                        onChange={(e) => setNewItem({ ...newItem, expiration: e.target.value })}
                    />
                    <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    >
                        <option value="">Select Category</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Produce">Produce</option>
                        <option value="Meat">Meat</option>
                        <option value="Beverages">Beverages</option>
                    </select>

                    {/* Manually Enter UPC Code */}
                    <input
                        type="text"
                        placeholder="UPC Code"
                        value={newItem.upc}
                        onChange={handleUPCChange} // Trigger fetch when UPC is manually entered
                    />
                    <button onClick={() => addItem(newItem)}>Add Item</button>
                    <button onClick={() => setShowScanner(true)}>Scan UPC</button>
                </div>

                {/* Webcam for UPC Scanning */}
                {showScanner && (
                    <div className="scanner">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            width={640} // Set the resolution to 640x480 for better barcode detection
                            height={480}
                            videoConstraints={{
                                facingMode: "environment" // Use back camera
                            }}
                        />
                        <button onClick={() => setShowScanner(false)}>Close Scanner</button>
                    </div>
                )}

                <div className="sort-options">
                    <label>Filter by Category: </label>
                    <select onChange={(e) => handleSortCategory(e.target.value)}>
                        <option value="">All</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Produce">Produce</option>
                        <option value="Meat">Meat</option>
                        <option value="Beverages">Beverages</option>
                    </select>

                    <label>Sort by Field: </label>
                    <select onChange={(e) => handleSortByField(e.target.value)}>
                        <option value="">None</option>
                        <option value="item_name">Name</option>
                        <option value="quantity">Quantity</option>
                        <option value="expiration_date">Expiration Date</option>
                    </select>
                </div>

                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSortByField('quantity')}
                            >
                                Quantity {sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th>Expiration Date</th>
                            <th>Category</th>
                            <th>UPC Code</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item, index) => (
                            <tr key={item.id}>
                                <td>{item.item_name}</td>
                                <td>{item.quantity}</td>
                                <td>{item.expiration_date}</td>
                                <td>{item.category}</td>
                                <td>{item.upc_code}</td>
                                <td>
                                    <button onClick={() => deleteItem(item.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
