const cpr               = require('cpr');
const ResourceScrambler = require('./resourcescrambler.js');

const scrambler = new ResourceScrambler();

console.log('Cloning resources');

cpr('./resources', './scrambled_resources', {
  deleteFirst : true,
  overwrite   : true,
  confirm     : true,
}, (err, files) => {

  if(err)
    throw err;

  console.log('Loading scripts');

  scrambler.loadScripts('./scrambled_resources', () => {

    console.log('Loading events');

    scrambler.loadSystemServerEvents();
    scrambler.loadSystemClientEvents();
    scrambler.loadCustomServerEvents();
    scrambler.loadCustomClientEvents();

    console.log('Generating new events');

    scrambler.generateRandomMatchingEvents();
    scrambler.generateMatchingSystemEvents();

    console.log('Writing scrambled resources');

    scrambler.writeScripts((type, file, i, total) => {
      console.log(type + ' => [' + i + '/' + total + '] ' + file);
    });

  });

});
