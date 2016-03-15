// require hogan
var hogan = require("hogan.js");

var fs = require('fs');

var config = false; //require('./pages.json');

var colors = require('colors');

var argv = require('yargs').argv;

var template = {};


var lang = argv.l || argv.lang || 'en_US';

var config_file = ['./pages-config/', lang, '.json'].join('');

var config = require(config_file);

// load all files into memory
for (var page in config.meta.template){
  template[page] = fs.readFileSync('templates/' + config.meta.template[page],  'utf-8');
}


var tasks = {
  error : function (){
    var location = config.meta.location.pages.html;
    location = hogan.compile(location).render({lang : lang});

    var path = location.split('/');
    path.pop();

    softmkdir(path.join('/'));

    WriteErrorTemplates(template.error, config.pages, location + '/' );
  },
  nginx : function (){
    RenderAndWrite(template.nginx, config.meta.location.config + "/nginx-error.conf" , ParseNginxConfig(config) );
  },
  json : function (){
    var location = config.meta.location.pages.json;
    location = hogan.compile(location).render({lang : lang});

    var path = location.split('/');
    path.pop();

    softmkdir(path.join('/'));

    WriteJson(config, location);
  },
  all : function (){
    for (var e in this){
      if(e !== "all" && e !== "init"){
        console.log(e);
        this[e]();
      }
    }
  }
};

if (argv.nginx || argv.n){
  tasks.nginx();
}
if (argv.json || argv.j){
  tasks.json();
}

if (argv.error || argv.e){
  tasks.error();
}
config.meta.location.pages.html
if (argv.all || argv.a){
  tasks.all();
}



function ParseNginxConfig (config){
  var NGINX_CODES = [];
  config.pages.forEach(function (page){
    if (isNumber(page.code)){
     NGINX_CODES.push(page);
    }
  });

  config.pages = NGINX_CODES;
  return config;
}
function softmkdir(dir){
  if(!folderExist(dir)){
    fs.mkdirSync(dir);
  }
}
function folderExist(filePath){
    try {
        return fs.statSync(filePath).isDirectory();
    } catch (err) {
        return false;
    }
  return false;
}
function WriteErrorTemplates(template, json, location){
  softmkdir(location);

  var code, i, value, html, name;
  for ( i=0; i<json.length; i++ ){
    value = json[i];
    if(isNumber(value.code)){
      name = value.code + "-error.html";
    }else{
      name = value.code + ".html";
    }
   RenderAndWrite(template, location + name, value);
  }
}

function WriteJson(config, location){
  softmkdir(location);
  var name, filename;

  var lua = config.config.nginx.lua || false;

  var json = {};

  if (lua){
    json.meta = {
      uuid : '_uuid_',
      cid : '_cid_'
    };
  }

  config.pages.forEach(function (obj){
    json.code = obj.code;
    json.message = obj.description;
    json.info = obj.info.title.text;


    if(isNumber(obj.code)){
      name = obj.code + '-error.json';;
    }else{
      name = obj.code + ".json";
    }
    filename = location +'/'+ name;
    var JsonString = JSON.stringify(json, null, 2);
    fs.writeFileSync(filename, JsonString, 'utf-8');
  });

}

function RenderAndWrite(template, location, object){
  var str = 'Writing template @ ' + location;
  console.log(str.green);
  var html = hogan
        .compile(template)
        .render(object);
  fs.writeFileSync(location, html, 'utf-8');
}

function ObjectToArray(json){
  var key, arr=[];
  for ( key in json ){
    arr.push({
      name : key,
      code : json[key],
      title : json[key].title
    });
  }
  return arr;
}

function isNumber(n){
  var number = parseInt(n);
  if(isNaN(number)){
    return false;
  }else{
    return true;
  }
}
