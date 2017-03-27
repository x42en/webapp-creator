`#!/usr/bin/env node
`

# Compile file using:
# coffee -o bin/ -w --bare --no-header -c main.coffee questions.coffee server_files.coffee

fs         = require "fs"
path       = require "path"
colors     = require "colors"
apacheconf = require "apacheconf"
isRoot     = require "is-root"
inquirer   = require "inquirer"
clone      = require "git-clone"
platform   = require "platform"
sys        = require "util"
exec       = require "sync-exec"
_          = require "lodash"

VERSION    = '0.1.4'

console.log "\n..:: N-other Angular WebApp Creator - [NAWAC] ::..\n".yellow.bold

console.log "[+] Welcome on NAWAC v.#{VERSION}".white.bold
console.log "[+] You are using #{platform.os}\n".white.bold

if isRoot()
    console.log "[+] You are root, Good!\n".green
else
    console.log "[-] Your are NOT root...".red.bold
    console.log "[-] I won't be able to modify server and hosts files.\n".red.bold

getApacheDirectory = (rootDir) ->
    files = fs.readdirSync(rootDir)
    for file in files
        filePath = "#{rootDir}/#{file}"
        stat = fs.statSync(filePath)
        if stat.isDirectory() and file.lastIndexOf('apache', 0) is 0
            return file
    return null
    
# WINDOWS CHECKER
if _.includes(platform.os.toString().toLowerCase(), 'win')
    # Check if WAMP / EASYPHP / APACHE / NGINX is installed

    # Get 32 or 64bit version
    wamp = if fs.existsSync('C:\\\\wamp\\') then "wamp" else "wamp64"

    if fs.existsSync "C:\\\\#{wamp}\\bin\\apache\\"
        # Get wamp apache version
        apache = getApacheDirectory "C:\\\\#{wamp}\\bin\\apache\\"
        if apache
            console.log "[+] You are using #{apache}".green
        else
            console.log "[!] Unable to detect your web server version sorry...".yellow
    
        #Retrieve document Root from WAMP config
        apacheconf "C:\\\\#{wamp}\\bin\\apache\\#{apache}\\conf\\httpd.conf", (err, config, parser) ->
            if err
                throw err

            return false

    DEFAULT_WWW = 'C:\\\\wamp\\www'

# MAC OS X CHECKER
else if _.includes(platform.os.toString().toLowerCase(), 'mac')
    # Check if WAMP / EASYPHP / APACHE / NGINX is installed

    if fs.existsSync '/etc/apache2/httpd.conf'
        #Retrieve document Root from MAMP config
        apacheconf '/etc/apache2/httpd.conf', (err, config, parser) ->
            if err
                throw err

            return false

        DEFAULT_WWW = '/Applications/MAMP/htdocs'

# LINUX CHECKER
else
    DEFAULT_WWW = '/var/www'

PROMPT       = require './questions'
SERVER_FILES = require './server_files'

q  = new PROMPT(isRoot(), DEFAULT_WWW).questions()

inquirer
    .prompt(q)
    .then( (answers) ->
        console.log '\n[+] Webapp summary:'.blue.bold
        console.log JSON.stringify(answers, null, 2).blue.bold

        config = {}
        config.APP_NAME            = answers.name
        config.APP_TITLE           = answers.title
        config.APP_DESCRIPTION     = answers.description
        config.APP_KEYWORDS        = ["app","nawac","easy","sass","less","coffee","jade"]
        config.APP_URL             = answers.url
        config.PORT                = 8080
        config.REFRESH_PORT        = 8081
        config.BACKEND             = answers.backend
        config.FRONTEND            = answers.frontend
        config.REFRESH_EVT         = "refresh"
        config.ERROR_EVT           = "err"
        config.APP_BUILD_CLIENT    = "./build/client"
        config.APP_BUILD_SERVER    = "./build/server"
        config.PATH_CLIENT         = "./app/client"
        config.PATH_SERVER         = "./app/server"
        config.AUTOPREFIXER        = ["last 2 versions", "> 5%", "Firefox ESR"]
        config.INCLUDE_STYLES_PATH = ["./node_modules", "./bower_components", "./app/client"]
        config.SERVER_LIBS         = ["ioserver"]
        config.APP_BUNDLE          = "main.min.js"
        config.LIBS_BUNDLE         = "vendor.min.js"
        config.APP_SCRIPTS         = ["vendor.min.js", "main.min.js"]
        config.APP_STYLES          = ["main.min.css"]

        # Adapt sass path in order to @import 'bootstrap'
        if answers.frontend is "Bootstrap-sass"
            config.INCLUDE_STYLES_PATH.push "./node_modules/bootstrap-sass/assets/stylesheets/"

        # Retrieve website skeleton
        console.log "\n[+] Retrieve webapp skeleton ...".white.bold
        www = "#{answers.init_dir}/#{answers.name.toLowerCase()}"

        clone "https://github.com/x42en/webapp-skeleton", www,
            (err) ->
                if err
                    throw "Error while cloning webapp-skeleton: #{err}"
                try
                    # Remove .git and README
                    console.log "[+] Clean directory ...".white.bold
                    exec "rm -rf #{www}/.git"
                    exec "rm #{www}/README.md"
                catch err
                    console.log "[!] Error while cleaning webapp directory:".red
                    console.log "#{err}".red
                    return false

                try  
                    # Build app.config.json
                    console.log "[+] Store config file ...".white.bold
                    fs.writeFile "#{www}/app.config.json", JSON.stringify(config, null, 4) , 'utf-8'
                catch err
                    console.log "[!] Error while writing config file:".red
                    console.log "#{err}".red
                    return false

                # Clone template choosen
                console.log "\n[+] Retrieve webapp template ...".white.bold
                clone "https://github.com/x42en/webapp-simple", "#{www}/app",
                    (err) ->
                        if err
                            throw "Error while cloning webapp-simple: #{err}"
                        try
                            # Remove .git and README
                            console.log "[+] Clean app directory ...".white.bold
                            exec "rm -rf #{www}/app/.git"
                            exec "rm #{www}/app/README.md"
                        catch err
                            console.log "[!] Error while cleaning webapp directory:".red
                            console.log "#{err}".red
                            return false

                        try
                            # Exec npm install
                            console.log "[+] Please wait while 'npm install' (this could take a while) ...".white.bold
                            exec("npm install",{cwd: www})
                        catch err
                            console.log "[!] Error while running 'npm install':".red
                            console.log "#{err}".red
                            return false

                        sf = new SERVER_FILES answers, www
                        # Check server
                        host_content = sf.get_vhost()
                        if answers.server is 'nginx'
                            host_available = "/etc/nginx/sites-available/#{answers.name.toLowerCase()}"
                            host_enable    = "/etc/nginx/sites-enabled/#{answers.name.toLowerCase()}"
                            
                            if 'NodeJS' in answers.backend
                                node_available = "/etc/nginx/sites-available/node.#{answers.name.toLowerCase()}"
                                node_enable    = "/etc/nginx/sites-enabled/node.#{answers.name.toLowerCase()}"
                                node_content   = sf.get_node()

                        else
                            host_available = "/etc/apache2/sites-available/#{answers.name.toLowerCase()}"
                            host_enable    = "/etc/apache2/sites-enable/#{answers.name.toLowerCase()}"

                            if  'NodeJS' in answers.backend
                                node_available = "/etc/apache2/sites-available/node.#{answers.name.toLowerCase()}"
                                node_enable    = "/etc/apache2/sites-enable/node.#{answers.name.toLowerCase()}"
                                node_content   = sf.get_node()
                            

                        # If user ask for auto-configuration (then is root)
                        if answers.configure
                            # CHeck plateform
                            if _.includes(platform.os.toString().toLowerCase(), 'linux')
                                try
                                    # Modify website owner
                                    exec "chgrp -R www-data #{www}"
                                catch err
                                    console.log "[!] Error while correct webapp group owner:".red
                                    console.log "#{err}".red
                                    return false

                                try
                                    # Write server vhost file
                                    console.log "[+] Write #{answers.server} config file for http://#{answers.url}".white.bold
                                    fs.writeFile host_available, host_content, 'utf-8'
                                catch err  
                                    console.log "[!] Error while adding vhost file:".red
                                    console.log "#{err}".red
                                    return false

                                try
                                    exec "ln -s #{host_available} #{host_enable}"
                                    # Restart server
                                    console.log "[+] Restart #{answers.server} ...".white.bold
                                    exec "service #{answers.server} restart"

                                    # Add host entry for url
                                    fs.appendFile '/etc/hosts', "127.0.0.1    #{answers.url} www.#{answers.url}\n", 'utf-8'
                                    # If server is required
                                    if answers.node
                                        # Add node entry
                                        fs.appendFile '/etc/hosts', "127.0.0.1    node.#{answers.url}\n", 'utf-8'
                                catch err
                                    console.log "[!] Error while modifying hosts file:".red
                                    console.log "#{err}".red
                                    return false
                            
                            else if _.includes(platform.os.toString().toLowerCase(), 'mac')
                                # Catch mac errors
                                console.log "[!] Sorry we do not support mac platform yet for auto-configuration ...".yellow
                                return false
                            else
                                # Catch windows errors
                                console.log "[!] Sorry we do not support windows platform yet for auto-configuration ...".yellow
                                return false
                        # If user is not root
                        else if !isRoot()
                            console.log "\n[+] If you were running this script as root I would have done this:\n".red
                            console.log "[-] Add in host file (/etc/hosts) #{answers.url} www.#{answers.url} -> 127.0.0.1".yellow
                            console.log "[-] Add in host file (/etc/hosts) node.#{answers.url} -> 127.0.0.1".yellow
                            console.log "[-] Add vhost file for #{answers.url} in #{host_available}: ".yellow
                            console.log "#{host_content}".cyan
                            console.log "[-] Activate it by soft-linking #{host_available} to #{host_enable}".yellow
                            
                            if answers.node
                                console.log "[-] Add vhost file for node.#{answers.url} in #{node_available}: ".yellow
                                console.log "#{node_content}".cyan
                                console.log "[-] Activate it by soft-linking #{node_available} to #{node_enable}".yellow
                            
                            console.log "[-] Restart #{answers.server} ...\n".yellow

                        # Final thoughts
                        console.log "\n[+] Good, everything seems fine !".green
                        console.log "[+] Go to -> #{www}\n".green
                        console.log "[+] 1/2 Type 'gulp' to compile and launch server...".green
                        console.log "[+] 2/2 Type 'npm run gulp' if you do not have gulp installed globally...".green
                        # Show url to user
                        console.log "\n[+] Access your webapp at: http://#{answers.url}\n".green

                        console.log "[+] Happy C0d1ng !! ;) \n".rainbow
                    
    )