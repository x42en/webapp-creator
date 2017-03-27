class SERVER_FILES
    constructor: (@answers, @www) ->
        @vhost_nginx_header = """server {
        \tlisten 80;

        \tserver_name #{@answers.url} www.#{@answers.url};

        \troot #{@www}/build/client;
        \tindex index.php;

        \tcharset utf-8;

        \taccess_log /var/log/nginx/#{@answers.name.toLowerCase()}.error.log;
        \terror_log /var/log/nginx/#{@answers.name.toLowerCase()}.access.log;

        \tlocation = /favicon.ico { access_log off; log_not_found off; }

        \tlocation / {
        \t       try_files $uri $uri/ /index.php?$query_string;
        \t}

        \tsendfile off;

        \tlocation ~ /\\.ht {
        \t        deny all;
        \t}\n"""

        @vhost_nginx_php = """\tlocation ~ \\.php$ {
        \t        include snippets/fastcgi-php.conf;
        \t        fastcgi_pass unix:/var/run/php5-fpm.sock;
        \t        include fastcgi_params;
        \t}\n"""

        @vhost_nginx_footer = "}\n"

        @vhost_apache = """<VirtualHost *:80>
        \tDocumentRoot "#{@www}"
        \tServerName www.#{@answers.url}
        \tServerAlias #{@answers.url}

        \t# If an existing asset or directory is requested go to it as it is
        \tRewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -f [OR]
        \tRewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -d
        \tRewriteRule ^ - [L]

        \t# Force index file to use .php
        \tDirectoryIndex index.php

        \t# If the requested resource doesn't exist, use index.php
        \tRewriteRule ^ /index.php

        \t<Directory "#{@www}"
        \t    Options FollowSymLinks MultiViews
        \t    AllowOverride all
        \t    Require local
        \t</Directory>
</VirtualHost>\n"""

    get_vhost: () ->
        if @answers.server is 'apache'
            VHOST = @vhost_apache
        else
            VHOST = @vhost_nginx_header
            if 'PHP' in @answers.backend
                VHOST += @vhost_nginx_php
            VHOST += @vhost_nginx_footer

        return VHOST

    get_node: () ->
        if @answers.server is 'nginx'
            NODE_HOST = """upstream node_server {
    \tserver 127.0.0.1:8000;
}

server {
    \tcharset UTF-8;
    \tlisten 80;
    \tserver_name node.#{@answers.url};

    \tlocation / {
    \t    proxy_http_version 1.1;
    \t    proxy_set_header Upgrade $http_upgrade;
    \t    proxy_set_header Connection "upgrade";
    \t    proxy_set_header Host $http_host;
    \t    proxy_set_header X-Real-IP $remote_addr;
    \t    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    \t    proxy_set_header X-NginX-Proxy true;
    \t    proxy_pass http://node_server/;
    \t    proxy_ssl_session_reuse off;
    \t    proxy_redirect off;
    \t}

    \tlocation ~ /\\. {
        deny all;
    \t}
}
\n"""
        else
            NODE_HOST = ""

        return NODE_HOST

module.exports = SERVER_FILES