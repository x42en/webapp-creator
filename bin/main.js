#!/usr/bin/env node
;
var CONFIG, DEV_PORT, HOST_FILE, OS_NAME, PROMPT, SERVER_FILES, SITES, UTILS, _, apacheconf, clone, colors, exec, found, fs, inquirer, isRoot, path, platform, q, sys, utils,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

CONFIG = require('../package.json');

SITES = require('../ressources/sites.json');

UTILS = require('./utils');

fs = require("fs");

path = require("path");

colors = require("colors");

apacheconf = require("apacheconf");

isRoot = require("is-root");

inquirer = require("inquirer");

clone = require("git-clone");

platform = require("platform");

sys = require("util");

exec = require("sync-exec");

_ = require("lodash");

HOST_FILE = '/etc/hosts';

OS_NAME = 'linux';

DEV_PORT = 8081;

utils = new UTILS();

console.log("\n..:: N-other Angular WebApp Creator - [NAWAC] ::..\n".yellow.bold);

console.log(("[+] Welcome on NAWAC v" + CONFIG.version).white.bold);

console.log(("[+] You are using " + platform.os + "\n").white.bold);

found = platform.os.toString().toLowerCase();

if (_.includes(found, 'win')) {
  OS_NAME = 'windows';
  HOST_FILE = "C:\\\\Windows\\System32\\drivers\\etc\\hosts";
} else if (_.includes(found, 'mac')) {
  OS_NAME = 'mac';
  HOST_FILE = '/etc/hosts';
} else if (_.includes(found, 'linux')) {
  OS_NAME = 'linux';
  HOST_FILE = '/etc/hosts';
} else {
  console.log("[!] Unable to detect your platform, please open-request with this signature:".red);
  console.log(("-- Plateform: " + platform.os + " --").red);
  console.log(JSON.stringify(platform).red);
  console.log("\n");
  process.exit(1);
}

if (!utils.canWrite(HOST_FILE)) {
  console.log("[WARNING] You will NOT be able to modify host file\n".yellow);
}

PROMPT = require('./questions');

SERVER_FILES = require('./server_files');

q = new PROMPT(isRoot(), OS_NAME, DEV_PORT).questions();

inquirer.prompt(q).then(function(answers) {
  var VHOST_DIR, config, err, error, error1, node, template, www;
  console.log('\n[+] Webapp summary:'.blue.bold);
  console.log(JSON.stringify(answers, null, 2).blue.bold);
  config = {};
  config.PRODUCTION = false;
  config.APP_LANG = "en";
  config.APP_NAME = answers.name;
  config.APP_TITLE = answers.title;
  config.APP_DESCRIPTION = answers.description;
  config.APP_KEYWORDS = ["app", "nawac", "easy", "sass", "less", "coffee", "jade"];
  if (answers.ssl) {
    config.APP_URL = "https://" + answers.url;
  } else {
    config.APP_URL = "http://" + answers.url;
  }
  config.BACKEND = answers.backend;
  config.FRONTEND = answers.frontend;
  config.NODE_PORT = answers.nodeport;
  config.REFRESH_PORT = DEV_PORT;
  config.REFRESH_EVT = "refresh";
  config.ERROR_EVT = "err";
  config.APP_BUILD_CLIENT = "./build/client";
  config.APP_BUILD_SERVER = "./build/server";
  config.PATH_CLIENT = "./app/client";
  config.PATH_SERVER = "./app/server";
  config.AUTOPREFIXER = ["last 2 versions", "> 5%", "Firefox ESR"];
  config.INCLUDE_STYLES_PATH = ["./node_modules", "./bower_components", "./app/client"];
  config.SERVER_LIBS = ["ioserver", "mongo-sync"];
  config.APP_BUNDLE = "main.min.js";
  config.LIBS_BUNDLE = "vendor.min.js";
  config.APP_SCRIPTS = [config.LIBS_BUNDLE, config.APP_BUNDLE];
  config.APP_STYLES = ["main.min.css"];
  switch (answers.frontend) {
    case 'Bootstrap':
      config.INCLUDE_STYLES_PATH.push('./node_modules/bootstrap-sass/assets/stylesheets/');
      break;
    case 'Foundation':
      config.INCLUDE_STYLES_PATH.push('./node_modules/foundation-sites/scss');
  }
  node = {};
  if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
    if (answers.ssl) {
      node.NODE_PORT = 443;
      node.NODE_HOST = "wss://node." + answers.url;
    } else {
      node.NODE_PORT = 80;
      node.NODE_HOST = "ws://node." + answers.url;
    }
    node.DEV_PORT = DEV_PORT;
  }
  VHOST_DIR = utils.getServerPath(answers.server, OS_NAME);
  if (!VHOST_DIR) {
    console.log(("[ERROR] Unable to detect vhost file, check that " + answers.server + " is installed !").red);
    answers.configure = false;
  } else if (!utils.canWrite(VHOST_DIR)) {
    console.log(("[WARNING] You will NOT be able to add server vhost file " + VHOST_DIR).yellow);
    answers.configure = false;
  }
  console.log("\n[+] Build webapp skeleton ...".white.bold);
  www = answers.init_dir + "/" + (answers.name.toLowerCase());
  try {
    console.log("[+] Create project directory ...".white.bold);
    fs.mkdirSync(www);
  } catch (error) {
    err = error;
    console.log("[!] Error while creating project directory:".red);
    console.log(("" + err).red);
    return false;
  }
  try {
    console.log("[+] Store config file ...".white.bold);
    fs.writeFile(www + "/app.config.json", JSON.stringify(config, null, 4), 'utf-8');
  } catch (error1) {
    err = error1;
    console.log("[!] Error while writing config file:".red);
    console.log(("" + err).red);
    return false;
  }
  if (answers.git) {
    template = answers.git;
  } else {
    template = SITES[answers.template].git;
  }
  console.log(("\n[+] Retrieve " + answers.template + " template -> " + template + " ...").white.bold);
  return clone(template, www + "/app", (function(_this) {
    return function(err) {
      var error2, error3, error4, error5, error6, error7, error8, error9, gulpfile, host_available, host_content, host_enable, node_available, node_content, node_enable, npm_package, sf;
      if (err) {
        throw "Error while cloning webapp template: " + err;
      }
      try {
        console.log("[+] Clean app directory ...".white.bold);
        exec("rm -rf " + www + "/app/.git");
        exec("rm " + www + "/app/README.md");
      } catch (error2) {
        err = error2;
        console.log("[!] Error while cleaning webapp directory:".red);
        console.log(("" + err).red);
        return false;
      }
      if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
        try {
          console.log("[+] Store socket config file ...".white.bold);
          fs.writeFileSync(www + "/app/client/angular/services/sockets.json", JSON.stringify(node, null, 4), 'utf-8');
        } catch (error3) {
          err = error3;
          console.log("[!] Error while writing socket config file:".red);
          console.log(("" + err).red);
          return false;
        }
      }
      try {
        console.log("[+] Copy Gulp file ...".white.bold);
        gulpfile = require.resolve('../ressources/Gulpfile.js');
        utils.copyFileSync(gulpfile, www + "/Gulpfile.js");
      } catch (error4) {
        err = error4;
        console.log("[!] Error while copying Gulp file:".red);
        console.log(("" + err).red);
        return false;
      }
      npm_package = {};
      npm_package.name = answers.name;
      npm_package.version = '0.1.0';
      npm_package["private"] = true;
      npm_package.description = answers.description;
      npm_package.main = 'Gulpfile.js';
      npm_package.scripts = {
        "test": "echo \"Error: no test specified\" && exit 1",
        "gulp": "gulp"
      };
      npm_package.keywords = ["webapp", "nawac", "web", "tool", "auto", "client", "full-stack", "server", "js", "coffee", "sass", "scss", "jade", "pug", "html"];
      npm_package.author = "x42en";
      npm_package.license = "GPL-2.0";
      npm_package.devDependencies = {
        "babelify": "^7.3.0",
        "bower-resolve": "^2.2.1",
        "browserify": "^13.1.0",
        "coffeeify": "^2.1.0",
        "del": "^2.2.2",
        "glob": "^7.0.5",
        "gulp": "^3.9.1",
        "gulp-angular-htmlify": "^2.3.0",
        "gulp-autoprefixer": "^3.1.0",
        "gulp-buffer": "0.0.2",
        "gulp-clean": "^0.3.2",
        "gulp-clean-css": "^2.0.12",
        "gulp-coffee": "^2.3.3",
        "gulp-concat": "^2.6.0",
        "gulp-data": "^1.2.1",
        "gulp-develop-server": "^0.5.2",
        "gulp-if": "^2.0.1",
        "gulp-imagemin": "^3.1.1",
        "gulp-less": "^3.1.0",
        "gulp-plumber": "^1.1.0",
        "gulp-pug": "^3.0.3",
        "gulp-rename": "^1.2.2",
        "gulp-replace": "^0.5.4",
        "gulp-sass": "^2.3.2",
        "gulp-sourcemaps": "^1.6.0",
        "gulp-uglify": "^1.5.4",
        "gulp-util": "^3.0.7",
        "gulp-watch": "^4.3.11",
        "lodash": "^4.17.4",
        "merge-stream": "^1.0.0",
        "mkdirp": "^0.5.1",
        "path": "^0.12.7",
        "pretty-error": "^2.0.0",
        "socket.io": "^1.4.8",
        "through2": "^2.0.3",
        "vinyl-buffer": "^1.0.0",
        "vinyl-source-stream": "^1.1.0",
        "vinyl-transform": "^1.0.0",
        "watchify": "^3.7.0"
      };
      npm_package.dependencies = {
        "angular": "^1.6.2",
        "angular-animate": "^1.6.2",
        "angular-dnd-module": "^0.1.24",
        "angular-tooltips": "^1.1.10",
        "angular-touch": "^1.6.2",
        "angular-ui-router": "^0.4.2",
        "ioserver": "^0.2.0",
        "mongo-sync": "^2.0.1",
        "socket.io-client": "^1.4.8"
      };
      try {
        console.log("[+] Write package.json ...".white.bold);
        fs.writeFileSync(www + "/package.json", JSON.stringify(npm_package, null, 4), 'utf-8');
      } catch (error5) {
        err = error5;
        console.log("[!] Error while writing package.json:".red);
        console.log(("" + err).red);
        return false;
      }
      try {
        console.log("[+] Please wait while 'npm install' (this could take a while) ...".white.bold);
      } catch (error6) {
        err = error6;
        console.log("[!] Error while running 'npm install':".red);
        console.log(("" + err).red);
        return false;
      }
      sf = new SERVER_FILES(answers, www);
      host_content = sf.get_vhost();
      host_available = VHOST_DIR + "/sites-available/" + (answers.name.toLowerCase());
      host_enable = VHOST_DIR + "/sites-enabled/" + (answers.name.toLowerCase());
      if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
        node_available = VHOST_DIR + "/sites-available/node." + (answers.name.toLowerCase());
        node_enable = VHOST_DIR + "/sites-enabled/node." + (answers.name.toLowerCase());
        node_content = sf.get_node();
      }
      if (answers.configure) {
        if (_.includes(platform.os.toString().toLowerCase(), 'linux')) {
          try {
            exec("chgrp -R www-data " + www);
          } catch (error7) {
            err = error7;
            console.log("[!] Error while correct webapp group owner:".red);
            console.log(("" + err).red);
            return false;
          }
          try {
            console.log(("[+] Write " + answers.server + " config file for http://" + answers.url).white.bold);
            fs.writeFile(host_available, host_content, 'utf-8');
          } catch (error8) {
            err = error8;
            console.log("[!] Error while adding vhost file:".red);
            console.log(("" + err).red);
            return false;
          }
          try {
            exec("ln -s " + host_available + " " + host_enable);
            console.log(("[+] Restart " + answers.server + " ...").white.bold);
            exec("service " + answers.server + " restart");
            fs.appendFile(HOST_FILE, "127.0.0.1    " + answers.url + " www." + answers.url + "\n", 'utf-8');
            if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
              fs.appendFile(HOST_FILE, "127.0.0.1    node." + answers.url + "\n", 'utf-8');
            }
          } catch (error9) {
            err = error9;
            console.log("[!] Error while modifying hosts file:".red);
            console.log(("" + err).red);
            return false;
          }
        } else if (_.includes(platform.os.toString().toLowerCase(), 'mac')) {
          console.log("[!] Sorry we do not support mac platform yet for auto-configuration ...".yellow);
          return false;
        } else {
          console.log("[!] Sorry we do not support windows platform yet for auto-configuration ...".yellow);
          return false;
        }
      } else if (!isRoot()) {
        console.log("\n[+] If you were running this script as root I would have done these extra-steps:\n".red);
        console.log(("[-] Add in host file (" + HOST_FILE + ") " + answers.url + " www." + answers.url + " -> 127.0.0.1").yellow);
        if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
          console.log(("[-] Add in host file (" + HOST_FILE + ") node." + answers.url + " -> 127.0.0.1").yellow);
        }
        console.log(("\n[-] Add vhost file for " + answers.url + " in " + host_available + ": ").yellow);
        console.log(("" + host_content).cyan);
        console.log(("[-] Activate it by soft-linking " + host_available + " to " + host_enable).yellow);
        if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
          console.log(("\n[-] Add vhost file for node." + answers.url + " in " + node_available + ": ").yellow);
          console.log(("" + node_content).cyan);
          console.log(("[-] Activate it by soft-linking " + node_available + " to " + node_enable).yellow);
        }
        console.log(("[-] Restart " + answers.server + " ...\n").yellow);
      }
      console.log("\n[+] Good, everything seems fine !".green);
      console.log(("[+] Go to -> " + www + "\n").green);
      console.log("[+] 1/2 Type 'gulp' to compile and launch server...".green);
      console.log("[+] 2/2 Type 'npm run gulp' if you do not have gulp installed globaly...".green);
      console.log(("\n[+] Access your webapp at: http://" + answers.url + "\n").green);
      return console.log("[+] Happy C0d1ng !! ;) \n".rainbow);
    };
  })(this));
});
