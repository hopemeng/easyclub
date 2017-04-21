// 中间件的顺序要放在想被try，catch的中间件之前
module.exports = async function (ctx, next){
    try{
        await next(); // 所有在此之后使用的中间件的代码都被包在这个try里了
    } catch(err) {
        let status = err.status || '500';
        if (err.code == 200) {
            //logger.warn('Please do not put the error code to 200');
        }
        ctx.body = {
            status: status,
            message: err.message,
            stack: err.stack,  
        }
        console.log('this',this)
        ctx.app.emit('error',err,this); // 被catch住的error不会触发app的error事件，需主动触发
    }
};