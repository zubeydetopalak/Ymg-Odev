import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, List, ListItem, ListItemText,
    Divider, Grid, TextField, Button, Box, Card, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/axios';

const TableDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [table, setTable] = useState(null);

    // Sipariş Ekleme State
    const [productName, setProductName] = useState('');
    const [price, setPrice] = useState('');

    // Ödeme State
    const [paymentAmount, setPaymentAmount] = useState('');

    const fetchTableDetails = async () => {
        try {
            const response = await api.get(`/masalar/${id}`);
            setTable(response.data);
        } catch (error) {
            console.error("Masa detayları alınamadı:", error);
            alert("Masa bulunamadı!");
            navigate('/');
        }
    };

    useEffect(() => {
        fetchTableDetails();
    }, [id]);

    const handleAddOrder = async () => {
        if (!productName || !price) return;
        try {
            await api.post('/siparis', {
                masa_id: id,
                urun_adi: productName,
                tutar: parseFloat(price)
            });
            setProductName('');
            setPrice('');
            fetchTableDetails();
        } catch (error) {
            alert("Sipariş eklenirken hata oluştu");
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount) return;
        try {
            await api.post('/odeme', {
                masa_id: id,
                tutar: parseFloat(paymentAmount)
            });
            setPaymentAmount('');
            fetchTableDetails();
        } catch (error) {
            alert("Ödeme alınırken hata oluştu");
        }
    };

    const handleResetTable = async () => {
        if (window.confirm("Bu masayı sıfırlamak istediğinize emin misiniz? Tüm siparişler silinecek.")) {
            try {
                await api.delete(`/masalar/${id}/sifirla`);
                navigate('/');
            } catch (error) {
                alert("Masa sıfırlanırken hata oluştu");
            }
        }
    };

    if (!table) return <Typography>Yükleniyor...</Typography>;

    return (
        <Container sx={{ mt: 4 }}>
            <Button onClick={() => navigate('/')} sx={{ mb: 2 }}>&larr; Geri Dön</Button>

            <Grid container spacing={4}>
                {/* Sol Taraf: Sipariş Listesi */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h5">{table.ad} - Siparişler</Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleResetTable}
                            >
                                Masayı Kapat / Sıfırla
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {table.siparisler && table.siparisler.length > 0 ? (
                            <List>
                                {table.siparisler.map((siparis, index) => (
                                    <React.Fragment key={siparis.id || index}>
                                        <ListItem>
                                            <ListItemText primary={siparis.ad} />
                                            <Typography variant="body1" fontWeight="bold">
                                                {siparis.tutar} TL
                                            </Typography>
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary" align="center" py={4}>
                                Henüz sipariş yok.
                            </Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Sağ Taraf: İşlemler */}
                <Grid item xs={12} md={4}>
                    {/* Özet Kartı */}
                    <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Hesap Özeti</Typography>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography>Toplam Tutar:</Typography>
                                <Typography fontWeight="bold">{table.toplam_siparis_tutari} TL</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography>Ödenen:</Typography>
                                <Typography color="success.main" fontWeight="bold">-{table.odenen_tutar} TL</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Kalan:</Typography>
                                <Typography variant="h6" color="error.main">{table.kalan_bakiye} TL</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Sipariş Ekleme */}
                    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Sipariş Ekle</Typography>
                        <TextField
                            label="Ürün Adı"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                        />
                        <TextField
                            label="Fiyat (TL)"
                            type="number"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                            onClick={handleAddOrder}
                            disabled={!productName || !price}
                        >
                            Ekle
                        </Button>
                    </Paper>

                    {/* Ödeme Alma */}
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Ödeme Al</Typography>
                        <TextField
                            label="Tutar (TL)"
                            type="number"
                            fullWidth
                            size="small"
                            margin="dense"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            sx={{ mt: 2 }}
                            onClick={handlePayment}
                            disabled={!paymentAmount}
                        >
                            Ödeme Yap
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default TableDetail;
