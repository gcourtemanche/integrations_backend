var config = {};
var fs = require('fs');

config.ssloptions = {
  ca: fs.readFileSync('/etc/ssl.ageg/ageg.ca.cabundle.crt'),
  key: fs.readFileSync('/etc/ssl.ageg/ageg.ca.key'),
  cert: fs.readFileSync('/etc/ssl.ageg/ageg.ca.crt'),
  ciphers: 'EECDH EDH AESGCM HIGH !aNULL !eNULL !3DES !DES !DSS !EXP !IDEA !LOW !MD5 !PSK !RC4 !SRP',
  honorCipherOrder: true
};

config.database = {
  host     : 'IP_ADDRESS',
  user     : 'USER',
  password : 'PASSWORD',
  database : 'integ61'
}

module.exports = config;
