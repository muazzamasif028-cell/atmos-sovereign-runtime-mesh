import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <body style="background: #000; color: #0f0; font-family: monospace; text-align: center; padding: 50px;">
      <h1>ATMOS SOVEREIGN RUNTIME MESH</h1>
      <hr style="border-color: #0f0; width: 50%;">
      <p style="font-size: 20px;">STATUS: <span style="color: white; font-weight: bold;">NATURAL FLOW ACTIVE</span></p>
      <p>All 4 Levels are Synchronized on Cloud</p>
    </body>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Engine started on Port: ${PORT}`);
});
