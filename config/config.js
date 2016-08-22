var config = {};
var fs = require('fs');

config.ssloptions = {
  ca: fs.readFileSync('/etc/letsencrypt/live/0001_chain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/sheppard.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/0001_cert.pem'),
  ciphers: 'EECDH EDH AESGCM HIGH !aNULL !eNULL !3DES !DES !DSS !EXP !IDEA !LOW !MD5 !PSK !RC4 !SRP',
  honorCipherOrder: true
};

config.database = {
  host     : 'IP_ADDRESS',
  user     : 'USER',
  password : 'PASSWORD',
  database : 'integ62'
}

module.exports = config;
