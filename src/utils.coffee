fs    = require 'fs'
path  = require 'path'

module.exports = class Utils
    constructor: ->
        @PATHS = require '../ressources/known_paths.json'

    checkDirectorySync: (directory) ->
        try
            fs.statSync(directory).isDirectory()
        catch err
            return false

        return true
        
    
    getServerPath: (server, os) ->
        for i,p of @PATHS[server][os]
            if @checkDirectorySync p
                return p
        for i,p of @PATHS[server][os]
            if @checkDirectorySync p
                return p
        return null

    getApacheDirectory: (rootDir) ->
        files = fs.readdirSync(rootDir)
        for file of files
            filePath = "#{rootDir}/#{file}"
            if fs.statSync(filePath).isDirectory() and file.lastIndexOf('apache', 0) is 0
                return file
        return null

    canWrite: (file_path) ->
        test_path = path.join file_path, "tmp"
        try
            fs.writeFileSync test_path
            fs.unlinkSync test_path
        catch e
            return false
        return true

    copyFileSync: (srcFile, destFile) ->
        BUF_LENGTH = 64*1024
        buff = new Buffer(BUF_LENGTH)
        fdr = fs.openSync(srcFile, 'r')
        fdw = fs.openSync(destFile, 'w')
        bytesRead = 1
        pos = 0
        while bytesRead > 0
            bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos)
            fs.writeSync(fdw,buff,0,bytesRead)
            pos += bytesRead
        fs.closeSync(fdr)
        fs.closeSync(fdw)