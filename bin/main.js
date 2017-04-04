#!/usr/bin/env node
;
var HOST_FILE, OS_NAME, PROMPT, SERVER_FILES, VERSION, _, apacheconf, canWrite, clone, colors, exec, found, fs, getApacheDirectory, inquirer, isRoot, path, platform, q, sys,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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

VERSION = '0.1.5';

HOST_FILE = '/etc/hosts';

OS_NAME = 'linux';

console.log("\n..:: N-other Angular WebApp Creator - [NAWAC] ::..\n".yellow.bold);

console.log(("[+] Welcome on NAWAC v." + VERSION).white.bold);

console.log(("[+] You are using " + platform.os + "\n").white.bold);

getApacheDirectory = function(rootDir) {
  var file, filePath, files, i, len;
  files = fs.readdirSync(rootDir);
  for (i = 0, len = files.length; i < len; i++) {
    file = files[i];
    filePath = rootDir + "/" + file;
    if (fs.statSync(filePath).isDirectory() && file.lastIndexOf('apache', 0) === 0) {
      return file;
    }
  }
  return null;
};

canWrite = function(file_path) {
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

if (!canWrite(HOST_FILE)) {
  console.log("[WARNING] You can NOT modify host file\n".yellow);
}

PROMPT = require('./questions');

SERVER_FILES = require('./server_files');

q = new PROMPT(isRoot(), OS_NAME).questions();

inquirer.prompt(q).then(function(answers) {
  var config, www;
  console.log('\n[+] Webapp summary:'.blue.bold);
  console.log(JSON.stringify(answers, null, 2).blue.bold);
  config = {};
  config.PRODUCTION = false;
  config.APP_NAME = answers.name;
  config.APP_TITLE = answers.title;
  config.APP_DESCRIPTION = answers.description;
  config.APP_KEYWORDS = ["app", "nawac", "easy", "sass", "less", "coffee", "jade"];
  config.APP_URL = answers.url;
  config.BACKEND = answers.backend;
  config.FRONTEND = answers.frontend;
  config.PORT = 8080;
  config.REFRESH_PORT = 8081;
  config.REFRESH_EVT = "refresh";
  config.ERROR_EVT = "err";
  config.APP_BUILD_CLIENT = "./build/client";
  config.APP_BUILD_SERVER = "./build/server";
  config.PATH_CLIENT = "./app/client";
  config.PATH_SERVER = "./app/server";
  config.AUTOPREFIXER = ["last 2 versions", "> 5%", "Firefox ESR"];
  config.INCLUDE_STYLES_PATH = ["./node_modules", "./bower_components", "./app/client"];
  config.SERVER_LIBS = ["ioserver"];
  config.APP_BUNDLE = "main.min.js";
  config.LIBS_BUNDLE = "vendor.min.js";
  config.APP_SCRIPTS = ["vendor.min.js", "main.min.js"];
  config.APP_STYLES = ["main.min.css"];
  if (answers.frontend === "Bootstrap-sass") {
    config.INCLUDE_STYLES_PATH.push("./node_modules/bootstrap-sass/assets/stylesheets/");
  }
  console.log("\n[+] Retrieve webapp skeleton ...".white.bold);
  www = answers.init_dir + "/" + (answers.name.toLowerCase());
  return clone("https://github.com/x42en/webapp-skeleton", www, function(err) {
    var error, error1;
    if (err) {
      throw "Error while cloning webapp-skeleton: " + err;
    }
    try {
      console.log("[+] Clean directory ...".white.bold);
      exec("rm -rf " + www + "/.git");
      exec("rm " + www + "/README.md");
    } catch (error) {
      err = error;
      console.log("[!] Error while cleaning webapp directory:".red);
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
    console.log("\n[+] Retrieve webapp template ...".white.bold);
    return clone("https://github.com/x42en/webapp-simple", www + "/app", function(err) {
      var error2, error3, error4, error5, error6, host_available, host_content, host_enable, node_available, node_content, node_enable, sf;
      if (err) {
        throw "Error while cloning webapp-simple: " + err;
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
      try {
        console.log("[+] Please wait while 'npm install' (this could take a while) ...".white.bold);
        exec("npm install", {
          cwd: www
        });
      } catch (error3) {
        err = error3;
        console.log("[!] Error while running 'npm install':".red);
        console.log(("" + err).red);
        return false;
      }
      sf = new SERVER_FILES(answers, www);
      host_content = sf.get_vhost();
      if (answers.server === 'nginx') {
        host_available = "/etc/nginx/sites-available/" + (answers.name.toLowerCase());
        host_enable = "/etc/nginx/sites-enabled/" + (answers.name.toLowerCase());
        if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
          node_available = "/etc/nginx/sites-available/node." + (answers.name.toLowerCase());
          node_enable = "/etc/nginx/sites-enabled/node." + (answers.name.toLowerCase());
          node_content = sf.get_node();
        }
      } else {
        host_available = "/etc/apache2/sites-available/" + (answers.name.toLowerCase());
        host_enable = "/etc/apache2/sites-enable/" + (answers.name.toLowerCase());
        if (indexOf.call(answers.backend, 'NodeJS') >= 0) {
          node_available = "/etc/apache2/sites-available/node." + (answers.name.toLowerCase());
          node_enable = "/etc/apache2/sites-enable/node." + (answers.name.toLowerCase());
          node_content = sf.get_node();
        }
      }
      if (answers.configure) {
        if (_.includes(platform.os.toString().toLowerCase(), 'linux')) {
          try {
            exec("chgrp -R www-data " + www);
          } catch (error4) {
            err = error4;
            console.log("[!] Error while correct webapp group owner:".red);
            console.log(("" + err).red);
            return false;
          }
          try {
            console.log(("[+] Write " + answers.server + " config file for http://" + answers.url).white.bold);
            fs.writeFile(host_available, host_content, 'utf-8');
          } catch (error5) {
            err = error5;
            console.log("[!] Error while adding vhost file:".red);
            console.log(("" + err).red);
            return false;
          }
          try {
            exec("ln -s " + host_available + " " + host_enable);
            console.log(("[+] Restart " + answers.server + " ...").white.bold);
            exec("service " + answers.server + " restart");
            fs.appendFile('/etc/hosts', "127.0.0.1    " + answers.url + " www." + answers.url + "\n", 'utf-8');
            if (answers.node) {
              fs.appendFile('/etc/hosts', "127.0.0.1    node." + answers.url + "\n", 'utf-8');
            }
          } catch (error6) {
            err = error6;
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
        console.log("\n[+] If you were running this script as root I would have done this:\n".red);
        console.log(("[-] Add in host file (/etc/hosts) " + answers.url + " www." + answers.url + " -> 127.0.0.1").yellow);
        console.log(("[-] Add in host file (/etc/hosts) node." + answers.url + " -> 127.0.0.1").yellow);
        console.log(("[-] Add vhost file for " + answers.url + " in " + host_available + ": ").yellow);
        console.log(("" + host_content).cyan);
        console.log(("[-] Activate it by soft-linking " + host_available + " to " + host_enable).yellow);
        if (answers.node) {
          console.log(("[-] Add vhost file for node." + answers.url + " in " + node_available + ": ").yellow);
          console.log(("" + node_content).cyan);
          console.log(("[-] Activate it by soft-linking " + node_available + " to " + node_enable).yellow);
        }
        console.log(("[-] Restart " + answers.server + " ...\n").yellow);
      }
      console.log("\n[+] Good, everything seems fine !".green);
      console.log(("[+] Go to -> " + www + "\n").green);
      console.log("[+] 1/2 Type 'gulp' to compile and launch server...".green);
      console.log("[+] 2/2 Type 'npm run gulp' if you do not have gulp installed globally...".green);
      console.log(("\n[+] Access your webapp at: http://" + answers.url + "\n").green);
      return console.log("[+] Happy C0d1ng !! ;) \n".rainbow);
    });
  });
});
