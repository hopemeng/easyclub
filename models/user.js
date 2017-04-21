/**
 * 用户模型
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

var UserSchema = new mongoose.Schema({
  username: { type: String, required: true},
  password: { type: String, required: true},
  email: { type: String, required: true },
  home: { type: String},   // 个人主页
  github: { type: String},  // github
  avatar: { type: String },  // 头像
  score: { type: Number, default: 0 },// 用户积分
  signature: { type: String, default: '无个性，不签名！'},  // 个性签名
  topic_count: { type: Number, default: 0 },
  reply_count: { type: Number, default: 0 },
  create_time: { type: Date, default: Date.now }
  
})

UserSchema.index({username: 1}, {unique: true});

/**
 * password写入时加密
 */
UserSchema.path('password').set(function (v) {
  return crypto.createHash('md5').update(v).digest('base64');
})

/**
 * 验证用户名密码是否正确
 */
UserSchema.statics.check_password = async function (username, password) {
  let user = await this.findOneQ({
    username: username,
    password: crypto.createHash('md5').update(password).digest('base64')
  });
  return user;
}

/**
 * 更新用户发表文章数量
 */
UserSchema.statics.update_topic_count = async function (user_id, num) {
  let result = await this.update(
    {_id: user_id},
    {'$inc': {'topic_count': num}}
  );
  return result;
}

/**
 * 更新用户积分
 */
UserSchema.statics.update_user_score = async function (user_id, num) {
  let result = await this.update(
    {_id: user_id},
    {'$inc': {'score': num}}
  );
  return result;
}

/**
 * 更新用户回复数量
 */
UserSchema.statics.update_reply_count = async function (user_id, num) {
  let result = await this.update(
    {_id: user_id},
    {'$inc': {'reply_count': num}}
  );
  return result;
}
UserSchema.statics.test = async function () {
  
  return 'result';
}

module.exports = UserSchema;