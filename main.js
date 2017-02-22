// Generated by CoffeeScript 1.10.0
(function() {
  var DEFAULT_WWW, VERSION, _, exec, fs, inquirer, isRoot, nodegit, platform, questions, sys;

  fs = require("fs");

  isRoot = require("is-root");

  inquirer = require("inquirer");

  nodegit = require("nodegit");

  platform = require("platform");

  sys = require("util");

  exec = require("sync-exec");

  _ = require("lodash");

  VERSION = '0.1.0';

  console.log("\n..:: Angular WebApp Creator - [AWAC] ::..\n");

  console.log("[+] Welcome on AWAC v." + VERSION);

  console.log("[+] You are using " + platform.os + "\n");

  if (_.includes(platform.os.toString().toLowerCase(), 'windows')) {
    DEFAULT_WWW = 'C:/wamp/www';
  } else if (_.includes(platform.os.toString().toLowerCase(), 'mac')) {
    DEFAULT_WWW = '/Applications/MAMP/htdocs';
  } else {
    DEFAULT_WWW = '/var/www';
  }

  questions = [
    {
      type: 'list',
      name: 'configure',
      message: 'Do you want us to auto-configure your webserver ?',
      choices: ['Yes', 'No'],
      "default": 'Yes',
      filter: function(val) {
        return val = val === 'Yes' ? true : false;
      },
      when: function(answers) {
        return isRoot();
      }
    }, {
      type: 'list',
      name: 'server',
      message: 'What is your web server ?',
      choices: ['Nginx', 'Apache'],
      filter: function(val) {
        return val.toLowerCase();
      },
      when: function(answers) {
        return answers.configure;
      }
    }, {
      type: 'input',
      name: 'init_dir',
      message: 'Where are located your websites ?',
      "default": DEFAULT_WWW,
      validate: function(name) {
        if (name.length < 3) {
          return 'Your app name must be longer than 3 characters.';
        }
        return true;
      }
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

  inquirer.prompt(questions).then(function(answers) {
    var config, www;
    console.log('\n[+] Webapp summary:');
    console.log(JSON.stringify(answers, null, '  '));
    config = {};
    config.APP_NAME = answers.name;
    config.APP_TITLE = answers.title;
    config.DESCRIPTION = answers.desc;
    config.KEYWORDS = ["app", "easy", "sass", "less", "coffee", "jade"];
    config.PORT = 8080;
    config.REFRESH_PORT = 8081;
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
    console.log("\n[+] Retrieve webapp skeleton ...");
    www = answers.init_dir + "/" + (answers.name.toLowerCase());
    return nodegit.Clone("https://github.com/x42en/website-skeleton.git", www, {}).then(function(repo) {
      var err, error1, error2, error3, host_available, host_content, host_enable, puts;
      puts = function(error, stdout, stderr) {
        return sys.puts(stdout);
      };
      console.log("[+] Clean directory ...");
      exec("rm -rf " + www + "/.git");
      exec("rm " + www + "/README.md");
      try {
        console.log("[+] Store config file ...");
        fs.writeFile(www + "/app.config.json", JSON.stringify(config, null, 4), 'utf-8');
      } catch (error1) {
        err = error1;
        console.log("[!] Error while writing config file:");
        console.log(err);
        return false;
      }
      console.log("[+] Please wait while 'npm install' ...");
      if (answers.configure) {
        if (_.includes(platform.os.toString().toLowerCase(), 'linux')) {
          if (answers.server === 'nginx') {
            host_available = "/etc/nginx/sites-available/" + (answers.name.toLowerCase());
            host_enable = "/etc/nginx/sites-enabled/" + (answers.name.toLowerCase());
            host_content = "server {\n\tlisten 80;\n\n\tserver_name " + answers.url + " www." + answers.url + ";\n\n\troot " + www + "/build/client;\n\tindex index.php;\n\n\tcharset utf-8;\n\n\taccess_log /var/log/nginx/" + (answers.name.toLowerCase()) + ".error.log;\n\terror_log /var/log/nginx/" + (answers.name.toLowerCase()) + ".access.log;\n\n\tlocation = /favicon.ico { access_log off; log_not_found off; }\n\n\tlocation / {\n        try_files $uri $uri/ /index.php?$query_string;\n\t}\n\n\tsendfile off;\n\n\tlocation ~ \.php$ {\n         include snippets/fastcgi-php.conf;\n         fastcgi_pass unix:/var/run/php5-fpm.sock;\n         include fastcgi_params;\n \t}\n\n \tlocation ~ /\.ht {\n         deny all;\n \t}\n}";
          } else {
            host_available = "/etc/apache2/sites-available/" + (answers.name.toLowerCase());
            host_enable = "/etc/apache2/sites-enable/" + (answers.name.toLowerCase());
            host_content = "";
          }
          try {
            console.log("[+] Write " + answers.server + " config file for http://" + answers.url);
            fs.writeFile(host_available, host_content, 'utf-8');
          } catch (error2) {
            err = error2;
            console.log("[!] Error while adding vhost file:");
            console.log(err);
            return false;
          }
          exec("ln -s " + host_available + " " + host_enable);
          exec("chgrp -R www-data " + www);
          try {
            console.log("[+] Restart " + answers.server + " ...");
            exec("service " + answers.server + " restart");
            fs.appendFile('/etc/hosts', "127.0.0.1    " + answers.url + " www." + answers.url, 'utf-8');
          } catch (error3) {
            err = error3;
            console.log("[!] Error while modifying hosts file:");
            console.log(err);
            return false;
          }
        } else {
          console.log("[!] Sorry we do not support your plateform yet for auto-configuration ...");
          return false;
        }
      }
      console.log("\n[+] Go to -> " + www);
      console.log("[+] Execute 'gulp' to compile and launch server...");
      console.log("[+] Access your webapp using: http://" + answers.url + "\n");
      return console.log("[+] Happy C0d1ng !! ;) \n");
    })["catch"](function(err) {
      return console.log("[!] Error while cloning git repo: " + err);
    });
  });

}).call(this);
