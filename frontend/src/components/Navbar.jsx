import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { Link as RouterLink } from 'react-router-dom';
import { Container } from '@mui/material';

const Navbar = () => {
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

                    <Button color="primary" component={RouterLink} to="/">
                        Masalar
                    </Button>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar;
