import React, { useEffect, useState } from 'react';
import {
    Container, Grid, Card, CardContent, Typography, CardActionArea,
    Chip, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions,
    Box, Fab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
    const [tables, setTables] = useState([]);
    const [open, setOpen] = useState(false);
    const [newTableId, setNewTableId] = useState('');
    const [newTableName, setNewTableName] = useState('');
    const navigate = useNavigate();

    const fetchTables = async () => {
        try {
            const response = await api.get('/masalar');
            setTables(response.data);
        } catch (error) {
            console.error("Masalar yüklenirken hata oluştu:", error);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleCreateTable = async () => {
        if (!newTableId || !newTableName) return;
        try {
            await api.post('/masalar', { id: newTableId, masa_adi: newTableName });
            setOpen(false);
            setNewTableId('');
            setNewTableName('');
            fetchTables();
        } catch (error) {
            alert(error.response?.data?.error || "Masa oluşturulurken hata oluştu");
        }
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1">
                    Masalar
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                    Yeni Masa Ekle
                </Button>
            </Box>

            <Grid container spacing={3}>
                {tables.map((table) => (
                    <Grid item xs={12} sm={6} md={4} key={table.id}>
                        <Card
                            sx={{
                                bgcolor: table.durum === 'Dolu' ? '#ffebee' : '#e8f5e9',
                                border: table.durum === 'Dolu' ? '1px solid #ef9a9a' : '1px solid #a5d6a7'
                            }}
                        >
                            <CardActionArea onClick={() => navigate(`/table/${table.id}`)}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h5" component="div">
                                            {table.ad}
                                        </Typography>
                                        <Chip
                                            label={table.durum}
                                            color={table.durum === 'Dolu' ? 'error' : 'success'}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Toplam Sipariş: {table.toplam_siparis_tutari} TL
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Kalan Bakiye: <strong>{table.kalan_bakiye} TL</strong>
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Yeni Masa Oluştur</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Masa ID (örn: masa-1)"
                        fullWidth
                        variant="outlined"
                        value={newTableId}
                        onChange={(e) => setNewTableId(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="Masa Adı (örn: Bahçe 1)"
                        fullWidth
                        variant="outlined"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>İptal</Button>
                    <Button onClick={handleCreateTable} variant="contained">Oluştur</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Dashboard;
