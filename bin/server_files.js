var SERVER_FILES,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

SERVER_FILES = (function() {
  function SERVER_FILES(answers, www) {
    this.answers = answers;
    this.www = www;
    this.vhost_nginx_header = "server {\n\tlisten 80;\n\n\tserver_name " + this.answers.url + " www." + this.answers.url + ";\n\n\troot " + this.www + "/build/client;\n\tindex index.php;\n\n\tcharset utf-8;\n\n\taccess_log /var/log/nginx/" + (this.answers.name.toLowerCase()) + ".error.log;\n\terror_log /var/log/nginx/" + (this.answers.name.toLowerCase()) + ".access.log;\n\n\tlocation = /favicon.ico { access_log off; log_not_found off; }\n\n\tlocation / {\n\t       try_files $uri $uri/ /index.php?$query_string;\n\t}\n\n\tsendfile off;\n\n\tlocation ~ /\\.ht {\n\t        deny all;\n\t}\n";
    this.vhost_nginx_php = "\tlocation ~ \\.php$ {\n\t        include snippets/fastcgi-php.conf;\n\t        fastcgi_pass unix:/var/run/php5-fpm.sock;\n\t        include fastcgi_params;\n\t}\n";
    this.vhost_nginx_footer = "}\n";
    this.vhost_apache = "<VirtualHost *:80>\n\tDocumentRoot \"" + this.www + "\"\n\tServerName www." + this.answers.url + "\n\tServerAlias " + this.answers.url + "\n\n\t# If an existing asset or directory is requested go to it as it is\n\tRewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -f [OR]\n\tRewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -d\n\tRewriteRule ^ - [L]\n\n\t# Force index file to use .php\n\tDirectoryIndex index.php\n\n\t# If the requested resource doesn't exist, use index.php\n\tRewriteRule ^ /index.php\n\n\t<Directory \"" + this.www + "\"\n\t    Options FollowSymLinks MultiViews\n\t    AllowOverride all\n\t    Require local\n\t</Directory>\n</VirtualHost>\n";
  }

  SERVER_FILES.prototype.get_vhost = function() {
    var VHOST;
    if (this.answers.server === 'apache') {
      VHOST = this.vhost_apache;
    } else {
      VHOST = this.vhost_nginx_header;
      if (indexOf.call(this.answers.backend, 'PHP') >= 0) {
        VHOST += this.vhost_nginx_php;
      }
      VHOST += this.vhost_nginx_footer;
    }
    return VHOST;
  };

  SERVER_FILES.prototype.get_node = function() {
    var NODE_HOST;
    if (this.answers.server === 'nginx') {
      NODE_HOST = "upstream node_server {\n\tserver 127.0.0.1:8000;\n}\n\nserver {\n\tcharset UTF-8;\n\tlisten 80;\n\tserver_name node." + this.answers.url + ";\n\n\tlocation / {\n\t    proxy_http_version 1.1;\n\t    proxy_set_header Upgrade $http_upgrade;\n\t    proxy_set_header Connection \"upgrade\";\n\t    proxy_set_header Host $http_host;\n\t    proxy_set_header X-Real-IP $remote_addr;\n\t    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\t    proxy_set_header X-NginX-Proxy true;\n\t    proxy_pass http://node_server/;\n\t    proxy_ssl_session_reuse off;\n\t    proxy_redirect off;\n\t}\n\n\tlocation ~ /\\. {\n    deny all;\n\t}\n}\n\n";
    } else {
      NODE_HOST = "";
    }
    return NODE_HOST;
  };

  return SERVER_FILES;

})();

module.exports = SERVER_FILES;
