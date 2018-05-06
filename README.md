# fxserver-resource-scrambler
FXServer Resource Scrambler

## Replace all your Registered server and client events with random ones

Before all make a backup of your resources somewhere

```
1 - Place all your resources in resources folder of this script
2 - Run index-win.exe
3 - Put all your modified resources (inside scrambled-resources folder) in your server resources folder
4 - Done !
```

I don't know if it will work for everyone, this is just an experiment

### This is a step to prevent script-kiddies from triggering sensitive events using lua injector
### Best advice here is to never trust the client and make appropriate changes to your resources

Source is ugly as hell, I will do a clean rewrite when I will have more time

index-win was built using https://github.com/zeit/pkg, if you feel bad running a .exe just do an npm install (It will probably fail with node-lua, if so do it in a cygwin or git bash shell) and run ```node .```.
