const fs         = require('fs');
const {execSync} = require('child_process');
const cpr        = require('cpr');

if(!fs.existsSync('./dist'))
  fs.mkdirSync('./dist');

if(!fs.existsSync('./dist/node_modules'))
  fs.mkdirSync('./dist/node_modules');

if(!fs.existsSync('./dist/resources'))
  fs.mkdirSync('./dist/resources');

execSync('pkg ./index.js');

cpr('./node_modules/node-lua', './dist/node_modules/node-lua', {
  deleteFirst : true,
  overwrite   : true,
  confirm     : true,
}, (err, files) => {

  fs.renameSync('./index-win.exe', './dist/index-win.exe');
  fs.renameSync('./index-linux',   './dist/index-linux');
  fs.renameSync('./index-macos',   './dist/index-macos');

  fs.createReadStream('./loader.lua').pipe(fs.createWriteStream('./dist/loader.lua'))

  console.log('Done generating ./dist content');
});