var Prompt, fs, path;

fs = require('fs');

path = require('path');

Prompt = (function() {
  function Prompt(isRoot, OS_NAME) {
    this.isRoot = isRoot;
    this.OS_NAME = OS_NAME;
    this.DEFAULT_WWW = '/var/www';
    this.PATHS = require('../known_paths.json');
  }

  Prompt.prototype.canWrite = function(file_path) {
    var e, error, test_path;
    test_path = path.join(file_path, "tmp");
    try {
      fs.writeFileSync(test_path);
      fs.unlinkSync(test_path);
    } catch (error) {
      e = error;
      return false;
    }
    return true;
  };

  Prompt.prototype.questions = function() {
    return [
      {
        type: 'confirm',
        name: 'configure',
        message: 'Do you want us to auto-configure your webserver ?',
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
            if (!fs.statSync(name).isDirectory()) {
              return 'This is not a directory, or it does not exists.';
            }
            if (!_this.canWrite(name)) {
              return 'Sorry, this directory is not writeable.';
            }
            return true;
          };
        })(this)
      }, {
        type: 'list',
        name: 'site',
        message: 'What is your project template ?',
        choices: ['Simple', 'Custom'],
        filter: function(val) {
          return val.toLowerCase();
        }
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
          return answers.site === 'custom';
        }
      }, {
        type: 'checkbox',
        name: 'backend',
        message: 'Select server engine needed',
        choices: ['None', 'NodeJS', 'PHP'],
        "default": ['NodeJS', 'PHP']
      }, {
        type: 'list',
        name: 'frontend',
        message: 'Select your frontend framework',
        choices: ['None', 'Bootstrap-sass', 'Bootstrap (v3)', 'Foundation', 'Semantic-ui'],
        "default": 'None'
      }, {
        type: 'input',
        name: 'name',
        message: 'What is your project name ?',
        validate: function(name) {
          if (name.length < 3) {
            return 'Your app name must be longer than 3 characters.';
          }
          return true;
        }
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
