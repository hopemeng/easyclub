
const router = require('koa-router')();
const config = require('../config');
const markdown = require('markdown-it');
const Promise = require('promise');
var Reply = require('../models/reply')
const utils = require('../lib/utils')

/**
 * 发表主题页面
 */
router.get('/create', check_login_middle, async (ctx, next) => {
  await ctx.render('topic/create', {
    title: '发表话题',
    tags: config.tags,
  });
});

async function check_login_middle(ctx, next) {
  //验证是否登录
  if(!ctx.session.user){
    return await ctx.render('error', {
        title: '错误',
        message: '请先登录！',
        jump: '/user/login'
    });
  }
  await next();
}

/**
 * 发表主题
 */
router.post('/', check_login_middle, async (ctx, next) => {
  
  let body = ctx.request.body;
  if(!body.title || !body.tag || !body.content){
    return utils.resError(400, '您请求的参数不完整！');
  }

  let user_id = ctx.state.user._id;
  let Topic = ctx.model('topic');
  try {
    //添加文章
    let topic = new Topic({
      title: body.title,
      tag: body.tag,
      content: body.content,
      author_id: user_id,
    });
  
    let result = await topic.saveQ();
    //更新用户主题数和用户积分
    let User = ctx.model('user');
    await Promise.all([User.update_topic_count(user_id, 1), User.update_user_score(user_id, config.score.topic)]);
    ctx.success({
      topic_id: result._id
    });
  } catch(err) {
    utils.resError(err);
  }
  
});

/**
 * 查看主题
 */
router.get('/:topic_id', async (ctx,next) => {
  let topic_id = ctx.params.topic_id;
  let Topic = ctx.model('topic');

  let topic = await Topic.get_topic(topic_id);
  console.log('topic', topic);
  if(!topic || topic.deleted){
    return await ctx.render('error', {
      title: '错误',
      message: '您要查看的文章已删除！',
      jump: '-1'
    });
  }
  // 转换markdown文档
  let md = new markdown();

  //读取回复内容
  let Reply = ctx.model('reply');
  let replys = await Reply.findQ({
    topic_id: topic_id,
    deleted: false
  }, '', {sort: 'create_time'});
  console.log('replys', replys)
  //读取回复的用户
  let User = ctx.model('user');
  replys = await Promise.all(replys.map (async (value) => {
    value.author = await User.findOneQ({
      _id: value.author_id
    });
    return value;
  }));

  // 读取主题作者
  topic.author = await User.findOneQ({
    _id: topic.author_id
  });
  
  await ctx.render('topic/show', {
    title: topic.title,
    topic: topic,
    replys: replys,
    md: md
  })

});
/**
 * 回复主题
 */
router.post('/:topic_id/reply', check_login_middle, async (ctx, next) => {
  let content = ctx.request.body.content;

  if(!content){
    return utils.resError(400, '您请求的参数有误，请检查后重试！');
  }
  let Reply = ctx.model('reply');

  let user_id = ctx.state.user._id;
  let topic_id = ctx.params.topic_id;
  let reply = new Reply({
    content: content,
    topic_id: topic_id,
    author_id: user_id
  });
  try {
    let result = await reply.saveQ();
 
    //更新回复数
    let User = ctx.model('user');
    await Promise.all([User.update_reply_count(user_id, 1), 
    User.update_user_score(user_id, config.score.reply)]);

    //更新主题
    let Topic = ctx.model('topic');
    let res = await Topic.reply(topic_id, result._id);
    console.log('res',res)
    
    return ctx.success({
      topic_id: topic_id,
      reply_id: result._id
    })     
    
  } catch(err) {
    utils.resError(err)
  }
  
});

module.exports = router;