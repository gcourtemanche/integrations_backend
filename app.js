var express    = require("express");
var mysql      = require('mysql');
var app = express();
var bodyParser = require('body-parser');
var https = require('https');

var config = require('./config/config');
var connection = mysql.createConnection(config.database);

var tables = ["nouveaux", "chefs", "benevoles", "tsj"]

// Required to parse post request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/",function(req,res){
  res.send('Hello World Intégration 62!')
});

// Params : table and user id
// Return the user
app.get("/info", function(req, res) {
  if (req.query.id === "")
    req.query.id = "0";

  var sql = 'SELECT * FROM ' + req.query.table + ' WHERE id = ' + req.query.id + ';';
  connection.query(sql, function(err, user) {
    if (err) res.end();

    if (user === undefined || user.length === 0){
      res.end(JSON.stringify({response: null}));
    }
    else {
      res.end(JSON.stringify(user[0]));
    }
  });
});

// Params : bracelet uid
// Return the user
app.get("/uid", function(req, res) {
  var user = userByUID(req.query.uid, function(user) {
    if (user === null) {
      res.end(JSON.stringify({response: null}));
    } else {
      res.end(JSON.stringify(user));
    }
  })
});

// Params : first and last name of the user
// Return users like the names
app.get("/find", function(req, res) {
  all_users = [];
  function loop(i, callback) {
    var sql = 'SELECT id, prenom, nom FROM `' + tables[i] + '` WHERE `prenom` COLLATE UTF8_GENERAL_CI LIKE "' + req.query.prenom + '%" AND `nom` COLLATE UTF8_GENERAL_CI LIKE "' + req.query.nom + '%";';
    connection.query(sql, function(err, users) {
      if (err) res.end();

      for (var j = 0; j < users.length; j++) {
        users[j].nom += " " + tables[i];
        all_users.push(users[j]);
      }
     
      if (i === 3) {
        callback();
      } else {
        loop(++i, callback);
      }
    });
  }
  loop(0, function() {
    res.end(JSON.stringify(all_users));
  })
});

// Return stats on activities
app.get("/stats", function(req, res) {
  var sql = "SELECT SUM(`mechoui`) AS mechoui ,SUM(`mardi_in`) AS mardi_in ,SUM(`mardi_out`) AS mardi_out ,SUM(`mercredi_souper`) AS mercredi_souper ,SUM(`jeudi_diner`) AS jeudi_diner FROM bracelet;";
  connection.query(sql, function(err, stats) {
    if (err) res.end();
    res.end(JSON.stringify(stats[0]));
  });
});

// Params : bracelet uid, table and user id
// Match the bracelet with the user
app.post("/jumeler", function(req, res) {
  var user = userByUID(req.body.uid, function(user) {
    if (user === null) {
      var sql = 'INSERT INTO bracelet (type, id, uid) VALUES ("' + req.body.table + '", ' + req.body.id + ', "' + req.body.uid + '") ON DUPLICATE KEY UPDATE uid = VALUES(uid);'
      connection.query(sql, function(err, user) {
        if (err) res.end(JSON.stringify({response: "ERREUR"}));
        else res.end(JSON.stringify({response: "UID enregistré"}));
      });
    } else {
      res.end(JSON.stringify({response: "deja_jumeler", prenom: user.Prenom, nom: user.Nom}));
    }
  });
});

// Params : uid and the activity
// Scan an user for an activity
app.post("/scan", function(req, res) {
  var activite = req.body.activite;
  var uid = req.body.uid;

  var user = userByUID(uid, function(user) {
    if (user === null) {
      res.end(JSON.stringify({response: "bracelet_vide"}));
    } 
    else {
      var sql = 'SELECT * FROM bracelet WHERE uid = "' + uid + '";';
      connection.query(sql, function(err, user_scan) {
        if (err) res.end(JSON.stringify({response: "ERREUR"}));
        else {
          if (user_scan[0][activite] == 1) {
            res.end(JSON.stringify({response: "deja_participe", prenom: user.Prenom, nom: user.Nom}));
          }
          else {
            var sql = 'UPDATE bracelet SET ' + activite + ' = 1 WHERE uid = "' + uid + '";';
            connection.query(sql, function(err, user_scan) {
              if (err) res.end(JSON.stringify({response: "ERREUR"}));
              else res.end(JSON.stringify({response: "ok", user: user}));
            });
          }
        }
      });
    }
  });
});

// Params : uid
// Find in all the tables the uid
function userByUID (uid, callback) {
  if (uid !== "") {
    var sql = 'SELECT * FROM bracelet WHERE uid = "' + uid + '";';
    connection.query(sql, function(err, bracelet) {
      if (err || bracelet.length == 0) {
        return callback(null);
      }

      var sql = 'SELECT * FROM ' + bracelet[0].type + ' WHERE id = "' + bracelet[0].id + '";';
      connection.query(sql, function(err, user) {
        if (err || user.length == 0) {
          return callback(null);
        }
        user[0].table = tables.indexOf(bracelet[0].type);
        return callback(user[0]);
      });
    });
  } else {
    return callback(null);
  }
}

// Connect to the database
connection.connect(function(err){
  if(!err) {
      console.log("Database is connected ! \n\n");  
        var server = https.createServer(config.ssloptions, app).listen(31337, function(){
          var host = server.address().address;
          console.log('App listening at http://%s:31337', host);
        });
  } else {
      console.log(err);  
  }
});
