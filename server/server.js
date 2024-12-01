const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = 3001;

// Configuración de CORS más permisiva
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar límites de payload más altos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Conexión MongoDB
mongoose.connect('mongodb+srv://octavio:hola@cluster0.h7hdj.mongodb.net/basurainteligente')
    .then(() => {
        console.log('Conexión exitosa a MongoDB');
        app.listen(port, '0.0.0.0', () => {  // Escuchar en todas las interfaces
            console.log(`Servidor corriendo en puerto ${port}`);
        });
    })
    .catch(err => {
        console.error('Error de conexión a MongoDB:', err);
        process.exit(1);
    });

// Esquema de datos unificado
const basuraSchema = new mongoose.Schema({
    _id: { type: String, default: 'basura_principal' },
    count: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    tapaAbierta: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
});

const Basura = mongoose.model('Basura', basuraSchema);

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Endpoint para verificar el servidor
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

// Endpoint para recibir datos del sensor
app.post('/sensor-data', async (req, res) => {
    try {
        console.log('Datos recibidos:', req.body);
        
        const { count, distance } = req.body;
        
        if (count === undefined || distance === undefined) {
            return res.status(400).json({ 
                error: 'Datos incompletos',
                received: req.body 
            });
        }

        // Actualizar o crear el documento único
        const basura = await Basura.findOneAndUpdate(
            { _id: 'basura_principal' },
            { 
                count,
                distance,
                lastUpdated: Date.now()
            },
            { 
                upsert: true, 
                new: true 
            }
        );

        res.status(201).json({ 
            message: 'Datos actualizados correctamente',
            data: basura
        });
    } catch (error) {
        console.error('Error en /sensor-data:', error);
        res.status(500).json({ 
            error: 'Error al guardar datos',
            details: error.message 
        });
    }
});

// Endpoint para obtener datos actuales
app.get('/datos-actuales', async (req, res) => {
    try {
        const basura = await Basura.findById('basura_principal');
        res.json(basura || { 
            count: 0, 
            distance: 0, 
            tapaAbierta: false,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('Error en /datos-actuales:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// Endpoint para actualizar estado de la tapa
app.post('/estado-tapa', async (req, res) => {
    try {
        console.log('Actualización de tapa recibida:', req.body);
        
        const { tapaAbierta } = req.body;
        
        if (tapaAbierta === undefined) {
            return res.status(400).json({ 
                error: 'Estado de tapa no especificado',
                received: req.body 
            });
        }

        const basura = await Basura.findOneAndUpdate(
            { _id: 'basura_principal' },
            { 
                tapaAbierta,
                lastUpdated: Date.now()
            },
            { 
                upsert: true, 
                new: true 
            }
        );
        res.status(201).json({ 
            message: 'Estado de tapa actualizado', 
            data: basura 
        });
    } catch (error) {
        console.error('Error en /estado-tapa:', error);
        res.status(500).json({ 
            error: 'Error al actualizar estado de la tapa',
            details: error.message 
        });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message 
    });
});

