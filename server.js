// Import dependencies
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// >>>>> Define app and port EARLY <<<<<
const app = express();
const port = process.env.PORT || 5000;

// Supabase client using proper ENV VAR NAMES, not actual values!
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse JSON bodies in all POST requests:
app.use(express.json());

// -------------------
// 1. Health check endpoint (OPTIONAL, for Render/monitoring)
app.get('/status', (req, res) => res.json({ status: 'ok' }));

// -------------------
// 2. Register a new client and return their snippet/dashboard link
app.post("/api/signup", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }
  const clientId = uuidv4();

  const { error } = await supabase.from("clients").insert([
    { name, email, client_id: clientId }
  ]);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    clientId,
    snippet: `<script src="https://framtt-backend.onrender.com/snippet/${clientId}.js"></script>`,
    dashboard: `https://framtt-frontend.vercel.app/dashboard?clientId=${clientId}`
  });
});

// -------------------
// 3. Receive booking submissions from the snippet
app.post("/api/bookings", async (req, res) => {
  const { clientId, name, phone, vehicle, startDate, endDate } = req.body;
  if (!clientId || !name || !phone || !vehicle || !startDate || !endDate) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const { error } = await supabase.from("bookings").insert([
    { client_id: clientId, name, phone, vehicle, start_date: startDate, end_date: endDate }
  ]);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: "Booking saved!" });
});

// -------------------
// 4. Serve the client-specific snippet
app.get('/snippet/:clientId.js', (req, res) => {
  const { clientId } = req.params;
  // js code auto-posts form data, fields must match!
  const snippet = `
    (function(){
      const CLIENT_ID = "${clientId}";
      document.addEventListener("DOMContentLoaded", function(){
        var form = document.querySelector("form.booking-form");
        if(!form) return;
        form.addEventListener("submit", function(e){
          // Optionally prevent default form submit for ajax experience
          // e.preventDefault(); // uncomment this if you don't want page reload!
          var fd = new FormData(form);
          fetch("https://framtt-backend.onrender.com/api/bookings", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              clientId: CLIENT_ID,
              name: fd.get("name"),
              phone: fd.get("phone"),
              vehicle: fd.get("vehicle"),
              startDate: fd.get("start_date"),
              endDate: fd.get("end_date")
            })
          });
        });
      });
    })();
  `;
  res.setHeader("Content-Type", "application/javascript");
  res.send(snippet);
});

// -------------------
// 5. Listen and start server
app.listen(port, () => console.log(`Server running on port ${port}`));
