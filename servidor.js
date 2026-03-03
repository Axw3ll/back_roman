const express = require('express')
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

const app = express()
const PORT = 3000

app.use(express.json()) // 👈 necesario para leer JSON del body

// 🔹 Variable global para guardar el último dato recibido
let sensorData = {
    Temperature: null,
    Humidity: null,
    ButtonState: null
}

// 🔹 Configuración del puerto serial
const serialPort = new SerialPort({
    path: 'COM4',
    baudRate: 9600
})

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

serialPort.on('open', () => {
    console.log('✅ Puerto serial abierto')
})

// 🔹 Cuando llegan datos del microcontrolador
parser.on('data', (data) => {
    try {
        const parsed = JSON.parse(data)
        sensorData = parsed
        console.log('📥 Datos actualizados:', sensorData)
    } catch (err) {
        console.log('⚠️ Error parseando JSON:', data)
    }
})

// 🔹 Manejo de error serial
serialPort.on('error', (err) => {
    console.error('❌ Error en puerto serial:', err.message)
})

/* ===========================
   📡 ENDPOINTS
=========================== */

// Obtener todo
app.get('/api/sensors', (req, res) => {
    res.json(sensorData)
})

// Obtener temperatura
app.get('/api/temperature', (req, res) => {
    res.json({ temperature: sensorData.Temperature })
})

// Obtener humedad
app.get('/api/humidity', (req, res) => {
    res.json({ humidity: sensorData.Humidity })
})

// Obtener estado del botón
app.get('/api/button', (req, res) => {
    res.json({ button: sensorData.ButtonState })
})

// 🔥 NUEVO ENDPOINT → prender/apagar LED
app.post('/api/led', (req, res) => {
    const { state } = req.body

    if (state !== 'on' && state !== 'off') {
        return res.status(400).json({
            error: 'Estado inválido. Usa "on" o "off"'
        })
    }

    // Comando que se enviará al ESP32
    const command = state === 'on' ? 'on\n' : 'off\n'

    serialPort.write(command, (err) => {
        if (err) {
            console.error('❌ Error enviando comando:', err.message)
            return res.status(500).json({
                error: 'No se pudo enviar el comando'
            })
        }

        console.log('📤 Comando enviado:', command.trim())

        res.json({
            message: `LED ${state}`,
            command: command.trim()
        })
    })
})

// 🔹 Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 API corriendo en http://localhost:${PORT}`)
})