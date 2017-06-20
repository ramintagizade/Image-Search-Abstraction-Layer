var express = require('express');
var mongo = require('mongodb').MongoClient();
var request = require('request');
var https = require('https');
require('dotenv').config();
var app = express();
var api_key = process.env.API;
var engine_key = process.env.ENGINE;
var connection  = (process.env.URL);
function isDigitCode(n) {
   return(n >= "0".charCodeAt(0) && n <= "9".charCodeAt(0));
}
app.use(express.static('public'));
mongo.connect(connection,function(err,db){
  var collection = db.collection('imagesearch');
  app.get('/api/search?*',function (req,res){
    var query = req.query.q.split('?');
    var offset = 1;
    if(query.length>1){
      var cur = "";
      var ok = false;
      for(var i=0;i<query[1].length;i++){
        if(isDigitCode(query[1].charCodeAt(i)))
          cur+=query[1][i],ok=true;
        else if(ok) break;
      }
      offset = parseInt(cur);
      offset = 10*offset;
    }
    query = query[0];
    if(req.query){
      var json = {'query':query,'when':new Date()};
      collection.insertOne(json,function (err,data){
            console.log("Inserted into db");
      });
      var url = 'https://www.googleapis.com/customsearch/v1?key='+api_key+'&cx='+engine_key+'&searchType=image'+'&q='+query+'&start='+offset.toString();
      get(url,function (response){
          var response = JSON.parse(response);
        //  res.json(response);
          var html = "<div>{ <br>&nbsp; 'items':[";
          response['items'].forEach(function(key){
            var inhtml="<br>&nbsp; {"
            inhtml+="<br>&nbsp;&nbsp; 'link':"+"<a href='"+key['link']+"'>"+key['link']+"</a>,";
            inhtml+="<br>&nbsp;&nbsp; 'snippet':"+key['snippet']+",";
            inhtml+="<br>&nbsp;&nbsp; 'image': {";
            inhtml+="<br>&nbsp;&nbsp;&nbsp; 'contextLink':"+ "<a href='"+key['image']['contextLink']+"'>"+key['image']['contextLink']+"</a>,";
            inhtml+="<br>&nbsp;&nbsp;&nbsp; 'thumbnailLink':"+ "<a href='"+key['image']['thumbnailLink']+"'>"+key['image']['thumbnailLink']+"</a>,";
            inhtml+="<br>&nbsp;&nbsp; }";
            inhtml+="<br>&nbsp; },";
            html+=inhtml;
          });
          html+="<br>&nbsp; ] <br>} </div>"
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
      });
    }
  });
  app.get('/api/recent',function (req,res){
    var cursor = collection.find().limit(10).sort({$natural : -1});
    cursor.toArray(function(err,result){
        if(err) throw err;
        res.json(result);
    });
  });
});
function get(url,callback){
  var request = https.get(url, function(res) {
    res.setEncoding('utf8');
    console.log("requesting ...");
  });
  request.on('response', function (response) {
    var data = "";
    console.log("response on");
    response.on('data', function (chunk) {
      data += chunk;
    });
    response.on('end', function(){
      console.log("ending ...");
      callback(data);
    });
  });
}
app.timeout = 0;
app.listen(8080);
