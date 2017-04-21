const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const views = require('koa-views');
const loader = require('loader');
const co = require('co');
const convert = require('koa-convert');
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser')();
const mount = require('mount-koa-routes');
const mongoose = require('koa-mongoose');
const session = require('koa-session');
const c2k = require('koa-connect')
//import Router from 'lark-router';
//const router = new Router().load(__dirname + '/routes');
const config = require('./config');
const index = require('./routes/index');
const user = require('./routes/user');
const topic = require('./routes/topic');
const utils = require('./lib/utils');
const log4js = require('./common/log4js');
const logger = log4js.fileLog;
app.keys = ['easyclub'];
app.use(require('./middlewares/error'));
// 本地调试状态
if(config.debug) {
  app.use(require('./middlewares/stylus')(__dirname + '/public'));
  const livereload = require('livereload');
  let server = livereload.createServer({
    exts: ['jade','styl'] 
  });
  server.watch([
    __dirname + '/public',
    __dirname + '/views'
  ]);
};
app.use(c2k(log4js.connectLogger(log4js.fileLog)))
// middlewares
app.use(convert(bodyparser));
app.use(convert(json()));
app.use(require('koa-static')(__dirname + '/public'));
const CONFIG = {
  key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
  maxAge: 60 * 60 * 1000, /** (number) maxAge in ms (default is 1 days) */
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
};
app.use(convert(session(CONFIG, app)));

app.use(async (ctx, next) => {
  ctx.state = {   
    loader: loader,  
    sitename: config.sitename,
    // 用户登录状态
    username: ctx.session.username || false,
    user: ctx.session.user,
    formatTime: utils.formatTime
  };
  await next();
});

app.use(require('./middlewares/return_data'));

app.use(views(__dirname + '/views', {
  extension: 'jade'
}));


// 数据库
app.use(convert(mongoose(Object.assign({
  server: {
    poolSize: 5
  },
  schemas: __dirname + '/models'
}, config.mongodb))));

// logger
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

router.use('', index.routes(), index.allowedMethods());
router.use('/user', user.routes(), user.allowedMethods());
router.use('/topic', topic.routes(), topic.allowedMethods());
app.use(router.routes(), router.allowedMethods());

// response
app.on('error', function(err, ctx){
  console.error('error',err)
  logger.error('server error', err, ctx);
});

module.exports = app;