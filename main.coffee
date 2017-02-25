fs         = require "fs"
apacheconf = require "apacheconf"
isRoot     = require "is-root"
inquirer   = require "inquirer"
nodegit    = require "nodegit"
platform   = require "platform"
sys        = require "util"
exec       = require "sync-exec"
_          = require "lodash"

VERSION  = '0.1.0'

console.log "\n..:: Angular WebApp Creator - [AWAC] ::..\n"

console.log "[+] Welcome on AWAC v.#{VERSION}"
console.log "[+] You are using #{platform.os}\n"

getDirectories = (srcpath) ->
    return fs.readdirSync(srcpath).filter(file => fs.statSync(path.join(srcpath, file)).isDirectory())

if _.includes(platform.os.toString().toLowerCase(), 'win')
    # Get 32 or 64bit version
    wamp = if fs.existsSync('C:\\\\wamp\\') then "wamp" else "wamp64"

    # Get wamp apache version
    items = getDirectories "C:\\\\#{wamp}\\bin\\apache\\"
    for apache in items
        if apache.lastIndexOf('apache', 0) is 0
            console.log "[+] You are using #{apache}"
            break

    #Retrieve document Root from WAMP config
    apacheconf "C:\\\\#{wamp}\\bin\\apache\\#{apache}\\conf\\httpd.conf", (err, config, parser) ->
        if err
            throw err

        console.log config
        return false

    DEFAULT_WWW = 'C:/wamp/www'
else if _.includes(platform.os.toString().toLowerCase(), 'mac')
    #Retrieve document Root from MAMP config
    apacheconf '/etc/apache2/httpd.conf', (err, config, parser) ->
        if err
            throw err

        console.log config
        return false

    DEFAULT_WWW = 'C:/wamp/www'
    DEFAULT_WWW = '/Applications/MAMP/htdocs'
else
    DEFAULT_WWW = '/var/www'

questions = [
    {
        type: 'list'
        name: 'configure'
        message: 'Do you want us to auto-configure your webserver ?'
        choices: ['Yes', 'No']
        default: 'Yes'
        filter: (val) ->
            val = if val is 'Yes' then true else false
        when: (answers) ->
            return isRoot()
    },
    {
        type: 'list'
        name: 'server'
        message: 'What is your web server ?'
        choices: ['Nginx', 'Apache']
        filter: (val) ->
            val.toLowerCase()
        when: (answers) ->
            return answers.configure
    },
    {
        type: 'input'
        name: 'init_dir'
        message: 'Where are located your websites ?'
        default: DEFAULT_WWW
        validate: (name) ->
            if name.length < 3
                return 'Your app name must be longer than 3 characters.'
            return true
    },
    {
        type: 'input'
        name: 'name'
        message: 'What is your project name ?'
        validate: (name) ->
            if name.length < 3
                return 'Your app name must be longer than 3 characters.'
            return true
    },
    {
        type: 'input'
        name: 'title'
        message: 'Set your webapp title :'
        validate: (title) ->
            if title.length < 3
                return 'Your app title must be longer than 3 characters.'
            return true
    },
    {
        type: 'input'
        name: 'description'
        message: 'Set your webapp description :'
    },
    {
        type: 'input'
        name: 'url'
        message: 'What is the domain name you will use to access webapp ?'
        validate: (url) ->
            if url.match(/^(?=.{1,254}$)((?=[a-z0-9-]{1,63}\.)(xn--+)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,63}$/i)
                return true
            return 'Your url appears to be invalid'
    }
]

inquirer
    .prompt(questions)
    .then( (answers) ->
        console.log '\n[+] Webapp summary:'
        console.log JSON.stringify(answers, null, 2)

        config = {}
        config.APP_NAME            = answers.name
        config.APP_TITLE           = answers.title
        config.DESCRIPTION         = answers.desc
        config.KEYWORDS            = ["app","easy","sass","less","coffee","jade"]
        config.PORT                = 8080
        config.REFRESH_PORT        = 8081
        config.ERROR_EVT           = "err"
        config.APP_BUILD_CLIENT    = "./build/client"
        config.APP_BUILD_SERVER    = "./build/server"
        config.PATH_CLIENT         = "./app/client"
        config.PATH_SERVER         = "./app/server"
        config.AUTOPREFIXER        = [ "last 2 versions", "> 5%", "Firefox ESR" ]
        config.INCLUDE_STYLES_PATH = ["./node_modules", "./bower_components", "./app/client"]
        config.SERVER_LIBS         = ["ioserver"]
        config.APP_BUNDLE          = "main.min.js"
        config.LIBS_BUNDLE         = "vendor.min.js"
        config.APP_SCRIPTS         = ["vendor.min.js", "main.min.js"]
        config.APP_STYLES          = ["main.min.css"]

        # Retrieve website skeleton
        console.log "\n[+] Retrieve webapp skeleton ..."
        www = "#{answers.init_dir}/#{answers.name.toLowerCase()}"

        nodegit.Clone("https://github.com/x42en/website-skeleton.git", www, {})
            .then( (repo) ->
                
                try
                    # Remove .git and README
                    console.log "[+] Clean directory ..."
                    exec "rm -rf #{www}/.git"
                    exec "rm #{www}/README.md"
                catch err
                    console.log "[!] Error while cleaning webapp directory:"
                    console.log err
                    return false

                try  
                    # Build app.config.json
                    console.log "[+] Store config file ..."
                    fs.writeFile "#{www}/app.config.json", JSON.stringify(config, null, 4) , 'utf-8'
                catch err
                    console.log "[!] Error while writing config file:"
                    console.log err
                    return false

                try
                    # Exec npm install
                    console.log "[+] Please wait while 'npm install' ..."
                    exec("npm install",{cwd: www})
                catch err
                    console.log "[!] Error while running 'npm install':"
                    console.log err
                    return false

                # If user ask for auto-configuration
                if answers.configure
                    # CHeck plateform
                    if _.includes(platform.os.toString().toLowerCase(), 'linux')
                        try
                            # Modify website owner
                            exec "chgrp -R www-data #{www}"
                        catch err
                            console.log "[!] Error while correct webapp group owner:"
                            console.log err
                            return false
                        
                        # Check server
                        if answers.server is 'nginx'
                            host_available = "/etc/nginx/sites-available/#{answers.name.toLowerCase()}"
                            host_enable    = "/etc/nginx/sites-enabled/#{answers.name.toLowerCase()}"
                            host_content   = """server {
       \tlisten 80;

       \tserver_name #{answers.url} www.#{answers.url};

       \troot #{www}/build/client;
       \tindex index.php;

       \tcharset utf-8;

       \taccess_log /var/log/nginx/#{answers.name.toLowerCase()}.error.log;
       \terror_log /var/log/nginx/#{answers.name.toLowerCase()}.access.log;

       \tlocation = /favicon.ico { access_log off; log_not_found off; }

       \tlocation / {
               try_files $uri $uri/ /index.php?$query_string;
       \t}

       \tsendfile off;

       \tlocation ~ \.php$ {
                include snippets/fastcgi-php.conf;
                fastcgi_pass unix:/var/run/php5-fpm.sock;
                include fastcgi_params;
        \t}

        \tlocation ~ /\.ht {
                deny all;
        \t}
}\n"""
                        else
                            host_available = "/etc/apache2/sites-available/#{answers.name.toLowerCase()}"
                            host_enable    = "/etc/apache2/sites-enable/#{answers.name.toLowerCase()}"
                            host_content   = """<VirtualHost *:80>
    \tDocumentRoot "#{www}"
    \tServerName #{url}
    \tServerAlias www.#{url}
    \t<Directory "#{www}"
        Options Indexes FollowSymLinks MultiViews
        AllowOverride all
        Require local
    \t</Directory>
</VirtualHost>\n"""

                        try
                            # Write server vhost file
                            console.log "[+] Write #{answers.server} config file for http://#{answers.url}"
                            fs.writeFile host_available, host_content, 'utf-8'
                        catch err  
                            console.log "[!] Error while adding vhost file:"
                            console.log err
                            return false

                        try
                            exec "ln -s #{host_available} #{host_enable}"
                            # Restart server
                            console.log "[+] Restart #{answers.server} ..."
                            exec "service #{answers.server} restart"

                            # Add host entry for url
                            fs.appendFile '/etc/hosts', "127.0.0.1    #{answers.url} www.#{answers.url}\n", 'utf-8'
                        catch err
                            console.log "[!] Error while modifying hosts file:"
                            console.log err
                            return false
                    
                    else if _.includes(platform.os.toString().toLowerCase(), 'mac')
                        # Catch mac errors
                        console.log "[!] Sorry we do not support mac platform yet for auto-configuration ..."
                        return false
                    else
                        # Catch windows errors
                        console.log "[!] Sorry we do not support windows platform yet for auto-configuration ..."
                        return false

                # Final thoughts
                console.log "\n[+] Go to -> #{www}"
                console.log "[+] Type 'gulp' to compile and launch server..."
                # Show url to user
                console.log "[+] Access your webapp using: http://#{answers.url}\n"

                console.log "[+] Happy C0d1ng !! ;) \n"
                
                
            )
            .catch( (err) ->
                console.log "[!] Error while cloning git repo: #{err}"
            )
    )