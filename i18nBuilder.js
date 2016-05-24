//查找文件
//替换处理
//
module.exports  = (function(){
	
    var path = require("path");
    var TidBus = require("tid_bus");
    var TidI18n = require("tid_i18n");
    var fs = require("fs");
    
    var JSlog = {
      sendLog:function(msg){
         TidBus.emit("build:log", msg);
      }
    }
    
    var replaceFiles = function(dirPath){
         JSlog.sendLog("替换文件始处理中！");
         var files = {};
         
         var stat = fs.lstatSync(dirPath);
         if(stat.isDirectory()){
            files = getAllFiles(dirPath,".js");
         }else{
            files[dirPath] = dirPath;
         }
         try{
            filterJs(files);
         }catch(e){
            JSlog.sendLog(e);
         }
         JSlog.sendLog("替换文件始结束！");
    }
    var createI18nPage = function(pageHtml,obj){
    	 debugger;
    	 var files = queryAllFiles(pageHtml);
         for(var item in files){
             buildI18nPage(item,obj);
         }
    }
    
    var buildI18nPage = function(pageHtml,obj){
    	 obj = obj ||{};
         JSlog.sendLog("国际化页面开始处理....！");
         var i18nDir = obj.dir;
         var fileDir,fileName,conten;
         i18n_fils = obj["files"]||getAllFiles(obj["dir"]);
         for(var item in i18n_fils){
            content = coreBuildI18nPage(pageHtml,item);
            writeFile(path.dirname(pageHtml)+"\\"+getI18Name(item,pageHtml),content);
         }
         
         JSlog.sendLog("国际化页面完成处理....！");
    }
    
    var coreBuildI18nPage = function(pageHtml,langFile){
    	
    	var pageHtml = fs.readFileSync(pageHtml,'utf-8').toString();
    	var langFile = require(langFile);
    	var content =  TidI18n.processString(pageHtml,langFile);
    	return content;
    }
    var getI18Name = function(i18nPath,pageHtml){
    	var fileDir = path.dirname(i18nPath);
        var newFileName = fileDir.substr(fileDir.lastIndexOf("\\")+1);
        var srcPageName = pageHtml.match(/[a-z _ A-Z 0-9]*.[a-z]*$/);
        return newFileName+"_"+srcPageName[0];
    }
    var writeFile = function(filePath,conent,type){
    	
          //修改
        fs.writeFile(filePath,conent,'utf8', function(err) {//会先清空原先的内容
                    if (err) {
                        JSlog.sendLog(err);
                    }else{
                    	JSlog.sendLog("文件写成功");
                    }
                });
    }
    /**
     * 查找文件
     */
    var queryAllFiles = function(xpath){
    	 var files={},stat = fs.lstatSync(xpath);
         if(stat.isDirectory()){
            files = getAllFiles(xpath,".shtml$|.html$");
         }else{
            files[xpath] = xpath;
         }
         return files;
    }
    
    var  getAllFiles = function(root, type) {
     
        var reg = RegExp(type||'.');
        var result = {}, files = fs.readdirSync(root);
        var _this = this;
        files.forEach(function(file) {
                    var pathname = root + "/" + file, stat = fs
                            .lstatSync(pathname)
                    if (stat === undefined )
                        return
                    if (!stat.isDirectory()) {
                        if (pathname.match(reg)) {
                            result[pathname] = {
                                md5 : '',
                                path : pathname
                            };
                        }
                    } else {
                        extend(result, getAllFiles(pathname,reg));
                    }
                });
        return result
    }
    var filterJs = function(jss){
       for(var item in jss){
            modifyFile(item);
       }
    }
    var modifyFile = function(file,fileName){
        var ret = /require\(\"text!(.*)\"\)/g;
        //RegExp.$1为查找到文件
         //查找
        var reg = new RegExp(ret);
        var cb =  function(match,fileurl){
                     JSlog.sendLog("替换html文件："+fileurl);
                     //读取对应文件内容
                     var files = _findPath(arguments.callee.relFile,[fileurl]);
                     var file = fs.readFileSync(files[fileurl],'utf-8').toString();
                     return filterHtmlContent(file,fileurl);
                  };
                  
        modifyFileContent(file,reg,cb);
        
    }
    
    //查找文件
    //_findPath("F:\dev_branches\tenpay_mpay\htdocs\res\detail.js","/a/b.js");
    //F:\dev_branches\tenpay_mpay\htdocs\res\a\b.js
    var _findPath  = function(request,paths){
    	var retPath = {};
    	 // 如果是绝对路径，就不再搜索
  	    var realPath =  request.substr(0,request.indexOf("res"))+"/";
  	    var dir = path.dirname(request);
  	    for (var i = 0, PL = paths.length; i < PL; i++) {
  	    	 if (paths[i].charAt(0) === '/') {
  	    	     retPath[paths[i]] = realPath+paths[i];
  	    	 }else if(paths[i].charAt(0).match(/./)){
  	    	 	 retPath[paths[i]] = path.resolve(dir, paths[i]);
  	    	 }
  	    }
       return retPath;
    }
    
    //修改文件
    var modifyFileContent = function(file, regExp, cb) {
        //查找
        
        var _this = this;
        
        fs.readFile(file, 'utf-8', function(err, data) {
                    if (err) {
                        _this.sendLog(err, 'error');
                        return;
                    }
                    data = data.replace(regExp, (function(f){
                    	cb.relFile = f;
                        return cb;
                    })(file));
                    console.log("\n"+data);
                    //修改
                    fs.writeFile(file, data, function(e) {//会先清空原先的内容
                                if (e) {
                                    _this.sendLog(err, 'error');
                                };

                            })
                });

    }
    //过滤文件内容
    var filterHtmlContent = function(htmlContent,filepath){
        var rethtml,keepBlank = false;
        var txt = htmlContent.replace(/(^\s*)|(\s*$)/g, '');
        if( txt ) {
            var lines = txt.split(/\r?\n/);
            var line;
            
            for (var i = 0; i < lines.length; i++) {
                line = lines[i];
                
                //去除空行..................
                if( line.replace(/(^\s*)|(\s*$)/g, '') == '' ){
                    lines.splice(i, 1);
                    i--;
                    continue;
                }
                
                //替换掉单引号
                line = line.replace(/[']/g, function( rb ){
                    return '\\\'';
                });
                
                line = ' ' + line + ' ';
                line = line.replace(/^\s*/g, function( lb ){
                    return (keepBlank ? ( i == 0 ? '':'    ') : lb) + '\'';
                });
                line = line.replace(/\s$/g, function( rb ){
                    return '\'';
                });
                lines[i] = line;
            }
            
            rethtml = '[' + lines.join(",\r\n") + '].join("")';
        }
        
        return  rethtml + (filepath?("\r\n"+"//require(\"text!"+filepath+"\")"):"");
    }
    var extend = function(o,n,override){
               for(var p in n){
                    if(n.hasOwnProperty(p) && (!o.hasOwnProperty(p) || override)){
                        o[p]=n[p];
                    }
               }
   }
   
   var createJS = function(pageHtml){
   	     var files = queryAllFiles(pageHtml);
   	     for(var item in files){
   	     	 buildJsFile(item);
   	     }
   }
   
   var buildJsFile=function(pageHtml){
   	     var file = fs.readFileSync(pageHtml,'utf-8').toString();
         var content =  filterHtmlContent(file);
         var strs = buidCodeContent(content);
         
         writeFile(pageHtml+".js",strs);
   }
   
   var buidCodeContent = function(content){
   	      var code = [
              'define(function(require, exports, module) {',
              '  var source = ' + content + ';',
              '  return source;',
              '})'
          ].join('\n');
   	
   	    return code;
   }
    return {
        replaceFiles   : replaceFiles,
        createI18nPage : createI18nPage,
        createJS       : createJS
    }
    
})();