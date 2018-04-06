require('shelljs/global');
const path            = require('path');
const fs              = require('fs');
const Build           = require('./index.js');
const SassBuilder     = require('./../style/sass.js');
const PostCSSBuilder  = require('./../style/postcss.js');
const AOTBuilder      = require('./../compile/ngc.js');
const ClosureBuilder  = require('./../bundle/closure.js');
const RollupBuilder   = require('./../bundle/rollup.js');
const util            = require('./../util.js');
const log             = require('./../log.js');
const config          = require('./../config');
const cli             = require('./../../cli.config.json');


class ProdBuild extends Build {

    constructor() {
        super();
    }

    init() {
        this.pre();
    }

    build() {

      const sassBuilder = new SassBuilder({ dist: config.build });
      const postcssBuilder = new PostCSSBuilder({ dist: config.build, sourceMap: true });
      const aotBuilder = new AOTBuilder();
      const closureBuilder = new ClosureBuilder();
      const rollupBuilder = new RollupBuilder();

      (async () => {
        const lib = await util.copyLib(config.lib && config.lib[cli.env] ? config.lib[cli.env] : config.dep['prodLib'],
                                       config.lib && config.lib[cli.env] ? config.lib.src : config.dep.src,
                                       config.lib && config.lib[cli.env] ? config.lib.dist : config.dep.dist);
        const publicDir = await util.copyDir(path.normalize(config.src + '/public'), config.build);
        const template = await util.formatIndex(path.normalize(config.src + '/public/index.html'));
      })();

      (async () => {
        const copyMain = await cp('main.ts', 'main.js');
        const copy = await cp('-R', path.normalize(config.src + '/'), path.normalize('./ngfactory'));
        // remove moduleId prior to ngc build. TODO: look for another method.
        const stripModuleId = await ls(path.normalize('ngfactory/**/*.ts')).forEach(function (file) {
          sed('-i', /^.*moduleId: module.id,.*$/, '', file);
        });
        const sass = await sassBuilder.batch(ls(path.normalize(config.src + '/**/*.scss')));
        const postcss = await postcssBuilder.batch(sass);
        const copycss = await postcssBuilder.copyToNgFactory(postcss);
        const src = await aotBuilder.compile(path.join('tsconfig.' + cli.env + '.json'));

        if (cli.program.rollup) {
          const bundle = await rollupBuilder.bundle(path.join(config.projectRoot, 'rollup.config.prod.js'));
        } else {
          const bundle = await closureBuilder.bundle();
        }

        if (util.hasHook('post')) config.buildHooks[cli.env].post(process.argv);
        util.getTime(this.startTime);

      })();

    }

    pre() {

      let build = () => {
        if (util.hasHook('pre')) {

          config.buildHooks[cli.env].pre(process.argv).then(() => {
            this.build();
          });

        } else {

          this.build();

        }

      }

      if (cli.program.clean !== false) {
        util.cleanBuild().then(()=>{
          build();
        });
      } else {
        build();
      }

    }

    post() {

      if (util.hasHook('post')) config.buildHooks[cli.env].post(process.argv);
      rm('main.js');
      log.break();
      util.getTime(this.startTime);

    }

}

module.exports = ProdBuild;