fs    = require 'fs'
path  = require 'path'
SITES = require '../ressources/sites.json'
UTILS = require './utils'

class Prompt
    constructor: (@isRoot, @OS_NAME, @DEV_PORT) ->
        @DEFAULT_WWW = '/var/www'
        @utils = new UTILS()

    questions: () ->
        [
            {
                type: 'confirm'
                name: 'configure'
                message: 'Do you want to auto-configure your webserver ?'
                default: true
                when: (answers) => @isRoot
            },
            {
                type: 'list'
                name: 'server'
                message: 'What is your web server ?'
                choices: ['Nginx', 'Apache']
                default: 'Nginx'
                filter: (val) -> val.toLowerCase()
            },
            {
                type: 'input'
                name: 'init_dir'
                message: 'Where are located your websites ?'
                default: "#{@DEFAULT_WWW}"
                validate: (@init_dir) =>
                    if (init_dir.lastIndexOf('/') is -1) or init_dir.length < 3
                        return 'Server path seems invalid.'
                    unless @utils.checkDirectorySync init_dir
                        return 'This is not a directory, or it does not exists.'
                    unless @utils.canWrite init_dir
                        return 'Sorry, this directory is not writeable.'
                    return true
            },
            {
                type: 'list'
                name: 'template'
                message: 'What is your project template ?'
                choices: SITES.NAME
                default: 'Simple-chat'
            },
            {
                type: 'input'
                name: 'author'
                message: 'Set your project author :'
                default: 'undefined'
                validate: (author) ->
                    if author.length < 2
                        return 'Your project author must be longer than 2 characters.'
                    return true
            },
            {
                type: 'list'
                name: 'license'
                message: 'Set your project license :'
                choices: ['UNLICENSED','GPL-2.0','Apache-2.0','MIT','ISC']
                default: 'UNLICENSED'
            },
            {
                type: 'input'
                name: 'git'
                message: 'Enter the https github repository to use :'
                validate: (name) ->
                    if name.substring(0,8) isnt 'https://'
                        return 'This does not appear to be a valid repository.'
                    return true
                when: (answers) -> (answers.template is 'Custom')
            },
            {
                type: 'checkbox'
                name: 'backend'
                message: 'Select server engine needed'
                choices: ['None', 'NodeJS', 'PHP']
                default: ['NodeJS', 'PHP']
            },
            {
                type: 'confirm'
                name: 'ssl'
                message: 'Will you use ssl ?'
                default: false
            },
            {
                type: 'list'
                name: 'frontend'
                message: 'Select your frontend framework'
                choices: ['None', 'Bootstrap', 'Foundation']
                # choices: ['None', 'Bootstrap', 'Foundation', 'Semantic-ui']
                # For Bootstrap -> npm install --save bootstrap-sass (https://www.npmjs.com/package/bootstrap-sass)
                # For Foundation -> npm install --save foundation-sites (http://foundation.zurb.com/sites/docs/sass.html)
                # For Semantic -> 
                default: 'None'
            },
            {
                type: 'input'
                name: 'nodeport'
                message: 'Select a port for local node process'
                default: 8082
                when: (answers) -> ('NodeJS' in answers.backend)
                validate: (port) =>
                    unless typeof port is 'number'
                        return 'Your port must be a number.'
                    if port < 1024 or port > 65535
                        return 'Your port must be between 1024 and 65535.'
                    if port is @DEV_PORT
                        return 'Sorry this port is reserved for gulp process.'
                    return true
            },
            {
                type: 'input'
                name: 'name'
                message: 'What is your project name ?'
                validate: (name) =>
                    if name.length < 3
                        return 'Your app name must be longer than 3 characters.'
                    if @utils.checkDirectorySync "#{@init_dir}/#{name}"
                        return 'Sorry this project already exists.'
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