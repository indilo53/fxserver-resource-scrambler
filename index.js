const fs      = require('fs');
const glob    = require('glob');
const uuidv4  = require('uuid/v4');
const {ncp}   = require('ncp');
const del     = require('del');
const nodelua = require('node-lua');

const addEventHandlerRe           = /AddEventHandler\(["'](.*?)["']/g;
const triggerEventRe              = /TriggerEvent\(["'](.*?)["']/g;
const registerServerEventRe       = /RegisterServerEvent\(["'](.*?)["']\)/g;
const triggerClientEventRe        = /TriggerClientEvent\(["'](.*?)["']/g;
const triggerServerEventRe        = /TriggerServerEvent\(["'](.*?)["']/g;
const registerNetEventRe          = /RegisterNetEvent\(["'](.*?)["']\)/g;
const esxRegisterServerCallbackRe = /ESX\.RegisterServerCallback\(["'](.*?)["']/g;
const esxTriggerServerCallbackRe  = /ESX\.TriggerServerCallback\(["'](.*?)["']/g;

function luaObj2Array(obj) {

  const arr = [];
  let   i   = 0;
  let   k;

  do {

    i++;

    k = i.toString();

    if(typeof obj[k] != 'undefined')
      arr.push(obj[k]);

  } while (typeof obj[k] != 'undefined')

  return arr;
}

const systemResources = [
  'fivem',
  'fivem-awesome1501',
  'fivem-map-hipster',
  'fivem-map-skater',
  'runcode',
  'race',
  'race-test',
  'channelfeed',
  'irc',
  'obituary',
  'obituary-deaths',
  'playernames',
  'mapmanager',
  'baseevents',
  'chat',
  'hardcap',
  'rconlog',
  'scoreboard',
  'sessionmanager',
  'spawnmanager',
  'yarn',
  'betaguns',
  'gameInit',
  'keks',
];

const systemServerEvents = [];
const systemNetEvents    = [];
const systemClientEvents = [];

const oldServerEvents    = [];
const oldNetEvents       = [];
const oldClientEvents    = [];
const oldEsxCallbacks    = [];
const newServerEvents    = [];
const newNetEvents       = [];
const newClientEvents    = [];
const newEsxCallbacks    = [];

const serverScripts = [];
const clientScripts = [];

console.log('Cloning resources');

function main() {

  ncp('./resources', './scrambled_resources', (err) => {

    if(err)
      throw err;

    glob("scrambled_resources/**/__resource.lua", function (er, files) {

      console.log('Generating file list');

      for(let i=0; i<files.length; i++) {

        const lua          = new nodelua.LuaState();
        const resourceCode = fs.readFileSync(files[i]).toString();
        const split        = files[i].split('/');

        split.pop();

        const directory    = './' + split.join('/');
        const resourceName = split.pop();

        lua.DoFile('./loader.lua');

        try {

          lua.DoString(resourceCode);

        } catch (e) { console.error('FAILED PARSING ' + files[i] + e) }

        lua.GetGlobal('__SCRIPTS');

        const scripts        = lua.ToValue(-1);
        const _serverScripts = luaObj2Array(scripts.server);
        const _clientScripts = luaObj2Array(scripts.client);

        for(let j=0; j<_serverScripts.length; j++)
          if(_serverScripts[j].substr(0, 1) != '@' && fs.existsSync(directory + '/' + _serverScripts[j]) && _serverScripts[j].substr(-4) == '.lua')
            serverScripts.push(directory + '/' + _serverScripts[j]);

        for(let j=0; j<_clientScripts.length; j++)
          if(_clientScripts[j].substr(0, 1) != '@' && fs.existsSync(directory + '/' + _clientScripts[j]) && _clientScripts[j].substr(-4) == '.lua')
            clientScripts.push(directory + '/' + _clientScripts[j]);
      }

      for(let i=0; i<serverScripts.length; i++) {

        let isSystemResource = false;

        for(let j=0; j<systemResources.length; j++) {
          if(serverScripts[i].indexOf('/' + systemResources[j] + '/') != -1) {
            isSystemResource = true;
            break;
          }
        }

        const code = fs.readFileSync(serverScripts[i]).toString();

        let match;

        do {

          match = registerServerEventRe.exec(code);

          if(match) {

            if(isSystemResource) {

              if(systemServerEvents.indexOf(match[1]) == -1)
                systemServerEvents.push(match[1]);

            } else {

              if(oldServerEvents.indexOf(match[1]) == -1)
                oldServerEvents.push(match[1]);
            }

          }

        } while (match);

        do {

          match = esxRegisterServerCallbackRe.exec(code);

          if(match) {

            if(oldEsxCallbacks.indexOf(match[1]) == -1)
              oldEsxCallbacks.push(match[1]);
          }

        } while (match);
      }

      for(let i=0; i<clientScripts.length; i++) {

        let isSystemResource = false;

        for(let j=0; j<systemResources.length; j++) {
          if(clientScripts[i].indexOf('/' + systemResources[j] + '/') != -1) {
            isSystemResource = true;
            break;
          }
        }

        const code = fs.readFileSync(clientScripts[i]).toString();

        let match;

        do {

          match = registerNetEventRe.exec(code);

          if (match) {

            if(isSystemResource) {

              if(systemNetEvents.indexOf(match[1]) == -1)
                systemNetEvents.push(match[1]);

            } else {

              if(oldNetEvents.indexOf(match[1]) == -1)
                oldNetEvents.push(match[1]);
            }

          }

        } while (match);

        do {

          match = addEventHandlerRe.exec(code);

          if (match) {

            if(isSystemResource) {

              if(systemClientEvents.indexOf(match[1]) == -1)
                systemClientEvents.push(match[1]);

            } else if(systemNetEvents.indexOf(match[1]) == -1) {

              if(oldClientEvents.indexOf(match[1]) == -1)
                oldClientEvents.push(match[1]);
            }

          }

        } while (match);

        do {

          match = triggerEventRe.exec(code);

          if (match) {

            if(isSystemResource) {

              if(systemClientEvents.indexOf(match[1]) == -1)
                systemClientEvents.push(match[1]);

            } else if(systemNetEvents.indexOf(match[1]) == -1) {

              if(oldClientEvents.indexOf(match[1]) == -1)
                oldClientEvents.push(match[1]);
            }

          }

        } while (match);

      }

      for(let i=0; i<oldServerEvents.length; i++) {

        let uid;

        do {
          uid = uuidv4();
        } while (newServerEvents.indexOf(uid) != -1)

        newServerEvents.push(uid);
      }

      for(let i=0; i<oldNetEvents.length; i++) {

        let uid;

        do {
          uid = uuidv4();
        } while (newNetEvents.indexOf(uid) != -1)

        newNetEvents.push(uid);
      }

      for(let i=0; i<oldClientEvents.length; i++) {

        let uid;

        do {
          uid = uuidv4();
        } while (newClientEvents.indexOf(uid) != -1)

        newClientEvents.push(uid);
      }

      for(let i=0; i<oldEsxCallbacks.length; i++) {

        let uid;

        do {
          uid = uuidv4();
        } while (newEsxCallbacks.indexOf(uid) != -1)

        newEsxCallbacks.push(uid);
      }

      for(let i=0; i<systemServerEvents.length; i++) {
        console.log('Skipping server event => ' + systemServerEvents[i]);
        oldServerEvents.push(systemServerEvents[i]);
        newServerEvents.push(systemServerEvents[i]);
      }

      for(let i=0; i<systemNetEvents.length; i++) {
        console.log('Skipping net event => ' + systemServerEvents[i]);
        oldNetEvents.push(systemNetEvents[i]);
        newNetEvents.push(systemNetEvents[i]);
      }

      for(let i=0; i<systemClientEvents.length; i++) {
        console.log('Skipping client event => ' + systemClientEvents[i]);
        oldClientEvents.push(systemClientEvents[i]);
        newClientEvents.push(systemClientEvents[i]);
      }

      for(let i=0; i<serverScripts.length; i++) {

        console.log('  server => [' + i + '/' + (serverScripts.length - 1) + '] ' + serverScripts[i]);

        if(fs.existsSync(serverScripts[i])) {

          const code    = fs.readFileSync(serverScripts[i]).toString();
          let newCode   = code;

          for(let j=0; j<oldServerEvents.length; j++) {
            newCode = newCode.replace(new RegExp('RegisterServerEvent\\(["\']' + oldServerEvents[j] + '["\']\\)', 'g'), 'RegisterServerEvent(\'' + newServerEvents[j] + '\')');
            newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']'     + oldServerEvents[j] + '["\']', 'g'),    'AddEventHandler(\''     + newServerEvents[j] + '\'');
            newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'        + oldServerEvents[j] + '["\']', 'g'),    'TriggerEvent(\''        + newServerEvents[j] + '\'');
          }

          for(let j=0; j<oldNetEvents.length; j++) {
            newCode = newCode.replace(new RegExp('TriggerClientEvent\\(["\']'  + oldNetEvents[j] + '["\']', 'g'), 'TriggerClientEvent(\''  + newNetEvents[j] + '\'');
          }

          for(let j=0; j<oldEsxCallbacks.length; j++) {
            newCode = newCode.replace(new RegExp('ESX.RegisterServerCallback\\(["\']'  + oldEsxCallbacks[j] + '["\']', 'g'), 'ESX.RegisterServerCallback(\''  + newEsxCallbacks[j] + '\'');
          }

          fs.writeFileSync(serverScripts[i], newCode);


        } else if(serverScripts[i].substr(0, 1) != '@') {

          console.log('    ERROR => ' + serverScripts[i] + ' does not exsits');

        }

      }

      for(let i=0; i<clientScripts.length; i++) {

        console.log('  client => [' + i + '/' + (clientScripts.length - 1) + '] ' + clientScripts[i]);

        if(fs.existsSync(clientScripts[i])) {

          const code    = fs.readFileSync(clientScripts[i]).toString();
          let newCode   = code;

          for(let j=0; j<oldServerEvents.length; j++) {
            newCode = newCode.replace(new RegExp('TriggerServerEvent\\(["\']'  + oldServerEvents[j] + '["\']', 'g'), 'TriggerServerEvent(\'' + newServerEvents[j] + '\'');
          }

          for(let j=0; j<oldNetEvents.length; j++) {
            newCode = newCode.replace(new RegExp('RegisterNetEvent\\(["\']'    + oldNetEvents[j] + '["\']\\)', 'g'), 'RegisterNetEvent(\''   + newNetEvents[j] + '\')');
            newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']'     + oldNetEvents[j] + '["\']',    'g'), 'AddEventHandler(\''    + newNetEvents[j] + '\'');
            newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'        + oldNetEvents[j] + '["\']',    'g'), 'TriggerEvent(\''       + newNetEvents[j] + '\'');
          }

          for(let j=0; j<oldClientEvents.length; j++) {
            newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']' + oldClientEvents[j] + '["\']', 'g'), 'AddEventHandler(\'' + newClientEvents[j] + '\'');
            newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'    + oldClientEvents[j] + '["\']', 'g'), 'TriggerEvent(\''    + newClientEvents[j] + '\'');
          }

          for(let j=0; j<oldEsxCallbacks.length; j++) {
            newCode = newCode.replace(new RegExp('ESX.TriggerServerCallback\\(["\']'  + oldEsxCallbacks[j] + '["\']', 'g'), 'ESX.TriggerServerCallback(\''  + newEsxCallbacks[j] + '\'');
          }

          fs.writeFileSync(clientScripts[i], newCode);


        } else if(clientScripts[i].substr(0, 1) != '@') {

          console.log('    ERROR => ' + clientScripts[i] + ' does not exsits');

        }

      }

    });

  });

}

if(fs.existsSync('./scrambled_resources'))
  del('./scrambled_resources').then(main);
else
  main();