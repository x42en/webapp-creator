var Utils, fs, path;

fs = require('fs');

path = require('path');

module.exports = Utils = (function() {
  function Utils() {
    this.PATHS = require('../ressources/known_paths.json');
  }

  Utils.prototype.checkDirectorySync = function(directory) {
    var err, error;
    try {
      fs.statSync(directory).isDirectory();
    } catch (error) {
      err = error;
      return false;
    }
    return true;
  };

  Utils.prototype.getServerPath = function(server, os) {
    var i, p, ref, ref1;
    ref = this.PATHS[server][os];
    for (i in ref) {
      p = ref[i];
      if (this.checkDirectorySync(p)) {
        return p;
      }
    }
    ref1 = this.PATHS[server][os];
    for (i in ref1) {
      p = ref1[i];
      if (this.checkDirectorySync(p)) {
        return p;
      }
    }
    return null;
  };

  Utils.prototype.getApacheDirectory = function(rootDir) {
    var file, filePath, files;
    files = fs.readdirSync(rootDir);
    for (file in files) {
      filePath = rootDir + "/" + file;
      if (fs.statSync(filePath).isDirectory() && file.lastIndexOf('apache', 0) === 0) {
        return file;
      }
    }
    return null;
  };

  Utils.prototype.canWrite = function(file_path) {
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

  Utils.prototype.copyFileSync = function(srcFile, destFile) {
    var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
    BUF_LENGTH = 64 * 1024;
    buff = new Buffer(BUF_LENGTH);
    fdr = fs.openSync(srcFile, 'r');
    fdw = fs.openSync(destFile, 'w');
    bytesRead = 1;
    pos = 0;
    while (bytesRead > 0) {
      bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
      fs.writeSync(fdw, buff, 0, bytesRead);
      pos += bytesRead;
    }
    fs.closeSync(fdr);
    return fs.closeSync(fdw);
  };

  return Utils;

})();
