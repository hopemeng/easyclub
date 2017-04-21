const router = require('koa-router')();
const config = require('../config');
const Promise = require('promise');
const Page = require('../common/page');
const utils = require('../lib/utils')

router.get('/', async function (ctx, next) {
  let current_tag = config.tags.indexOf(ctx.query.tag) > -1
  ? ctx.query.tag: 'all';

  // +号让其转换为数字
  let current_page = +ctx.query.page || 1;
  //// 读取主题列表
  let Topic = ctx.model('topic');
  //组合查询对象
  let query = {deleted: false};
  if(current_tag !== 'all'){
    query.tag = current_tag;
  }
  //计算分页数据
  let start_item_num = (current_page - 1) * config.pageSize;

  //查询总条数
  let count = await Topic.countQ(query);
  let all_page_num = Math.ceil(count / config.pageSize)
  
  let page = Page.get(current_page, all_page_num, config.showPageNum);
  console.log('query',query)
  let topics = await Topic.find(query)
    .sort({
      last_reply_at: -1
    })
    .skip(start_item_num)
    .limit(config.pageSize)
    .execQ();

  //读取用户信息
  let User = ctx.model('user');

  topics = await Promise.all(topics.map( async (value) => {
    value.author = await User.findOneQ({
      _id: value.author_id
    });
    return value;
  }));
  let scoreRank = await User.find().sort({score: -1}).limit(10);
  let result = {
    title: '首页',
    topics: topics,
    tags: config.tags,
    scoreRank: scoreRank,
    current_tag: current_tag,
    page: page,
  }
  console.log('ctx.session.user',ctx.session.user)
  if(ctx.session.user) {
    let userinfo = await User.findOneQ({_id: ctx.state.user._id});
    result.userinfo = userinfo;
  }
  await ctx.render('index', result);
})

router.get('/index', async (ctx, next) => {
  let param = ctx.query;
  // 读取主题列表
  let Topic = ctx.model('topic');
  // 查询第几页
  let current_page = param.page || 1;
  let params = '';
  param.tag ? params = {tag:param.tag} : params = '';
  //计算分页数据
  let start_item_num = (current_page - 1) * config.pageSize;
  let topics = await Topic.find(params)
    .sort({
      last_reply_at: -1
    })
    .skip(start_item_num)
    .limit(config.pageSize)
    .execQ();
    ctx.body = topics;
})

router.get('/test', async (ctx, next) => {
  //let err = createError(400, '测试error');
  //err.code = 400;
  //err.message = '测试error';
  throw(err);
})

module.exports = router;