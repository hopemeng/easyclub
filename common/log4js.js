const log4js = require('log4js');

log4js.configure({
    appenders: [
        {
            type: 'console',
            category: "console"
        },
        {
            category:"log_file",
            type: "file",
            filename: "logs/file.log",
            maxLogSize: 1048000,
            backups: 100
        },
        {
            category : 'log_date',
            type : 'dateFile',
            filename : 'logs/date.log',
            pattern : '-yyyy-MM-dd.log',
            alwaysIncludePattern : true, 
        }
    ],
    replaceConsole: true,
    levels:{
        log_date: 'all',
        console: 'info',
        log_file: 'error',
    }
});

log4js.dateLog = log4js.getLogger('log_date');
log4js.consoleLog = log4js.getLogger('console');
//log4js.fileLog = log4js.getLogger('log_file');

exports = module.exports = log4js;

exports.fileLog = log4js.getLogger('log_file');