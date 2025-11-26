// rest_server.mjs

import express from "express";
import sqlite3 from "sqlite3";

// Create Express app
const app = express();
const PORT = 8000;

// Enable JSON body parsing for PUT /new-incident
app.use(express.json());

// Connect to SQLite database
sqlite3.verbose();
const db = new sqlite3.Database("./db/stpaul_crime.sqlite3", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

/**
 * GET /codes
 * Returns: [{ "code": 100, "type": "MURDER" }, ...]
 */
app.get("/codes", (req, res) => {

  if(!req.query.code) {
    const sql = `
      SELECT code, incident_type
      FROM Codes
      ORDER BY code;
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("GET /codes error:", err);
        res.status(500).json({ error: "Database error" });
        return;
      }

      const result = rows.map((row) => ({
        code: row.code,
        type: row.incident_type,
      }));

      res.json(result);
    });
  }
  else {
    let arr = req.query.code.split(",");
    let x = ""
    for (let i = 0; i < arr.length; i++) {
        x = x + "code = " + arr[i];
        if (i !== arr.length-1) {
          x = x + " OR "
        }
    }
    let y = "SELECT code, incident_type FROM Codes WHERE " + x + " ORDER BY code";
    db.all(y, (err, rows) => {
      if (err) {
        return res.status(500).type("txt").send("SQL Error");
      }
      res.status(200).type("json").send(JSON.stringify(rows));
    });

  }
});

/**
 * GET /neighborhoods
 * Returns: [{ "id": 1, "name": "Conway/Battlecreek/Highwood" }, ...]
 */
app.get("/neighborhoods", (req, res) => {

  if (!req.query.id) {
    const sql = `
      SELECT neighborhood_number, neighborhood_name
      FROM Neighborhoods
      ORDER BY neighborhood_number;
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("GET /neighborhoods error:", err);
        res.status(500).json({ error: "Database error" });
        return;
      }

      const result = rows.map((row) => ({
        id: row.neighborhood_number,
        name: row.neighborhood_name,
      }));

      res.json(result);
    });
  }
  else {
    let arr = req.query.id.split(",");
    let x = ""
    for (let i = 0; i < arr.length; i++) {
        x = x + "neighborhood_number = " + arr[i];
        if (i !== arr.length-1) {
          x = x + " OR "
        }
    }
    let y = "SELECT neighborhood_number, neighborhood_name FROM Neighborhoods WHERE " + x + " ORDER BY neighborhood_number";
    db.all(y, (err, rows) => {
      if (err) {
        return res.status(500).type("txt").send("SQL Error");
      }
      res.status(200).type("json").send(JSON.stringify(rows));
    });
  }
});

/**
 * GET /incidents
 * Returns: list of incidents, with date and time split
 * [
 *   {
 *     "case_number": "19245020",
 *     "date": "2019-10-30",
 *     "time": "23:57:08",
 *     "code": 9954,
 *     "incident": "Proactive Police Visit",
 *     "police_grid": 87,
 *     "neighborhood_number": 7,
 *     "block": "THOMAS AV  & VICTORIA"
 *   },
 *   ...
 * ]
 */
app.get("/incidents", (req, res) => {
  /*
  const sql = `SELECT case_number, date_time, code, incident, police_grid, neighborhood_number, block FROM Incidents ORDER BY date_time DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("GET /incidents error:", err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    const result = rows.map((row) => {
      // date_time format: "YYYY-MM-DD HH:MM:SS"
      const dateTime = row.date_time || "";
      const date = dateTime.slice(0, 10);  // "YYYY-MM-DD"
      const time = dateTime.slice(11);     // "HH:MM:SS"

      return {
        case_number: row.case_number,
        date,
        time,
        code: row.code,
        incident: row.incident,
        police_grid: row.police_grid,
        neighborhood_number: row.neighborhood_number,
        block: row.block,
      };
    });

    res.json(result);
  });
  */
    let l = "1000"
    let c = ""
    let g = ""
    let n = ""
    let w = "WHERE "
    let flag = false;
    if (req.query.limit) {
      l = req.query.limit
    }
    if (req.query.code) {
      flag = true
      let arr = req.query.code.split(",");
      for (let i = 0; i < arr.length; i++) {
          c = c + "code = " + arr[i];
          if (i !== arr.length-1) {
            c = c + " OR "
          }
      } 
    }
    if (req.query.grid) {
      flag = true
      let arr = req.query.grid.split(",");
      for (let i = 0; i < arr.length; i++) {
          g = g + "police_grid = " + arr[i];
          if (i !== arr.length-1) {
            g = g + " OR "
          }
      } 
    }
    if (req.query.neighborhood) {
      flag = true
      let arr = req.query.neighborhood.split(",");
      for (let i = 0; i < arr.length; i++) {
          n = n + "neighborhood_number = " + arr[i];
          if (i !== arr.length-1) {
            n = n + " OR "
          }
      } 
    }
    if (!flag) {
      w = ""
    }
    let sql = "SELECT case_number, date_time, code, incident, police_grid, neighborhood_number, block FROM Incidents " + w + c + g + n + " ORDER BY date_time DESC LIMIT " + l
    db.all(sql, (err, rows) => {
      if (err) {
        return res.status(500).type("txt").send("SQL Error");
      }
      res.status(200).type("json").send(JSON.stringify(rows));
    });
});

/**
 * PUT /new-incident
 * Body JSON:
 * {
 *   "case_number": "TEST00001",
 *   "date": "2019-10-30",
 *   "time": "23:57:08",
 *   "code": 700,
 *   "incident": "Auto Theft",
 *   "police_grid": 95,
 *   "neighborhood_number": 4,
 *   "block": "79X 6 ST E"
 * }
 *
 * - 500 if case_number already exists
 * - 400 if missing required fields
 */
app.put("/new-incident", (req, res) => {
  const {
    case_number,
    date,
    time,
    code,
    incident,
    police_grid,
    neighborhood_number,
    block,
  } = req.body;

  // Basic validation: check required fields
  if (
    !case_number ||
    !date ||
    !time ||
    code === undefined ||
    !incident ||
    police_grid === undefined ||
    neighborhood_number === undefined ||
    !block
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const date_time = `${date} ${time}`; // "YYYY-MM-DD HH:MM:SS"

  // 1) Check if case_number already exists
  const checkSql = `
    SELECT 1 FROM Incidents WHERE case_number = ?;
  `;

  db.get(checkSql, [case_number], (err, row) => {
    if (err) {
      console.error("PUT /new-incident check error:", err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    if (row) {
      // case_number already exists
      res.status(500).json({ error: "Case number already exists" });
      return;
    }

    // 2) Insert new incident
    const insertSql = `
      INSERT INTO Incidents
      (case_number, date_time, code, incident,
       police_grid, neighborhood_number, block)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    const params = [
      case_number,
      date_time,
      code,
      incident,
      police_grid,
      neighborhood_number,
      block,
    ];

    db.run(insertSql, params, function (err2) {
      if (err2) {
        console.error("PUT /new-incident insert error:", err2);
        res.status(500).json({ error: "Database error" });
        return;
      }

      res.status(200).json({
        status: "success",
        case_number,
      });
    });
  });
});


app.delete("/remove-incident", (req, res) => {
  if (!req.body.case_number) {
    return res.status(400).json({ error: "No case number provided." });
  }
  else {
    let x = "SELECT * FROM Incidents where case_number = ?"
    db.get(x, req.body.case_number, (err, row) => {
        if (err) {
          return res.status(500).type("txt").send("SQL Error");
        }
        if (!row) {
          return res.status(500).type("txt").send("No such case.");
        }   
        let y = "DELETE FROM Incidents where case_number = ?"
        db.run(y, req.body.case_number, (err, row) => {
          if (err) {
            return res.status(500).type("txt").send("SQL Error");
          }
          else {
            return res.status(200).type("txt").send("Deleted case.");
          }
        });
    });  
  }
});

// basic 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
