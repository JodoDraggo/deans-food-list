import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const baseUrl = process.env.NODE_ENV === "production"
        ? "http://deansfoodlist.ddns.net:3001"
        : "http://192.168.0.24:3001";

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://deansfoodlist.ddns.net:3001/login', {
                username,
                password,
            });
            //Store the token that keeps user logged in between page switches
            localStorage.setItem('token', response.data.token);

            //Redirect user to the HomePage
            navigate('/home');

            //Force page reload
            window.location.reload();
        } catch (error) {
            console.error('Login failed', error);
            alert('Invalid username or password');
        }
    };

/* Original, before CSS 
    return (
        <div>
            <section id='content'>
                <h1>Login</h1>
                <input
                    type="text"
                    placeholder='Username'
                    value={username}
                    onChange={(username) => setUsername(username.target.value)}
                />
                <input
                    type="password"
                    placeholder='Password'
                    value={password}
                    onChange={(password) => setPassword(password.target.value)}
                />
                <button onClick={handleLogin}>Login</button>
                <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
            </section>
        </div>
    );
*/

/* New, CSS, version */
    return (
        <div>
            <section id='content' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}> {/* Flex column */}
                <h1>Login</h1>
                <input
                    type="text"
                    placeholder='Username'
                    value={username}
                    onChange={(username) => setUsername(username.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px' }} // Full width, margin below
                />
                <input
                    type="password"
                    placeholder='Password'
                    value={password}
                    onChange={(password) => setPassword(password.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px' }} // Full width, margin below
                />
                <button onClick={handleLogin} style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px' }}>Login</button> {/* Full width, margin below */}
                <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
            </section>
        </div>
    );


}//LoginPage()