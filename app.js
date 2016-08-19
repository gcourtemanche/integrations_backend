var express    = require("express");
var mysql      = require('mysql');
var app = express();
var bodyParser = require('body-parser');
var https = require('https');

var config = require('./config/config');
var connection = mysql.createConnection(config.database);

var tables = ["inscription", "membre_equipe", "benevole", "tsj"]

// Required to parse post request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/",function(req,res){
  res.send('Hello World!')
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
    var sql = 'SELECT id, prenom, nom FROM `' + tables[i] + '` WHERE `prenom` LIKE "' + req.query.prenom + '%" AND `nom` LIKE "' + req.query.nom + '%";';
    connection.query(sql, function(err, users) {
      if (err) res.end();

      for (var j = 0; j < users.length; j++) {
        // HACK TODO
        if (i === 0) {
          users[j].nom += " nouveau";
        } else if (i === 1) {
          users[j].nom += " chef d'équipe";
        } else {
          users[j].nom += " " + tables[i];
        }
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
  var sql = "SELECT SUM(`lundi_diner`) AS lundi_diner ,SUM(`lundi_bar`) AS lundi_bar ,SUM(`dast_debut`) AS dast_debut ,SUM(`dast_fin`) AS dast_fin ,SUM(`mechoui`) AS mechoui ,SUM(`jeudi_diner`) AS jeudi_diner FROM scan;";
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
      var sql = 'UPDATE ' + req.body.table + ' SET uid="' + req.body.uid + '" WHERE id = ' + req.body.id + ';';
      connection.query(sql, function(err, user) {
        if (err) res.end(JSON.stringify({response: "ERREUR"}));
        else res.end(JSON.stringify({response: "UID enregistré"}));
      });
    } else {
      res.end(JSON.stringify({response: "deja_jumeler", prenom: user.prenom, nom: user.nom}));
    }
  });
});

// Params : uid and the activity
// Scan an user for an activity
app.post("/scan", function(req, res) {
  var user = userByUID(req.body.uid, function(user) {
    var activite = req.body.activite;
    if (user === null) {
      res.end(JSON.stringify({response: "bracelet_vide"}));
    } 
    else {
      var sql = 'SELECT * FROM scan WHERE id = ' + user.id + ' AND table_name = "' + tables[user.table] + '";';
      connection.query(sql, function(err, user_scan) {
        if (err) res.end(JSON.stringify({response: "ERREUR"}));
        if (user_scan.length > 0) {
          if (user_scan[0][activite] == 1) {
            res.end(JSON.stringify({response: "deja_participe", prenom: user.prenom, nom: user.nom}));
          }
          else {
            var sql = 'UPDATE scan SET ' + activite + ' = 1 WHERE id = ' + user.id + ' AND table_name = "' + tables[user.table] + '";';
            connection.query(sql, function(err, user_scan) {
              if (err) res.end(JSON.stringify({response: "ERREUR"}));
              else res.end(JSON.stringify({response: "ok", user: user}));
            });
          }
        }
        else {
          var sql = 'INSERT INTO scan (id, table_name, ' + activite + ') VALUES (' + user.id + ', "' + tables[user.table] + '", 1);';
          connection.query(sql, function(err, user_scan) {
            if (err) res.end(JSON.stringify({response: "ERREUR"}));
            else res.end(JSON.stringify({response: "ok", user: user}));
          });
        }
      });
    }
  });
});

// Return the members of each team
app.get("/equipes",function(req,res){
  connection.query('SELECT id, nom FROM equipe WHERE actif = 1', function(err, equipes) {
    if (err) res.end();

    connection.query('SELECT id, prenom, nom, equipe_id FROM membre_equipe', function(err, membres) {
      if (err) res.end();

      var equipe_membres = {}
      var id_equipes = []
      for (var i in equipes) {
        equipe_membres[equipes[i].nom] = [];
        id_equipes[i] = equipes[i].id;
      }
      for (var j in membres) {
        var id_equipe = id_equipes.indexOf(membres[j].equipe_id);
        if (id_equipe !== -1)
          equipe_membres[equipes[id_equipe].nom].push(membres[j]);
      }
      res.end(JSON.stringify(equipe_membres));
    });
  });
});

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

// Params : uid
// Find in all the tables the uid
function userByUID (uid, callback) {
    if (uid !== "") {
      function loop(i, callback) {
        var sql = 'SELECT * FROM ' + tables[i] + ' WHERE uid = "' + uid + '";';
        connection.query(sql, function(err, user) {
          if (err) {
            return callback(null);
          }
          if (user.length > 0){
            user[0].table = i;
            return callback(user[0]);
          }
          else if (i === 3) {
            return callback(null);
          }
          else {
            loop(++i, callback);
          }
        });
      }
    loop(0, function(user) {
      return callback(user);
    });
  } else {
    return callback(null);
  }
}
