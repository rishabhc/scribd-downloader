var jsdom = require('jsdom');
var https = require('https');
var fs = require('fs');
var im = require('imagemagick');
var async = require('async');
var exec = require('child_process').exec;

var docUrl = process.argv[2];

var calls = []

var bookName = docUrl.split('/');
bookName = bookName[bookName.length-1];
console.log("Document name: " + bookName);

var dir = 'temp-'+bookName;
fs.mkdirSync(dir);

jsdom.env({
	url: docUrl,
	scripts: ["http://code.jquery.com/jquery.js"],
	done: function(err, window){
		var $ = window.$;
		console.log("Fetching image URLs of the pages")
		$('.outer_page_container').find('script').each(function(i){
			var zerofilled = ('000'+i).slice(-3);
			var txt = $(this).text();
			var r = new RegExp('https.*jsonp','i');
			var match = r.exec(txt);
			if(match && typeof match !== 'undefined') {
				
				var text = match[0].replace("jsonp","jpg").replace("pages","images");

				calls.push(function(callback){
					https.get(text, function(res,err1){
						if(err1){
							callback(err1);
						}
					    var imagedata = ''
					    res.setEncoding('binary')

					    res.on('data', function(chunk){
					        imagedata += chunk
					    })

					    res.on('end', function(){
					        fs.writeFile(dir+'/'+zerofilled+'.jpg', imagedata, 'binary', function(err){
					            if (err) {
					            	console.log(err);
					            }
					            else {
						        
						        	callback(null);
					    		}
					        })
					        
					    })
					})
				});
			}
		});
		console.log("Image URLs fetched. Downloading images.")
		async.parallel(calls,function(err,results){
			if(err)
				console.log (err);
			
				console.log("Combining images into a pdf");
				im.convert(['-quality','100','temp-'+bookName+'/*.jpg','-density','300',bookName+'.pdf'], function(err, stdout){
					if (err) throw err;
					console.log('PDF created, removing temporary image folder');
					exec('rm -r ' + 'temp-'+bookName+'/', function (err, stdout, stderr) {
  						console.log("DONE!");
					});

				});
			
		});
		
	}
});

