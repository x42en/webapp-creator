class Prompt
    constructor: (@isRoot,@DEFAULT_WWW) ->
    questions: () ->
        [
            {
                type: 'confirm'
                name: 'configure'
                message: 'Do you want us to auto-configure your webserver ?'
                default: true
                when: (answers) =>
                    return @isRoot
            },
            {
                type: 'list'
                name: 'server'
                message: 'What is your web server ?'
                choices: ['Nginx', 'Apache']
                filter: (val) ->
                    val.toLowerCase()
            },
            {
                type: 'input'
                name: 'init_dir'
                message: 'Where are located your websites ?'
                default: @DEFAULT_WWW
                validate: (name) ->
                    if name.length < 3
                        return 'Your app name must be longer than 3 characters.'
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