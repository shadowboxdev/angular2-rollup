"use strict";

require('shelljs/global');

const fs          = require('fs');
const path        = require('path');
const logger       = require('./build.log.js');

const log = logger.log;
const warn = logger.warn;
const alert = logger.alert;
const colors = logger.colors;

let lib = false;
let useVersion = '4.4.6';
let hasWarning = false;
let dynamicRoutes = false;

const projectPath = path.dirname(process.cwd()) + '/' + path.basename(process.cwd());
const cliPath = path.dirname(fs.realpathSync(__filename));

fs.writeFile(projectPath + '/cli.config.js', 'module.exports = { cliRoot: "' + cliPath + '"}', function (err) {
    if (err) {
        return console.log(err);
    }
});


const files     = [
    'src',
    '.editorconfig',
    'gitignore.scaffold',
    '.npmignore',
    'closure.conf',
    'closure.lazy.conf',
    'closure.externs.js',
    'karma-test-shim.js',
    'karma.conf.js',
    'lazy.config.json',
    'main.prod.js',
    'main.prod.ts',
    'main.ts',
    'postcss.dev.js',
    'postcss.jit.js',
    'postcss.prod.js',
    'protractor.config.js',
    'rollup.config.js',
    'rollup.config.lib.js',
    'rollup.config.lib-es5.js',
    'rollup.config.lib-umd.js',
    'router.js',
    'server.config.dev.js',
    'server.config.prod.js',
    'server.js',
    'tsconfig.dev.json',
    'tsconfig.jit.json',
    'tsconfig.prod.json',
    'tsconfig.prod.lazy.json',
    'tsconfig.lib.json',
    'tsconfig.lib.es5.json',
    'jsconfig.json',
    'tslint.json'
];



/* Test for arguments the ngr cli spits out */

process.argv.forEach((arg)=>{
  if (arg.includes('lib')) {
      lib = true;
  }
  if (arg.includes('version')) {
      useVersion = arg.toString().split('=')[1];
  }
  if (arg.includes('dynamicRoutes')) {
      dynamicRoutes = arg.toString().split('=')[1];
  }
});


/*

  Copy Tasks

- file: Copies a file to /dist

*/

const copy = {
    file: (p) => {
        if (fs.existsSync(projectPath + '/' + p.split('/')[p.split('/').length - 1])) {
            warn(p.split('/')[p.split('/').length - 1] + ' already exists');
            hasWarning = true;
        } else {
            cp('-R', p, projectPath + '/');
            log(p.split('/')[p.split('/').length - 1], 'copied to', projectPath + '/');
        }
    },
    scaffold: (files) => {

        if (fs.existsSync(projectPath + '/' + '.gitignore')) {
            warn('.gitignore' + ' already exists');
            hasWarning = true;
        } else {
            cp(cliPath + '/' + 'gitignore.scaffold', projectPath + '/' + '.gitignore');
            log('.gitignore', 'copied to', projectPath + '/');
        }

        files.forEach((filename)=>{
            if (filename === 'gitignore.scaffold') {
                return;
            }
            copy.file(cliPath + '/' + filename);
        });

        if (dynamicRoutes) {
            if (fs.existsSync(projectPath + '/src/app/app.config.ts')) {
                rm(projectPath + '/src/app/app.config.ts');
            }
            if (fs.existsSync(projectPath + '/lazy.config.json')) {
                rm(projectPath + '/lazy.config.json');
            }
            if (fs.existsSync(projectPath + '/src/app/app.routes.ts')) {
                rm(projectPath + '/src/app/app.routes.ts');
            }
            rm(projectPath + '/src/app/app.module.ts');
            cp(cliPath + '/lazy.routes.config.json', projectPath + '/lazy.config.json');
            cp(cliPath + '/src-dynamic-route/app/app.routes.ts', projectPath + '/src/app/app.routes.ts');
            cp(cliPath + '/src-dynamic-route/app/app.config.ts', projectPath + '/src/app/app.config.ts');
            cp(cliPath + '/src-dynamic-route/app/app.module.ts', projectPath + '/src/app/app.module.ts');
        }

    }
};

let init = function() {


    if (lib == false) {

        copy.scaffold(files.filter((filename)=>{
            return filename.includes('lib') === false;
        }));

        rm('-rf', projectPath + '/src/lib');

    } else {
        copy.scaffold(files);
    }

    if (hasWarning == true) {
        warn('Please move or delete existing files to prevent overwiting.');
        return;
    }


    cp(cliPath + '/package.scaffold.json', projectPath+'/package.json');

    fs.readFile(cliPath + '/package.scaffold.json', (err, script) => {

        if (err) throw err;

        script = JSON.parse(script);
        script.name = path.basename(process.cwd());


        Object.keys(script.dependencies).forEach((dep) => {
            if (dep.includes('@angular')) {
                script.dependencies[dep] = useVersion;
            }
        });

        Object.keys(script.devDependencies).forEach((dep) => {
            if (dep.includes('@angular')) {
                script.devDependencies[dep] = useVersion;
            }
        });

        fs.writeFile(projectPath+'/package.json', JSON.stringify(script, null, 4), function (err) {
            if (err) log(err);
            log('ngr scaffolded ' + path.basename(process.cwd()), 'angular@'+ useVersion);
            alert('npm install', 'to install project dependencies');
            alert('ngr build dev --watch --serve', 'to start up Express server, enable a watcher, and build Angular for development');
            alert('ngr build prod --serve', 'to compile your project AOT for production, start up Express server');
            alert('ngr --help', 'for more CLI commands' );
        });

      });


};


init();