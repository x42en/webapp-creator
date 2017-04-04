fs   = require 'fs'
path = require 'path'

class Prompt
    constructor: (@isRoot, @OS_NAME) ->
        @DEFAULT_WWW = '/var/www'
        @PATHS = require '../known_paths.json'
    canWrite: (file_path) ->
        test_path = path.join file_path, "tmp"
        try
            fs.writeFileSync test_path
            fs.unlinkSync test_path
        catch e
            return false
        return true
    questions: () ->
        [
            {
                type: 'confirm'
                name: 'configure'
                message: 'Do you want us to auto-configure your webserver ?'
                default: true
                when: (answers) => @isRoot
            },
            {
                type: 'list'
                name: 'server'
                message: 'What is your web server ?'
                choices: ['Nginx', 'Apache']
                filter: (val) -> val.toLowerCase()
                    # console.log "Checking #{server}"
                    # exit(1)
                    # for p of @PATHS[server][@OS_NAME]
                    #     console.log "Checking #{p}"
                    #     if fs.existsSync(p)
                    #         @DEFAULT_WWW = p
                    #         unless canWrite @DEFAULT_WWW
                    #             console.log "[WARNING] You can NOT modify #{server} directory\n".yellow
                    #         else
                    #             console.log "[+] Found #{server} on #{@DEFAULT_WWW}\n".green
                    #         return val.toLowerCase()
                    # return 'Sorry, it does not seems to be installed'
            },
            {
                type: 'input'
                name: 'init_dir'
                message: 'Where are located your websites ?'
                default: "#{@DEFAULT_WWW}"
                validate: (name) =>
                    if (name.lastIndexOf('/') is -1) or name.length < 3
                        return 'Server path seems invalid.'
                    unless fs.statSync(name).isDirectory()
                        return 'This is not a directory, or it does not exists.'
                    unless @canWrite name
                        return 'Sorry, this directory is not writeable.'
                    return true
            },
            {
                type: 'list'
                name: 'site'
                message: 'What is your project template ?'
                choices: ['Simple', 'Custom']
                filter: (val) ->
                    val.toLowerCase()
            },
            {
                type: 'input'
                name: 'git'
                message: 'Enter the https github repository to use :'
                validate: (name) ->
                    if name.substring(0,8) isnt 'https://'
                        return 'This does not appear to be a valid repository.'
                    return true
                when: (answers) ->
                    return (answers.site is 'custom')
            },
            {
                type: 'checkbox'
                name: 'backend'
                message: 'Select server engine needed'
                choices: ['None', 'NodeJS', 'PHP']
                default: ['NodeJS', 'PHP']
            },
            {
                type: 'list'
                name: 'frontend'
                message: 'Select your frontend framework'
                choices: ['None', 'Bootstrap-sass', 'Bootstrap (v3)', 'Foundation', 'Semantic-ui']
                default: 'None'
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

module.exports = Prompt