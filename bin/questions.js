var Prompt, SITES, UTILS, fs, path,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

fs = require('fs');

path = require('path');

SITES = require('../ressources/sites.json');

UTILS = require('./utils');

Prompt = (function() {
  function Prompt(isRoot, OS_NAME, DEV_PORT) {
    this.isRoot = isRoot;
    this.OS_NAME = OS_NAME;
    this.DEV_PORT = DEV_PORT;
    this.DEFAULT_WWW = '/var/www';
    this.utils = new UTILS();
  }

  Prompt.prototype.questions = function() {
    return [
      {
        type: 'confirm',
        name: 'configure',
        message: 'Do you want to auto-configure your webserver ?',
        "default": true,
        when: (function(_this) {
          return function(answers) {
            return _this.isRoot;
          };
        })(this)
      }, {
        type: 'list',
        name: 'server',
        message: 'What is your web server ?',
        choices: ['Nginx', 'Apache'],
        "default": 'Nginx',
        filter: function(val) {
          return val.toLowerCase();
        }
      }, {
        type: 'input',
        name: 'init_dir',
        message: 'Where are located your websites ?',
        "default": "" + this.DEFAULT_WWW,
        validate: (function(_this) {
          return function(name) {
            if ((name.lastIndexOf('/') === -1) || name.length < 3) {
              return 'Server path seems invalid.';
            }
            if (!_this.utils.checkDirectorySync(name)) {
              return 'This is not a directory, or it does not exists.';
            }
            if (!_this.utils.canWrite(name)) {
              return 'Sorry, this directory is not writeable.';
            }
            _this.init_dir = name;
            return true;
          };
        })(this)
      }, {
        type: 'list',
        name: 'template',
        message: 'What is your project template ?',
        choices: SITES.NAME,
        "default": 'Simple-chat'
      }, {
        type: 'list',
        name: 'license',
        message: 'What is your project license ?',
        choices: ['UNLICENSED', 'GPL-2.0', 'Apache-2.0', 'MIT', 'ISC'],
        "default": 'UNLICENSED'
      }, {
        type: 'input',
        name: 'git',
        message: 'Enter the https github repository to use :',
        validate: function(name) {
          if (name.substring(0, 8) !== 'https://') {
            return 'This does not appear to be a valid repository.';
          }
          return true;
        },
        when: function(answers) {
          return answers.template === 'Custom';
        }
      }, {
        type: 'checkbox',
        name: 'backend',
        message: 'Select server engine needed',
        choices: ['None', 'NodeJS', 'PHP'],
        "default": ['NodeJS', 'PHP']
      }, {
        type: 'confirm',
        name: 'ssl',
        message: 'Will you use ssl ?',
        "default": false
      }, {
        type: 'list',
        name: 'frontend',
        message: 'Select your frontend framework',
        choices: ['None', 'Bootstrap', 'Foundation'],
        "default": 'None'
      }, {
        type: 'input',
        name: 'nodeport',
        message: 'Select a port for local node process',
        "default": 8082,
        when: function(answers) {
          return indexOf.call(answers.backend, 'NodeJS') >= 0;
        },
        validate: (function(_this) {
          return function(port) {
            if (typeof port !== 'number') {
              return 'Your port must be a number.';
            }
            if (port < 1024 || port > 65535) {
              return 'Your port must be between 1024 and 65535.';
            }
            if (port === _this.DEV_PORT) {
              return 'Sorry this port is reserved for gulp process.';
            }
            return true;
          };
        })(this)
      }, {
        type: 'input',
        name: 'name',
        message: 'What is your project name ?',
        validate: (function(_this) {
          return function(name) {
            if (name.length < 3) {
              return 'Your app name must be longer than 3 characters.';
            }
            if (_this.utils.checkDirectorySync(_this.init_dir + "/" + name)) {
              return 'Sorry this project already exists.';
            }
            return true;
          };
        })(this)
      }, {
        type: 'input',
        name: 'title',
        message: 'Set your webapp title :',
        validate: function(title) {
          if (title.length < 3) {
            return 'Your app title must be longer than 3 characters.';
          }
          return true;
        }
      }, {
        type: 'input',
        name: 'description',
        message: 'Set your webapp description :'
      }, {
        type: 'input',
        name: 'url',
        message: 'What is the domain name you will use to access webapp ?',
        validate: function(url) {
          if (url.match(/^(?=.{1,254}$)((?=[a-z0-9-]{1,63}\.)(xn--+)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,63}$/i)) {
            return true;
          }
          return 'Your url appears to be invalid';
        }
      }
    ];
  };

  return Prompt;

})();

module.exports = Prompt;
