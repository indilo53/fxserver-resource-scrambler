# fxserver-resource-scrambler
Replaces all your registered server and client events with random generated ones, to prevent script-kiddies from triggering sensitive events using lua injectors.
The best advice in general is to never trust the client and make appropriate changes to your resources

## Usage
1. Do **NOT** forget to backup all your resources before using this script
2. Download the latest application executable and its source code from [releases](https://github.com/indilo53/fxserver-resource-scrambler/releases/latest)
3. Extract the source code and copy the executable to the same directory
4. Place all your resources in the `resources` directory
5. Run the executable and let it do its work.
6. Put back the generated; modified resources inside `scrambled-resources` back in your server resources directory, and enjoy!

I don't know if it will work for everyone, this is just an experiment. Please report issues you're having, and provide helpful information so that I can debug this - providing a copy of the script that is breaking the application is also helpful.

Source is ugly as hell, I will do a clean rewrite when I will have more time

index-win was built using [pkg](https://github.com/zeit/pkg), if you feel bad running a .exe just do an npm install (It will probably fail with node-lua, if so do it in a cygwin or git bash shell) and run ```node .```.
