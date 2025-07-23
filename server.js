const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
app.use(express.json());

// Sign up a new client and return their unique snippet
app.post("/api/signup", async (req, res) => {
  const { name, email } = req.body;
  const clientId = uuidv4();
  const { error } = await supabase
    .from("clients")
    .insert([{ name, email, client_id: clientId }]);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    clientId,
    snippet: `<script src="https://framtt-backend.onrender.com/snippet/${clientId}.js"></script>`,
  });
});

// Receive bookings from snippets
app.post("/api/bookings", async (req, res) => {
  const { clientId, name, phone, vehicle, startDate, endDate } = req.body;
  if (!clientId)
    return res.status(400).json({ error: "clientId required" });

  const { error } = await supabase
    .from("bookings")
    .insert([
      {
        client_id: clientId,
        name,
        phone,
        vehicle,
        start_date: startDate,
        end_date: endDate,
      },
    ]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Booking saved!" });
});

// Serve the client-specific snippet
app.get("/snippet/:clientId.js", (req, res) => {
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

app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);
