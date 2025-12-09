import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';

const Navbar = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    const checkLoginStatus = () => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    };

    useEffect(() => {
        checkLoginStatus();

        // Login sayfasından tetiklenen event'i dinle
        window.addEventListener('storage', checkLoginStatus);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        navigate('/login');
    };

    return (
        <AppBar position="sticky" elevation={2} sx={{ backgroundColor: '#fff', color: '#333' }}>
            <Container maxWidth="lg">
                <Toolbar disableGutters>
                    <RestaurantMenuIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography
                        variant="h6"
                        noWrap
                        component={RouterLink}
                        to="/"
                        sx={{
                            mr: 2,
                            display: { xs: 'none', md: 'flex' },
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                            flexGrow: 1
                        }}
                    >
                        SmartBill
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {isLoggedIn && (
                            <Button color="primary" component={RouterLink} to="/">
                                Masalar
                            </Button>
                        )}

                        {isLoggedIn ? (
                            <Button color="error" onClick={handleLogout}>
                                Çıkış Yap
                            </Button>
                        ) : (
                            <>
                                <Button color="primary" component={RouterLink} to="/login">
                                    Giriş Yap
                                </Button>
                                <Button variant="contained" color="primary" component={RouterLink} to="/register">
                                    Kayıt Ol
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar;
