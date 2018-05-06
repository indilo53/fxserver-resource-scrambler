const fs      = require('fs');
const glob    = require('glob');
const uuidv4  = require('uuid/v4');
const nodelua = require('node-lua');

class ResourceScrambler {

  constructor() {

    this.addEventHandlerRe           = /AddEventHandler\(["'](.*?)["']/g;
    this.triggerEventRe              = /TriggerEvent\(["'](.*?)["']/g;
    this.registerServerEventRe       = /RegisterServerEvent\(["'](.*?)["']\)/g;
    this.triggerClientEventRe        = /TriggerClientEvent\(["'](.*?)["']/g;
    this.triggerServerEventRe        = /TriggerServerEvent\(["'](.*?)["']/g;
    this.registerNetEventRe          = /RegisterNetEvent\(["'](.*?)["']\)/g;
    this.esxRegisterServerCallbackRe = /ESX\.RegisterServerCallback\(["'](.*?)["']/g;
    this.esxTriggerServerCallbackRe  = /ESX\.TriggerServerCallback\(["'](.*?)["']/g;

    this.systemResources = [

      // FiveM
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

      // Vendor
      'mysql-async',

    ];

    this.systemServerEvents = [];
    this.systemNetEvents    = [];
    this.systemClientEvents = [];

    this.oldServerEvents    = [];
    this.oldNetEvents       = [];
    this.oldClientEvents    = [];
    this.oldEsxCallbacks    = [];
    this.newServerEvents    = [];
    this.newNetEvents       = [];
    this.newClientEvents    = [];
    this.newEsxCallbacks    = [];

    this.serverScripts = [];
    this.clientScripts = [];

    this.directories = [];

  }

  luaObj2Array(obj) {

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

  loadScripts(directory, cb = null) {

    glob(directory + '/**/__resource.lua' , (err, resourceFiles) => {

      for(let i=0; i<resourceFiles.length; i++) {

        const lua          = new nodelua.LuaState();
        const resourceCode = fs.readFileSync(resourceFiles[i]).toString();
        const split        = resourceFiles[i].split('/');

        split.pop();

        const directory    = split.join('/');

        if(this.directories.indexOf(directory) == -1)
          this.directories.push(directory);

      }

      glob(directory + '/**/__resource.lua' , (err, resourceFiles) => {

        for(let i=0; i<resourceFiles.length; i++) {

          const lua          = new nodelua.LuaState();
          const resourceCode = fs.readFileSync(resourceFiles[i]).toString();
          const split        = resourceFiles[i].split('/');

          split.pop();

          const directory    = split.join('/');
          const resourceName = split.pop();

          lua.DoFile('./loader.lua');

          try {

            lua.DoString(resourceCode);

          } catch (e) { console.error('FAILED PARSING ' + resourceFiles[i] + e) }

          lua.GetGlobal('__SCRIPTS');

          const scripts       = lua.ToValue(-1);
          const serverScripts = this.luaObj2Array(scripts.server).map(e => e);
          const clientScripts = this.luaObj2Array(scripts.client).map(e => e);

          for(let j=0; j<serverScripts.length; j++) {

            if(serverScripts[j][0] == '@') {

              const virtualPath   = serverScripts[j].substr(1);
              const split         = virtualPath.split('/');
              const _resourceName = split[0];

              for(let i=0; i<this.directories.length; i++) {

                const split2 = this.directories[i].split('/');

                if(split2[split2.length - 1] == _resourceName) {

                  split.shift();

                  const filePath = split2.join('/') + '/' + split.join('/');

                  if(this.serverScripts.indexOf(filePath) == -1 && fs.existsSync(filePath) && serverScripts[j].substr(-4) == '.lua')
                    this.serverScripts.push(filePath);

                  break;
                }

              }

            } else {

              if(fs.existsSync(directory + '/' + serverScripts[j]) && serverScripts[j].substr(-4) == '.lua')
                this.serverScripts.push(directory + '/' + serverScripts[j]);

            }

          }

          for(let j=0; j<clientScripts.length; j++) {

            if(clientScripts[j][0] == '@') {

              const virtualPath   = clientScripts[j].substr(1);
              const split         = virtualPath.split('/');
              const _resourceName = split[0];

              for(let i=0; i<this.directories.length; i++) {

                const split2 = this.directories[i].split('/');

                if(split2[split2.length - 1] == _resourceName) {

                  split.shift();

                  const filePath = split2.join('/') + '/' + split.join('/');

                  if(this.clientScripts.indexOf(filePath) == -1 && fs.existsSync(filePath) && clientScripts[j].substr(-4) == '.lua')
                    this.clientScripts.push(filePath);

                  break;
                }

              }

            } else {

              if(fs.existsSync(directory + '/' + clientScripts[j]) && clientScripts[j].substr(-4) == '.lua')
                this.clientScripts.push(directory + '/' + clientScripts[j]);

            }

          }

        }

        if(cb != null)
          cb();

      });

    });

  }

  loadSystemServerEvents() {

    for(let i=0; i<this.serverScripts.length; i++) {

      let isSystemResource = false;

      for(let j=0; j<this.systemResources.length; j++) {
        if(this.serverScripts[i].indexOf('/' + this.systemResources[j] + '/') != -1) {
          isSystemResource = true;
          break;
        }
      }

      if(isSystemResource) {

        const code = fs.readFileSync(this.serverScripts[i]).toString();

        let match;

        do {

          match = this.registerServerEventRe.exec(code);

          if(match && this.systemServerEvents.indexOf(match[1]) == -1)
            this.systemServerEvents.push(match[1]);

        } while (match);

        do {

          match = this.addEventHandlerRe.exec(code);

          if(match && this.systemServerEvents.indexOf(match[1]) == -1)
            this.systemServerEvents.push(match[1]);

        } while (match);
        do {

          match = this.triggerEventRe.exec(code);

          if(match && this.systemServerEvents.indexOf(match[1]) == -1)
            this.systemServerEvents.push(match[1]);

        } while (match);

      }

    }

  }

  loadSystemClientEvents() {

    for(let i=0; i<this.clientScripts.length; i++) {

      let isSystemResource = false;

      for(let j=0; j<this.systemResources.length; j++) {
        if(this.clientScripts[i].indexOf('/' + this.systemResources[j] + '/') != -1) {
          isSystemResource = true;
          break;
        }
      }

      if(isSystemResource) {

        const code = fs.readFileSync(this.clientScripts[i]).toString();

        let match;

        do {

          match = this.registerNetEventRe.exec(code);

          if(match && this.systemNetEvents.indexOf(match[1]) == -1)
            this.systemNetEvents.push(match[1]);

        } while (match);

        do {

          match = this.addEventHandlerRe.exec(code);

          if(match && this.systemClientEvents.indexOf(match[1]) == -1)
            this.systemClientEvents.push(match[1]);

        } while (match);

        do {

          match = this.triggerEventRe.exec(code);

          if(match && this.systemClientEvents.indexOf(match[1]) == -1)
            this.systemClientEvents.push(match[1]);

        } while (match);

      }

    }

  }

  loadCustomServerEvents() {

    for(let i=0; i<this.serverScripts.length; i++) {

      let isSystemResource = false;

      for(let j=0; j<this.systemResources.length; j++) {
        if(this.serverScripts[i].indexOf('/' + this.systemResources[j] + '/') != -1) {
          isSystemResource = true;
          break;
        }
      }

      if(!isSystemResource) {

        const code = fs.readFileSync(this.serverScripts[i]).toString();

        let match;

        do {

          match = this.registerServerEventRe.exec(code);

          if(match && this.oldServerEvents.indexOf(match[1]) == -1 && this.systemServerEvents.indexOf(match[1]) == -1)
            this.oldServerEvents.push(match[1]);

        } while (match);

        do {

          match = this.addEventHandlerRe.exec(code);

          if(match && this.oldServerEvents.indexOf(match[1]) == -1 && this.systemServerEvents.indexOf(match[1]) == -1)
            this.oldServerEvents.push(match[1]);

        } while (match);

        do {

          match = this.triggerEventRe.exec(code);

          if(match && this.oldServerEvents.indexOf(match[1]) == -1 && this.systemServerEvents.indexOf(match[1]) == -1)
            this.oldServerEvents.push(match[1]);

        } while (match);

        do {

          match = this.esxRegisterServerCallbackRe.exec(code);

          if(match && this.oldEsxCallbacks.indexOf(match[1]) == -1 && this.systemServerEvents.indexOf(match[1]) == -1)
            this.oldEsxCallbacks.push(match[1]);

        } while (match);

      }

    }

  }


  loadCustomClientEvents() {

    for(let i=0; i<this.clientScripts.length; i++) {

      let isSystemResource = false;

      for(let j=0; j<this.systemResources.length; j++) {
        if(this.clientScripts[i].indexOf('/' + this.systemResources[j] + '/') != -1) {
          isSystemResource = true;
          break;
        }
      }

      if(!isSystemResource) {

        const code = fs.readFileSync(this.clientScripts[i]).toString();

        let match;

        do {

          match = this.registerNetEventRe.exec(code);

          if(match && this.oldNetEvents.indexOf(match[1]) == -1 && this.systemClientEvents.indexOf(match[1]) == -1)
            this.oldNetEvents.push(match[1]);

        } while (match);

        do {

          match = this.addEventHandlerRe.exec(code);

          if(match && this.oldClientEvents.indexOf(match[1]) == -1 && this.systemClientEvents.indexOf(match[1]) == -1)
            this.oldClientEvents.push(match[1]);

        } while (match);

        do {

          match = this.triggerEventRe.exec(code);

          if(match && this.oldClientEvents.indexOf(match[1]) == -1 && this.systemClientEvents.indexOf(match[1]) == -1)
            this.oldClientEvents.push(match[1]);

        } while (match);

        do {

          match = this.esxTriggerServerCallbackRe.exec(code);

          if(match && this.oldEsxCallbacks.indexOf(match[1]) == -1 && this.systemClientEvents.indexOf(match[1]) == -1)
            this.oldEsxCallbacks.push(match[1]);

        } while (match);

      }

    }

  }

  generateRandomMatchingEvents() {

    for(let i=0; i<this.oldServerEvents.length; i++) {

      let uid;

      do {
        uid = uuidv4();
      } while (this.newServerEvents.indexOf(uid) != -1)

      this.newServerEvents.push(uid);
    }

    for(let i=0; i<this.oldNetEvents.length; i++) {

      let uid;

      do {
        uid = uuidv4();
      } while (this.newNetEvents.indexOf(uid) != -1)

      this.newNetEvents.push(uid);
    }


    for(let i=0; i<this.oldClientEvents.length; i++) {

      let uid;

      do {
        uid = uuidv4();
      } while (this.newClientEvents.indexOf(uid) != -1)

      this.newClientEvents.push(uid);
    }

    for(let i=0; i<this.oldEsxCallbacks.length; i++) {

      let uid;

      do {
        uid = uuidv4();
      } while (this.newEsxCallbacks.indexOf(uid) != -1)

      this.newEsxCallbacks.push(uid);
    }

  }

  generateMatchingSystemEvents() {

    for(let i=0; i<this.systemServerEvents.length; i++) {
      this.oldServerEvents.push(this.systemServerEvents[i]);
      this.newServerEvents.push(this.systemServerEvents[i]);
    }

    for(let i=0; i<this.systemNetEvents.length; i++) {
      this.oldNetEvents.push(this.systemNetEvents[i]);
      this.newNetEvents.push(this.systemNetEvents[i]);
    }

    for(let i=0; i<this.systemClientEvents.length; i++) {
      this.oldClientEvents.push(this.systemClientEvents[i]);
      this.newClientEvents.push(this.systemClientEvents[i]);
    }

  }

  writeScripts(cb = null) {

    for(let i=0; i<this.serverScripts.length; i++) {

      if(cb != null)
        cb('server', this.serverScripts[i], i+1, this.serverScripts.length);

      const code  = fs.readFileSync(this.serverScripts[i]).toString();
      let newCode = code;

      for(let j=0; j<this.oldServerEvents.length; j++) {
        newCode = newCode.replace(new RegExp('RegisterServerEvent\\(["\']' + this.oldServerEvents[j] + '["\']\\)', 'g'), 'RegisterServerEvent(\'' + this.newServerEvents[j] + '\')');
        newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']'     + this.oldServerEvents[j] + '["\']', 'g'),    'AddEventHandler(\''     + this.newServerEvents[j] + '\'');
        newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'        + this.oldServerEvents[j] + '["\']', 'g'),    'TriggerEvent(\''        + this.newServerEvents[j] + '\'');
      }

      for(let j=0; j<this.oldNetEvents.length; j++) {
        newCode = newCode.replace(new RegExp('TriggerClientEvent\\(["\']'  + this.oldNetEvents[j] + '["\']', 'g'), 'TriggerClientEvent(\''  + this.newNetEvents[j] + '\'');
      }

      for(let j=0; j<this.oldEsxCallbacks.length; j++) {
        newCode = newCode.replace(new RegExp('ESX.RegisterServerCallback\\(["\']'  + this.oldEsxCallbacks[j] + '["\']', 'g'), 'ESX.RegisterServerCallback(\''  + this.newEsxCallbacks[j] + '\'');
      }

      fs.writeFileSync(this.serverScripts[i], newCode);

    }

      for(let i=0; i<this.clientScripts.length; i++) {

        if(cb != null)
          cb('client', this.clientScripts[i], i+1, this.clientScripts.length);

        const code    = fs.readFileSync(this.clientScripts[i]).toString();
        let newCode   = code;

        for(let j=0; j<this.oldServerEvents.length; j++) {
          newCode = newCode.replace(new RegExp('TriggerServerEvent\\(["\']'  + this.oldServerEvents[j] + '["\']', 'g'), 'TriggerServerEvent(\'' + this.newServerEvents[j] + '\'');
        }

        for(let j=0; j<this.oldNetEvents.length; j++) {
          newCode = newCode.replace(new RegExp('RegisterNetEvent\\(["\']'    + this.oldNetEvents[j] + '["\']\\)', 'g'), 'RegisterNetEvent(\''   + this.newNetEvents[j] + '\')');
          newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']'     + this.oldNetEvents[j] + '["\']',    'g'), 'AddEventHandler(\''    + this.newNetEvents[j] + '\'');
          newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'        + this.oldNetEvents[j] + '["\']',    'g'), 'TriggerEvent(\''       + this.newNetEvents[j] + '\'');
        }

        for(let j=0; j<this.oldClientEvents.length; j++) {
          newCode = newCode.replace(new RegExp('AddEventHandler\\(["\']' + this.oldClientEvents[j] + '["\']', 'g'), 'AddEventHandler(\'' + this.newClientEvents[j] + '\'');
          newCode = newCode.replace(new RegExp('TriggerEvent\\(["\']'    + this.oldClientEvents[j] + '["\']', 'g'), 'TriggerEvent(\''    + this.newClientEvents[j] + '\'');
        }

        for(let j=0; j<this.oldEsxCallbacks.length; j++) {
          newCode = newCode.replace(new RegExp('ESX.TriggerServerCallback\\(["\']'  + this.oldEsxCallbacks[j] + '["\']', 'g'), 'ESX.TriggerServerCallback(\''  + this.newEsxCallbacks[j] + '\'');
        }

        fs.writeFileSync(this.clientScripts[i], newCode);

      }

  }

}

module.exports = ResourceScrambler;
