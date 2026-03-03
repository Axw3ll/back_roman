const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = 3000

// 🔹 Últimos datos
let sensorData = {
    Temperature: null,
    Humidity: null,
    ButtonState: null
}

// 🔹 Serial
const serialPort = new SerialPort({
    path: 'COM4',
    baudRate: 9600
})

const parser = serialPort.pipe(
    new ReadlineParser({ delimiter: '\r\n' })
)

serialPort.on('open', () => {
    console.log('✅ Puerto serial abierto')
})

// 🔥 Cuando llegan datos del ESP32
parser.on('data', (data) => {
    try {
        const parsed = JSON.parse(data)
        sensorData = parsed

        console.log('📥 Datos recibidos:', sensorData)

        // 🚀 Emitir automáticamente a todos los clientes
        io.emit('sensorData', sensorData)

    } catch (err) {
        console.log('⚠️ Error parseando JSON:', data)
    }
})

serialPort.on('error', (err) => {
    console.error('❌ Error serial:', err.message)
})

/* ===========================
   🔥 SOCKET.IO
=========================== */

io.on('connection', (socket) => {
    console.log('🟢 Cliente conectado:', socket.id)

    // Enviar últimos datos al conectarse
    socket.emit('sensorData', sensorData)

    // 🔥 Escuchar evento desde el frontend para controlar LED
    socket.on('controlLED', (state) => {

        if (state !== 'on' && state !== 'off') return

        const command = state + '\n'

        serialPort.write(command, (err) => {
            if (err) {
                console.error('❌ Error enviando comando:', err.message)
                return
            }

            console.log('📤 Comando enviado al ESP32:', state)
        })
    })

    socket.on('disconnect', () => {
        console.log('🔴 Cliente desconectado:', socket.id)
    })
})

server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})