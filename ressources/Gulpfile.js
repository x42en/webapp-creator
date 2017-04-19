// Receip based on fork of:
// https://github.com/sogko/gulp-recipes/tree/master/browserify-separating-app-and-vendor-bundles
// https://coderwall.com/p/8iwmxq/efficient-express-coffee-script-jade-sass-gulp-watch-w-livereload
// ... and a personnal touch of love <3


// Load project config
const CONFIG_FILE = './app.config.json';
const CONFIG      = require(CONFIG_FILE);


// Load dependencies
const gulp     = require('gulp')
, fs           = require('fs')
, path         = require('path')
, mkdirp       = require('mkdirp')
, gutil        = require('gulp-util')
, del          = require('del')
, server       = require('gulp-develop-server')
, sass         = require('gulp-sass')
, less         = require('gulp-less')
, jade         = require('gulp-pug')
, coffee       = require('gulp-coffee')
, uglify       = require('gulp-uglify')
, autoprefixer = require('gulp-autoprefixer')
, cleanCSS     = require('gulp-clean-css')
, clean        = require('gulp-clean')
, rename       = require('gulp-rename')
, replace      = require('gulp-replace')
, sourcemaps   = require('gulp-sourcemaps')
, concat       = require('gulp-concat')
, data         = require('gulp-data')
, imagemin     = require('gulp-imagemin')
, htmlify      = require('gulp-angular-htmlify')
, gulpif       = require('gulp-if')
, plumber      = require('gulp-plumber')
, watch        = require('gulp-watch')
, transform    = require('vinyl-transform')
, source       = require('vinyl-source-stream')
, buffer       = require('vinyl-buffer')
, bowerResolve = require('bower-resolve')
, merge        = require('merge-stream')
, browserify   = require('browserify')
, watchify     = require('watchify')
, glob         = require('glob')
, pe           = require('pretty-error').start()
, io           = require('socket.io')(CONFIG.REFRESH_PORT)
, _            = require('lodash')

, log          = gutil.log
, bold         = gutil.colors.bold
, magenta      = gutil.colors.magenta
, green        = gutil.colors.green
, red          = gutil.colors.red
, blue         = gutil.colors.cyan
, yellow       = gutil.colors.yellow
;

var FIRSTIME   = true
, ON_ERROR     = true
, globs        = {}
, files        = []
, production   = (process.env.NODE_ENV === 'production' || CONFIG.PRODUCTION)
;

// production = true;

// Configure local vars
globs.images      = [path.join(CONFIG.PATH_CLIENT, "assets/**/*.{png,jpg,jpeg,gif,svg}")]
globs.php         = [path.join(CONFIG.PATH_CLIENT, "class/**/*.{php,php3,php5}")]
globs.assets      = [path.join(CONFIG.PATH_CLIENT, "**/*.*"), '!' + path.join(CONFIG.PATH_CLIENT, "**/*.{png,jpg,jpeg,gif,svg,php,php3,php5,css,scss,sass,less,styl,stylus,coffee,js,html,pug,jade}")]

globs.styles      = [path.join(CONFIG.PATH_CLIENT, "**/*.{css,less,sass,scss,styl}")]
globs.sass        = [path.join(CONFIG.PATH_CLIENT, "**/*.{sass,scss}"), '!' + path.join(CONFIG.PATH_CLIENT, "**/_*.{sass,scss}")]
globs.less        = [path.join(CONFIG.PATH_CLIENT, "**/*.less"), '!' + path.join(CONFIG.PATH_CLIENT, "**/_*.less")]
globs.stylus      = [path.join(CONFIG.PATH_CLIENT, "**/*.{styl,stylus}"), '!' + path.join(CONFIG.PATH_CLIENT, "**/_*.{styl,stylus}")]
globs.css         = [path.join(CONFIG.PATH_CLIENT, "**/*.css")]

globs.scripts     = [path.join(CONFIG.PATH_CLIENT, "main.{coffee,js,ejs}")]
globs.js          = [path.join(CONFIG.PATH_CLIENT, "**/*.js")]
globs.coffee      = [path.join(CONFIG.PATH_CLIENT, "**/*.coffee")]

globs.jade_index  = [path.join(CONFIG.PATH_CLIENT, "index.{html,jade,pug}")]
globs.jade_client = [path.join(CONFIG.PATH_CLIENT, "**/_*.{html,jade,pug}")]

globs.server      = [path.join(CONFIG.PATH_SERVER, "**/*.coffee")]
globs.server_data = [path.join(CONFIG.PATH_SERVER, "**/*.*"), '!' + path.join(CONFIG.PATH_SERVER, "**/*.{coffee,js}")]

// Pretty Error customisation (see https://github.com/AriaMinaei/pretty-error)
pe.appendStyle({
   'pretty-error > header > title > kind': {
      display: 'none'
   },
   'pretty-error > header > colon': {
      display: 'none'
   },
   'pretty-error > header > message': {
      color: 'bright-white',
      background: 'red',
      padding: '0 1' // top/bottom left/right 
   },
   'pretty-error > trace > item': {
      marginLeft: 2,
      bullet: '"<white>o</white>"'
   },
   'pretty-error > trace > item > header > pointer > file': {
      color: 'bright-cyan'
   },
   'pretty-error > trace > item > header > pointer > colon': {
      color: 'red'
   },
   'pretty-error > trace > item > header > pointer > line': {
      color: 'bright-green'
   },
   'pretty-error > trace > item > header > what': {
      color: 'bright-white'
   },
   'pretty-error > trace > item > footer > addr': {
      display: 'none'
   }
});

// Set specific error handler
errorHandler = function(err) {
  ON_ERROR = true
  var output = pe.render(err);
  console.log(output);

  // Send error message back to browser
  io.emit(CONFIG.ERROR_EVT, 'Error occured, check console...');
  
  // Necessary to handle correctly browserify events
  this.emit('end');
}

// Force browser refresh
refreshBrowser = function() {
  if (!ON_ERROR && !FIRSTIME){
    io.emit(CONFIG.REFRESH_EVT, true);
  }
  else{
    if(!FIRSTIME) {
      // Reset flag when job is done...
      ON_ERROR = false;
    }else{
      io.emit('warning','Please wait gulp starting...')
    }
  }
}


// Helper function(s)
var requireExternals = function(bundler, externals) {
  var external, i, len, results;
  results = [];
  for (i = 0, len = externals.length; i < len; i++) {
    external = externals[i];
    if (external.expose != null) {
      results.push(bundler.require(external.require, {
        expose: external.expose
      }));
    } else {
      results.push(bundler.require(external.require));
    }
  }
  return results;
};

var getBowerPackageIds = function () {
  var bowerManifest = {};
  try {
    bowerManifest = require('./bower.json');
  } catch (e) {
    // does not have a bower.json manifest
  }
  return _.keys(bowerManifest.dependencies) || [];
}

var getNPMPackageIds = function () {
  var packageManifest = {};
  try {
    packageManifest = require('./package.json');
  } catch (e) {
    // does not have a package.json manifest
  }
  return _.keys(packageManifest.dependencies) || [];
}

var getLibs = function () {
  var libs = getNPMPackageIds().concat([], getBowerPackageIds());
  // Remove server libs from bundle
  client_libs = _.difference(libs,CONFIG.SERVER_LIBS);
  return client_libs;
}


///////////////////    START CLIENT PROCESS   ///////////////////////

// so you can run `gulp bundler` to build the libs only
gulp.task('bundler', ['bundle:libs'], function() {
  console.log(green('#[+] Libs bundled...'));
})

createController = function(options, cb) {
  var controllers_file = path.join(CONFIG.PATH_CLIENT,'angular/app.controllers.coffee')
  console.log(magenta('[+] Create controller ' + options.name));
  gulp.src([controllers_file])
    .pipe(replace('# <%End controllers%>',"require '../" + options.name.toLowerCase() + '/' + options.name.toLowerCase() + "'\n# <%End controllers%>"))
    .pipe(gulp.dest(path.join(CONFIG.PATH_CLIENT,'angular/')));

  // Create simple controller
  var controller_content = "class " + options.controller + "\n";
  controller_content += "    constructor: (_) ->\n";
  controller_content += "        console.log '[+] " + options.name + " controller loaded'\n\n";
  controller_content += "angular.module('webapp').controller '" + options.controller + "', " + options.controller + "\n";
  
  return mkdirp(path.join(CONFIG.PATH_CLIENT, options.name.toLowerCase()), function(err){
    if(err) console.log ('[!] Error while creating ' + options.name.toLowerCase() + ' directory...');
    else fs.writeFile(path.join(CONFIG.PATH_CLIENT, options.name.toLowerCase() + '/' + options.name.toLowerCase() + ".coffee"), controller_content, function(err){
      if(err) io.emit(CONFIG.ERROR_EVT, err);
      else io.emit('success', 'Controller', options.name);
      if(_.isFunction(cb)) cb();
    });
  })
}
createTemplate = function(options, cb) {
  console.log(magenta('[+] Create template ' + options.name));
  // First create files
  var template_content = ".container." + options.name + "\n    .row\n        .col-12\n            h1 " + options.name + " template";
  var style_content = '.' + options.name + " {\n    h1 { color: $red; }\n}";
  return mkdirp(path.join(CONFIG.PATH_CLIENT, options.name.toLowerCase()), function(err){
    if(err) console.log ('[!] Error while creating ' + options.name.toLowerCase() + ' directory...');
    else{
      fs.writeFile(path.join(CONFIG.PATH_CLIENT, options.name.toLowerCase() + '/_' + options.name.toLowerCase() + ".pug"), template_content, function(err){
        if(err) io.emit(CONFIG.ERROR_EVT, err);
        else {
          io.emit('success', 'Template',options.name);
          fs.writeFile(path.join(CONFIG.PATH_CLIENT, options.name.toLowerCase() + '/_' + options.name.toLowerCase() + ".scss"), style_content, function(err){
            if(err) io.emit(CONFIG.ERROR_EVT, err);
            else{
              // Then insert file in stylesheets
              gulp.src([path.join(CONFIG.PATH_CLIENT,'main.sass')])
                .pipe(replace('// <%End Import stylesheet%>',"@import '" + options.name.toLowerCase() + "/" + options.name.toLowerCase() + "'\n// <%End Import stylesheet%>"))
                .pipe(gulp.dest(CONFIG.PATH_CLIENT));
              io.emit('success', 'Template', options.name);
            }
          });
        }
        if(_.isFunction(cb)) cb();
      }); 
    }
  })
}
createComponent = function(options, cb) {
  console.log(magenta('[+] Create component ' + options.name));
  // First create dir and template
  return createTemplate(options, function(){
    if(options.controller){
      // Add a controller
      createController(options, function() {
        io.emit('success', 'Component', options.name);
        if(_.isFunction(cb)) cb();
      });
    }
    // If no controller is necessary
    else{
      io.emit('success', 'Component', options.name);
    } 
  });
}
createPage = function(options) {
  console.log(magenta('[+] Create page ' + options.name));
  // First create component
  return createComponent(options, function () {
    // Then add route to it
    var routes_file = path.join(CONFIG.PATH_CLIENT,'angular/app.routes.coffee');
    var state_content = ".state '" + options.name.toLowerCase() + "',\n";
    if (options.slug){
      state_content += "            url: '" + options.slug.toLowerCase() + "'\n";
    }
    state_content += "            data: { requireLogin: " + options.authentified + " }\n";
    state_content += "            views:\n";
    // Add a default view to this state...
    state_content += "                '':\n";
    
    state_content += "                    templateUrl: 'pages/_" + options.name.toLowerCase() + ".php'\n";
    if (options.controller){
      state_content += "                    controller: '" + options.controller + "'\n";
      state_content += "                    controllerAs: '" + options.alias + "'\n";
    }
    state_content += "                # <%End " + options.name.toLowerCase() + " views%>\n\n"
    state_content += "        # <%End routes%>";

    gulp.src([routes_file])
      .pipe(replace('# <%End routes%>',state_content))
      .pipe(gulp.dest(path.join(CONFIG.PATH_CLIENT,'angular/')));
    io.emit('success', 'Page', options.name);
  });
}
createView = function(options) {
  console.log(magenta('[+] Create view ' + options.name));
  // First create component
  return createComponent(options, function () {
    // Then add view to router
    var routes_file = path.join(CONFIG.PATH_CLIENT,'angular/app.routes.coffee');
    var view_content = "'" + options.name.toLowerCase() + "@" + options.state.toLowerCase() + "':\n";
    view_content += "                    templateUrl: 'pages/_" + options.name.toLowerCase() + ".php'\n";
    if (options.controller){
      view_content += "                    controller: '" + options.controller + "'\n";
      view_content += "                    controllerAs: '" + options.alias + "'\n";
    }
    view_content += "                # <%End " + options.state.toLowerCase() + " views%>";
    
    gulp.src([routes_file])
      .pipe(replace('# <%End ' + options.state.toLowerCase() + ' views%>',view_content))
      .pipe(gulp.dest(path.join(CONFIG.PATH_CLIENT,'angular/')));
    io.emit('success', 'View', options.name);
  })
}

createServerClass = function(options, cb){
  var class_content = "module.exports = class " + options.name + "\n";
  class_content += "    constructor: () ->\n";
  class_content += "        console.log \"" + options.name + " service loaded !\"\n";

  return fs.writeFile(path.join(CONFIG.PATH_SERVER, options.name + ".coffee"), class_content, function(err){
    if(err) io.emit(CONFIG.ERROR_EVT, err);
    else io.emit('success', 'Class', options.name);
    if(_.isFunction(cb)) cb();
  })
}

createService = function(options) {
  console.log(blue('[+] Create service ' + options.name));
  return createServerClass(options, function () {
    var server_file = path.join(CONFIG.PATH_SERVER,'server.coffee');
    var service_content = "app.addService\n";
    service_content += "    name: '" + options.alias + "'\n";
    service_content += "    service: " + options.name + "\n\n";
    service_content += "# <%End services%>";

    gulp.src([server_file])
      .pipe(replace('# <%End services%>',service_content))
      .pipe(gulp.dest(CONFIG.PATH_SERVER));
    io.emit('success', 'Service', options.name);
  })
}

getInfos = function() {
  var content = fs.readFileSync(path.join(CONFIG.PATH_CLIENT,'angular/app.routes.coffee'), 'utf8');
  
  var infos = {};
  infos.states = [];
  infos.controllers = [];
  infos.views = {};

  // Find all states
  var re = /\.state '([^\']*)',(?:\s)/g;
  while (match = re.exec(content)) {
    infos.states.push(match[1]);
  }

  // Find all controllers
  re = /controller\: '([^\']*)'(?:\s)/g;
  while (match = re.exec(content)) {
    infos.controllers.push(match[1]);
  }

  // Find all views of states
  infos.states.forEach(function(entry){
    var regex = "'([^']*)\\@"+entry+"'\\:(?:\\s)";
    re = new RegExp(regex,"g");
    infos.views[entry] = [];
    while (match = re.exec(content)) {
      infos.views[entry].push(match[1]);
    }
  });
  return infos;
}

// Handle element creation from webpage... neat ;)
io.sockets.on('connection', function(socket) {
  
  if (FIRSTIME){
    // Wait until all tasks are finished
    if(!ON_ERROR){
      FIRSTIME = false;
      console.log(green('[+] Client connected to dev server on port ' + CONFIG.REFRESH_PORT));
    }
  }else{
    console.log(blue('[+] Client refreshed ...'));
  }

  socket.on('controller', createController);
  socket.on('component', createComponent);
  socket.on('template', createTemplate);
  socket.on('page', createPage);
  socket.on('view', createView);
  socket.on('service', createService);

  socket.on('infos', function () {
    infos = getInfos();
    io.emit('states',infos);
  });

});

// Sanitize build dir by cleaning it... :D
gulp.task('clean', function() {
  return del([path.join(CONFIG.APP_BUILD_CLIENT), path.join(CONFIG.APP_BUILD_SERVER)]);
});

gulp.task('compress:images', function() {
  return gulp.src(globs.images)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(imagemin())
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'assets/')))
    .on('end',refreshBrowser);
})

gulp.task('copy:php', function() {
  return gulp.src(globs.php)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'class/')))
    .on('end',refreshBrowser);
})

gulp.task('copy:assets', function() {
  return gulp.src(globs.assets)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(gulp.dest(CONFIG.APP_BUILD_CLIENT))
    .on('end',refreshBrowser);
})

gulp.task('compile:styles', function() {
  var sassStream = gulp.src(globs.sass)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(sass({
        sourcemap: production,
        outputStyle: 'compressed',
        indentedSyntax: !production,
        errLogToConsole: !production,
        includePaths: CONFIG.INCLUDE_STYLES_PATH
    }))
    .pipe(concat('scss-files.scss'));

  var lessStream = gulp.src(globs.less)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(less({
      paths: CONFIG.INCLUDE_STYLES_PATH
    }))
    .pipe(concat('less-files.less'));

  var cssStream = gulp.src(globs.css)
    .pipe(plumber())
    .pipe(concat('css-files.css'));

  return merge(lessStream, sassStream, cssStream)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(concat('main.min.css'))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(autoprefixer(CONFIG.AUTOPREFIXER))
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'styles/')))
    .on('end',refreshBrowser);

})

gulp.task('compile:scripts', function() {
  var libs = getLibs();

  var b = browserify({
    entries: [path.join(CONFIG.PATH_CLIENT, "main.coffee")],
    fullPaths: !production,
    extensions: ['.coffee','.js','.ejs'],
    paths: [CONFIG.PATH_CLIENT],
    debug: !production,
    transform: ['coffeeify','babelify']
  }).on('error', errorHandler);

  libs.forEach(function(lib) {
    b.external(lib);
  });

  var stream = b.bundle().pipe(plumber({ errorHandler: errorHandler })).pipe(source(CONFIG.APP_BUNDLE));

  return stream.pipe(plumber({ errorHandler: errorHandler }))
    .pipe(gulpif(production, buffer()))
    .pipe(gulpif(production, uglify({ mangle: false })))
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'scripts/')))
    .on('end',refreshBrowser);
})

gulp.task('bundle:libs', function() {
  var libs = getLibs();

  var b = browserify({
    fullPaths: !production,
    debug: !production
  });

  // Bundle external libs found
  libs.forEach(function(lib) {
    console.log(yellow('[!] Bundle ' + lib.toLowerCase()));
    b.require(lib, {expose: lib.toLowerCase()});
  });

  if ( !production ) {
      b = watchify(b);
      b.on('update', function() {
          gutil.log(orange("[+] Rebuilding libs bundle"));
      }).on('error', errorHandler);
  }
  
  return b.bundle()
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(source(CONFIG.LIBS_BUNDLE))
    .pipe(gulpif(production, buffer()))
    .pipe(gulpif(production, uglify({ mangle: false })))
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'scripts/')))
    .on('end',refreshBrowser);

});

gulp.task('compile:jade_index', ['compile:jade_templates'], function(){
  return gulp.src(globs.jade_index)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(data(CONFIG))
    .pipe(jade({pretty: !production}).on('error', errorHandler))
    .pipe(rename('index.php'))
    .pipe(gulp.dest(CONFIG.APP_BUILD_CLIENT))
    .on('end',refreshBrowser);
})

gulp.task('compile:jade_templates', function(){
  return gulp.src(globs.jade_client)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(jade({pretty: !production}).on('error', errorHandler))
    .pipe(rename({dirname: '',extname: '.php'}))
    .pipe(gulp.dest(path.join(CONFIG.APP_BUILD_CLIENT, 'pages/')));
})

// Create single task for all client actions
gulp.task('compile:client', function() {
  gulp.start([
    'compress:images',
    'copy:php',
    'copy:assets',
    'bundle:libs',
    'compile:styles',
    'compile:scripts',
    'compile:jade_index'
    ]);
})

// Refresher Client Tasks
gulp.task('watch:client', ['compile:client'], function(){
  watch(globs.images, function(){
    gulp.start('compress:images');
  });
  watch(globs.php, function(){
    gulp.start('copy:php');
  });
  watch(globs.assets, function(){
    gulp.start('copy:assets');
  });
  watch(globs.styles, function(){
    gulp.start('compile:styles');
  });
  watch(globs.coffee, function(){
    gulp.start('compile:scripts');
  });
  watch(globs.jade_index, function(){
    gulp.start('compile:jade_index');
  });
  watch([path.join(CONFIG.PATH_CLIENT,CONFIG_FILE)], function(){
    gulp.start('compile:jade_index');
  });
  watch(globs.jade_client, function(){
    gulp.start('compile:jade_index');
  });
});

////////////////////  END OF CLIENT PROCESS  /////////////////////////



///////////////////    SERVER PROCESS   /////////////////////////////

gulp.task('copy:data', function() {
  return gulp.src(globs.server_data)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(gulp.dest(CONFIG.APP_BUILD_SERVER));
})

gulp.task('compile:server', ['copy:data'], function(){
  console.log(blue('[+] Server compile'))
  return gulp.src(globs.server)
    .pipe(plumber({ errorHandler: errorHandler }))
    .pipe(coffee({bare: true, sourceMap: false, header: false}))
    .pipe(concat('server.js'))
    .pipe(gulpif(production, buffer()))
    .pipe(gulpif(production, uglify()))
    .pipe(gulp.dest(CONFIG.APP_BUILD_SERVER));
})

// run server 
gulp.task('start:server', ['watch:server','watch:server_data'], function() {
  console.log(blue('[+] Starting server'));
  server.listen( { path: path.join(CONFIG.APP_BUILD_SERVER, 'server.js') } );
});

// restart server if app.js changed 
gulp.task('watch:server', ['compile:server'], function() {
  watch( globs.server, function(){
    gulp.start('compile:server');
    server.restart();
    refreshBrowser();
  });
});

// restart server if data has changed 
gulp.task('watch:server_data', function() {
  watch( globs.server_data, function(){
    gulp.start('copy:data');
    // Must restart the server anyway
    server.restart();
    refreshBrowser();
  });
});

////////////////////  END OF SERVER PROCESS  /////////////////////////

// run client 
gulp.task('start:client', ['watch:client'], function() {
  console.log(blue('[+] Starting client'));
});


// Default task, launch it with '#> gulp'
gulp.task('default', ['clean'], function() {
  var TASKS = ['start:client'];

  // If a node server is required
  if(CONFIG.BACKEND.indexOf('NodeJS') > -1){
    TASKS.push('start:server');
  }

  gulp.start(TASKS, function () {
      if(FIRSTIME){  
        console.log(green("[+] Start task finished"));
        console.log(green("[+] Check http://" + CONFIG.APP_URL + "/"));
        ON_ERROR = false;
        FIRSTIME = false;
        io.emit('success',"Gulp ready...");
      }
    }
  )
});
