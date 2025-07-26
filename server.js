const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json());

// Register a new client and give their snippet/dashboard link
app.post("/api/signup", async (req, res) => {
  const { name, email } = req.body;
  const clientId = uuidv4();
  await supabase.from("clients").insert([{ name, email, client_id: clientId }]);
  return res.json({
    clientId,
    snippet: `<script src="https://framtt-backend.onrender.com/snippet/${clientId}.js"></script>`,
    dashboard: `https://framtt-frontend.vercel.app/dashboard?clientId=${clientId}`
  });
});

// Receive booking submissions from the snippet
app.post("/api/bookings", async (req, res) => {
  const { clientId, name, phone, vehicle, startDate, endDate } = req.body;
  await supabase.from("bookings").insert([{ client_id: clientId, name, phone, vehicle, start_date: startDate, end_date: endDate }]);
  res.json({ message: "Booking saved!" });
});

// Serve the client-specific snippet
app.get('/snippet/:clientId.js', (req, res) => {
  const { clientId } = req.params;
  const snippet = `
    (function(){
      const CLIENT_ID = "${clientId}";
      document.addEventListener("DOMContentLoaded", function(){
        var form = document.querySelector("form.booking-form");
        if(!form) return;
        form.addEventListener("submit", function(){
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

app.listen(port, () => console.log(`Server running on port ${port}`));
