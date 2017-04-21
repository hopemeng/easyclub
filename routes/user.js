const mongoose = require('mongoose');
const utils = require('../lib/utils')
const markdown = require('markdown-it');
const router = require('koa-router')();
const users = require('../models/user')
const config = require('../config');
const Page = require('../common/page');
router.get('/', function (ctx, next) {
  ctx.body = 'this a users response!';
});

/**
 * 登录页面
 */
router.get('/login', async (ctx, next) => {
  await ctx.render('user/login', {
    title: '用户登录'
  })
})
 
/**
 * 登录处理
 */
router.post('/login', async (ctx, next) => {
  let body = ctx.request.body;
  let User = ctx.model('user');
  let user = await User.check_password(body.username, body.password);

  if(!user){
    return ctx.error('没有此用户或密码错误！');
  }
  // 用户名密码正确
  ctx.session.username = user.username;
  ctx.session.user = user;

  return ctx.success();
}) 

router.get('/logout', (ctx, next) => {
  ctx.session.username = null;
  ctx.session.user = null;
  ctx.redirect('/');
})

/**
 * 注册页面
 */
router.get('/register', async (ctx, next) => {
  await ctx.render('user/register', {
    title: '用户注册'
  })
})

/**
 * 接收注册信息
 */
router.post('/register', async (ctx, next) => {
  let body = ctx.request.body;
  if(!body.username || !body.password || !body.email){
     return ctx.error('您请求的参数不完整!');
  }
  let User = ctx.model('user');
  
  // 验证用户名是否重复
  let user = await User.findOneQ({
    username: body.username
  })

  if(user){
    return ctx.error('用户名已注册过啦！');
  }
  // 验证邮箱
  user = await User.findOneQ({
    email: body.email
  });

  if(user) {
    return ctx.error('此邮箱已经注册过啦！');
  }; 

  user = new User(body);
  let result = await user.saveQ();
  return ctx.success();
})

/**
 * 用户设置
 */
router.get('/setting', async (ctx, next) => {
  let User = ctx.model('user');
  let user = await User.findOneQ({
    username: ctx.state.username
  });
  await ctx.render('user/setting', {
    title: '用户中心',
    userinfo: user
  });
});

/**
 * 修改用户信息
 */
router.post('/', checkLogin, async (ctx, next) => {
  let body = ctx.request.body;
  let User = ctx.model('user');
  let user = await User.findOneQ({
    username: ctx.state.username
  });

  user.email = body.email;
  user.home = body.home;
  user.github = body.github;
  user.signature = body.signature;

  let result =  await user.saveQ();
  
  if(result){
    ctx.session.user = user;
    return ctx.success();
  }else{
    return ctx.error('修改失败');
  }
})

async function checkLogin(ctx, next) {
  if (!ctx.session.user) {
    return ctx.error('您还未登录，请登录后重试！');
  }else{
    await next();
  }
}

/**
 * 修改密码
 */
router.post('/setpass', checkLogin, async (ctx, next) => {
  let oldpass = ctx.request.body.oldpass;
  let newpass = ctx.request.body.newpass;

  if(!oldpass || !newpass){
    return ctx.error('请求参数不完整！');
  }

  let User = ctx.model('user');
  //let User = mongoose.model('user', users);
  let user = await User.check_password(ctx.state.username, oldpass);
  if(!user){
    return ctx.error('当前密码输入错误，请检查后重试！');
  }

  user.password = newpass;
  let result = await user.saveQ();

  if(!result){
    return ctx.error('保存失败，请检查后重试！');
  }
  //重新登录
  ctx.session.user = null;
  ctx.session.username = null;
  ctx.success('修改成功，请重新登录！');

})

/**
 * 用户首页
 */
router.get('/:username', checkLogin, async (ctx, next) => {
  let username = ctx.params.username;
  let User = ctx.model('user');
  let user = await User.findOneQ({
    username: ctx.params.username
  });
  if(!user) {
    throw new Error('没有找到此用户！');
  }
 
  let Topic = ctx.model('topic');
  // 查询参数
  let options = {
    sort: '-create_time',
    limit: 5
  }
  let query = {
    author_id: user._id,
    deleted: false
  }
  let [topics, replys] = await Promise.all([
    // 查询用户帖子    
    Topic.find(query, null, options),
    // 查询用户回复内容
    ctx.model('reply').find(query, null, options)
  ]);
  replys = await Promise.all(replys.map(async (reply) => {
    reply.topic = await Topic.findById(reply.topic_id);
    return reply;
  }));
  await ctx.render('user/home', {
    title: username + '的个人主页',
    userinfo: user,
    topics: topics,
    replys: replys,
    md: new markdown()
  })
})
/**
 * 用户话题页
 */
router.get('/:username/topic', checkLogin, async (ctx, next) => {
  let username = ctx.params.username;
  let users = await ctx.model('user').findOne({username: username});
  let Topic = ctx.model('topic');
  let current_page = +ctx.query.page || 1;
  
  let totalCount = await Topic.count({author_id: users._id})
  let all_page_num = Math.ceil(totalCount / config.pageSize);
  let start_item_num = (current_page - 1) * config.pageSize
  let topics = await Topic.find({author_id: users._id}).skip(start_item_num).limit(config.pageSize)
  let page = Page.get(current_page, all_page_num, config.showPageNum);
 
  await ctx.render('user/topics', {
    titlt: `${username} 发表的话题`,
    topics: topics,
    userinfo: users,
    page: page
  })
})
/**
 * 用户回复内容列表页
 */
router.get('/:username/reply', checkLogin, async (ctx, next) => {
  let username = ctx.params.username;
  let Topic = ctx.model('topic');
  let users = await ctx.model('user').findOne({username: username});
  let Reply = ctx.model('reply')
  let totalCount = await Reply.count({author_id: users._id})

  let current_page = +ctx.query.page || 1;
  let all_page_num = Math.ceil(totalCount / config.pageSize);
  let start_item_num = (current_page - 1) * config.pageSize;
  let replys = await Reply.find({author_id: users._id}).skip(start_item_num).limit(config.pageSize);
  let page = Page.get(current_page, all_page_num, config.showPageNum);
  let promises = replys.map(async (reply) => { 
    reply.topic = await Topic.findById(reply.topic_id);  
    return reply;
  });
  replys = await Promise.all(promises);
  
  await ctx.render('user/replys', {
    title: username + '的个人主页',
    userinfo: users,
    replys: replys,
    page: page,
    md: new markdown()
  })
})
router.get('/test/test', async (ctx) => {
  let date1 = new Date();
  let Reply = ctx.model('reply')
  let Topic = ctx.model('topic');
  let replies = await Reply.find({author_id: '58f5aae33796230f1a0d7f01'});
  
  let promises = replies.map(async (reply) => { 
    reply.topic = await Topic.findById(reply.topic_id);  
    return reply;
  });
  replies = await Promise.all(promises);
  let date2 = new Date();
  ctx.body = results;
})
module.exports = router;


