# fxserver-resource-scrambler
Replaces all your registered server and client events with random generated ones, to prevent script-kiddies from triggering sensitive events using lua injectors.
The best advice in general is to never trust the client and make appropriate changes to your resources

## Usage
1. Do **NOT** forget to backup all your resources before using this script
2. Download the latest zip and extract it [releases](https://github.com/indilo53/fxserver-resource-scrambler/releases/latest)
3. Place all your resources in the `resources` directory
4. Run the executable and let it do its work.
5. Put back the generated; modified resources inside `scrambled-resources` back in your server resources directory, and enjoy!

I don't know if it will work for everyone, this is just an experiment. Please report issues you're having, and provide helpful information so that I can debug this - providing a copy of the script that is breaking the application is also helpful.

index-win was built using [pkg](https://github.com/zeit/pkg), if you feel bad running a .exe just do an npm install and run ```node .```.

---

Event tables can be found in scrambled-resources/scrambler-events.json

You can listen for the event **scrambler:injectionDetected** server-side to catch malicious users (don't forget to start scrambler-vac in server.cfg).

```lua
AddEventHandler('scrambler:injectionDetected', function(name, source, isServerEvent)

  local eventType = 'client'
  
  if isServerEvent then
    eventType = 'server'
  end

  print('Player id [' .. source .. '] attempted to use ' .. eventType .. ' event [' .. name .. ']')
 
end)
```

---

**You need to keep a copy of the original source code, when you make any change to the source : re-scramble all your original resources at once**

**Do not forget to include fivem base resources and mysql-async if you use it**
